import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { AppState, DeviceEventEmitter, Linking, Platform } from "react-native";
import { despertarConsulta, ordenCerrarApp } from "./fondo";
import { cargarAlarmaConfig, leerAlarmaConfig, patronVibracion } from "./alarmaConfig";
import { callarAlarma, cancelarNotificacionAviso, sonarAlarma } from "./overlay";
import {
  confirmarPushRecibido,
  informarHombreVivo,
  reconocerPush,
  registrarTokenPush,
  restaurarSesion,
} from "./sesion";

export const TAREA_PUSH = "docta5-push";
/** Canal v2: MAX, lockscreen, vibración. Nuevo id = Android aplica config nueva. */
const CANAL_AVISO = "aviso-alarma-v2";

const estado = { listo: false, error: "", sonido: "default" };
const oyentes = new Set();
const avisoOyentes = new Set();
let aviso = { abierto: false, id: 0, hasta: 0, tipo: "", clientId: "", programaId: "" };
const reportados = new Set();
/** Eventos ya reconocidos/cerrados: no se vuelven a abrir por sticky ni al volver a la app. */
const resueltos = new Set();
let bloqueoSinIdTipo = "";
let bloqueoSinIdHasta = 0;
let notifLocalId = null;

/** Espera "Acá estoy". Tope de seguridad 30 s. */
const AVISO_HASTA_ACK = true;
const AVISO_SEGURIDAD_MS = 30 * 1000;

function marcarResuelto(datos) {
  const tipo = String(datos?.tipo || "");
  const id = String(datos?.clientId || "").trim();
  if (id) {
    resueltos.add(`${tipo}:${id}`);
    return;
  }
  // aviso-panel no trae id: bloquear reapertura sticky un rato.
  bloqueoSinIdTipo = tipo;
  bloqueoSinIdHasta = Date.now() + 60 * 1000;
}

function yaResuelto(datos) {
  const tipo = String(datos?.tipo || "");
  const id = String(datos?.clientId || "").trim();
  if (id) return resueltos.has(`${tipo}:${id}`);
  return Boolean(tipo && tipo === bloqueoSinIdTipo && Date.now() < bloqueoSinIdHasta);
}

function publicar(parcial) {
  Object.assign(estado, parcial);
  const copia = { ...estado };
  for (const fn of oyentes) fn(copia);
}

export function leerPush() {
  return { ...estado };
}

export function escucharPush(fn) {
  oyentes.add(fn);
  fn(leerPush());
  return () => oyentes.delete(fn);
}

function emitirAviso() {
  const copia = { ...aviso };
  for (const fn of avisoOyentes) fn(copia);
}

export function escucharAviso(fn) {
  avisoOyentes.add(fn);
  fn({ ...aviso });
  return () => avisoOyentes.delete(fn);
}

function detenerAlarmaCritica() {
  // La repetición es nativa (WakeLock + MediaPlayer). JS solo ordena callar.
  callarAlarma();
}

function iniciarAlarmaCritica() {
  detenerAlarmaCritica();
  const cfg = leerAlarmaConfig();
  estado.sonido = cfg.tipo === "none" ? "none" : "default";
  // Una sola llamada: el servicio nativo mantiene sonido/vibración con pantalla apagada.
  sonarAlarma();
}

export function cerrarAviso() {
  if (!aviso.abierto) return;
  aviso = { ...aviso, abierto: false, hasta: 0 };
  detenerAlarmaCritica();
  emitirAviso();
}

async function puntoRapido() {
  try {
    const loc = await Promise.race([
      Location.getLastKnownPositionAsync(),
      new Promise((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
    const lat = Number(loc?.coords?.latitude);
    const lng = Number(loc?.coords?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const accuracy = Number(loc?.coords?.accuracy);
    return {
      lat,
      lng,
      ...(Number.isFinite(accuracy) && accuracy >= 0 ? { accuracy: Math.round(accuracy) } : {}),
    };
  } catch {
    return null;
  }
}

function cerrarPushEnBandeja() {
  const id = notifLocalId;
  notifLocalId = null;
  if (id) {
    Notifications.dismissNotificationAsync(id).catch(() => {});
    Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }
  cancelarNotificacionAviso();
  Notifications.dismissAllNotificationsAsync?.().catch(() => {});
}

/** Acá estoy = cumplido. El evento no se reabre. */
export function resolverAviso(cumplio) {
  const actual = { ...aviso };
  if (!actual.abierto) return;
  marcarResuelto(actual);
  cerrarAviso();
  cerrarPushEnBandeja();
  const clientId = String(actual.clientId || "");
  const esHombre = actual.tipo === "hombre_vivo";
  if (esHombre && clientId && reportados.has(clientId)) return;
  if (esHombre && clientId) reportados.add(clientId);
  if (!cumplio && !esHombre) return;
  restaurarSesion()
    .then(async (sesion) => {
      const tareas = [];
      if (cumplio) tareas.push(reconocerPush(sesion?.token).catch(() => {}));
      if (esHombre) {
        const punto = await puntoRapido();
        tareas.push(
          informarHombreVivo(sesion?.token, {
            clientId,
            programaId: actual.programaId,
            cumplio,
            punto,
          }),
        );
      }
      await Promise.all(tareas);
    })
    .catch((err) => console.log(`[hombre-vivo] ${err?.message || err}`));
}

function fechaDe(notification) {
  const n = Number(notification?.date);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n < 1e12 ? n * 1000 : n;
}

function tipoVisible(tipo) {
  return tipo === "aviso-panel" || tipo === "hombre_vivo";
}

function inferirTipo(tipo, titulo, cuerpo) {
  const limpio = String(tipo || "").trim();
  if (tipoVisible(limpio)) return limpio;
  const texto = `${titulo || ""} ${cuerpo || ""}`.toLowerCase();
  if (texto.includes("hombre vivo")) return "hombre_vivo";
  if (texto.includes("aviso") || texto.includes("doctacontrol") || texto.includes("acá estoy")) {
    return "aviso-panel";
  }
  return limpio;
}

function datosDe(origen) {
  const content = origen?.request?.content || origen?.notification?.request?.content;
  const trigger = origen?.request?.trigger || origen?.notification?.request?.trigger;
  let data = {
    ...(typeof origen?.data === "object" && origen.data ? origen.data : {}),
    ...(typeof content?.data === "object" && content.data ? content.data : {}),
  };
  // iOS / APNs: a veces el custom payload viene en el trigger, no en content.data.
  const payload =
    trigger?.payload ||
    trigger?.remoteMessage?.data ||
    trigger?.remoteMessage?.notification ||
    null;
  if (payload && typeof payload === "object") {
    data = { ...payload, ...data };
  }
  const crudo = data?.dataString || data?.body;
  if (typeof crudo === "string" && crudo.trim().startsWith("{")) {
    try {
      data = { ...data, ...JSON.parse(crudo) };
    } catch {
      /* sigue */
    }
  }
  const title = String(data?.title || content?.title || "DoctaControl");
  const message = String(
    data?.message || data?.body || content?.body || "Confirmá que estás en el puesto.",
  );
  const tipo = inferirTipo(data?.tipo, title, message);
  return {
    tipo,
    clientId: String(data?.id || data?.clientId || ""),
    programaId: String(data?.programaId || ""),
    pushId: String(data?.pushId || data?.apnsId || ""),
    title,
    message,
  };
}

function avisarServerRecibido(datos) {
  const token = String(sesionPush || "").trim();
  if (!token) return;
  confirmarPushRecibido(token, {
    pushId: datos.pushId,
    tipo: datos.tipo,
    foreground: AppState.currentState === "active",
  }).catch(() => {});
}

/** Nivel 1: el cartel queda hasta Acá estoy (o tope de seguridad). */
function abrirCartel(datos, _cuando) {
  if (!tipoVisible(datos.tipo)) return;
  if (yaResuelto(datos)) return;
  const hasta = AVISO_HASTA_ACK
    ? Date.now() + AVISO_SEGURIDAD_MS
    : Date.now() + 10 * 1000;
  if (aviso.abierto && aviso.clientId && aviso.clientId === datos.clientId) {
    iniciarAlarmaCritica();
    return;
  }
  if (aviso.abierto && aviso.clientId && !datos.clientId) return;
  if (
    aviso.abierto &&
    aviso.tipo === "hombre_vivo" &&
    aviso.clientId &&
    datos.clientId &&
    aviso.clientId !== datos.clientId
  ) {
    resolverAviso(false);
  }
  if (yaResuelto(datos)) return;
  aviso = {
    abierto: true,
    id: aviso.id + 1,
    hasta,
    tipo: datos.tipo,
    clientId: datos.clientId,
    programaId: datos.programaId,
  };
  iniciarAlarmaCritica();
  emitirAviso();
  mostrarNotificacionCritica(datos).catch(() => {});
}

async function mostrarNotificacionCritica(datos) {
  if (Platform.OS !== "android") return;
  if (yaResuelto(datos)) return;
  if (notifLocalId) {
    await Notifications.dismissNotificationAsync(notifLocalId).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(notifLocalId).catch(() => {});
    notifLocalId = null;
  }
  notifLocalId = await Notifications.scheduleNotificationAsync({
    content: {
      title: datos.title || "DoctaControl",
      body: datos.message || "ACÁ ESTOY",
      sound: leerAlarmaConfig().tipo === "none" ? false : "default",
      priority: Notifications.AndroidNotificationPriority.MAX,
      sticky: true,
      autoDismiss: false,
      data: {
        tipo: datos.tipo,
        id: datos.clientId,
        programaId: datos.programaId,
        channelId: CANAL_AVISO,
      },
      ...(Platform.OS === "android"
        ? {
            channelId: CANAL_AVISO,
            vibrate: patronVibracion(leerAlarmaConfig().vibracion) || [0],
          }
        : {}),
    },
    trigger: null,
  });
}

/** El push visible abre el cartel. Ya no caduca a los 10 s de llegada. */
function abrirAviso(notification) {
  const datos = datosDe(notification);
  if (!tipoVisible(datos.tipo)) return;
  abrirCartel(datos, fechaDe(notification) || Date.now());
}

function datosDeUrl(url) {
  const texto = String(url || "");
  if (!texto.includes("aca-estoy")) return null;
  const query = texto.split("?")[1] || "";
  const params = {};
  for (const parte of query.split("&")) {
    if (!parte) continue;
    const [clave, valor] = parte.split("=");
    params[decodeURIComponent(clave)] = decodeURIComponent(valor || "");
  }
  return {
    tipo: params.tipo || "hombre_vivo",
    clientId: params.id || "",
    programaId: params.programaId || "",
    title: "Hombre vivo",
    message: "Confirmá que estás en el puesto.",
  };
}

function abrirPorEnlace(url) {
  const datos = datosDeUrl(url);
  if (!datos || !tipoVisible(datos.tipo)) return;
  abrirCartel(datos, Date.now());
}

Linking.getInitialURL().then(abrirPorEnlace).catch(() => {});
Linking.addEventListener("url", (evento) => abrirPorEnlace(evento?.url));
DeviceEventEmitter.addListener("avisoEnPantalla", (evento) => {
  const datos = datosDe(evento);
  if (!tipoVisible(datos.tipo)) return;
  abrirCartel(datos, Date.now());
});

export async function revisarAvisoAlVolver() {
  const ultima = await Notifications.getLastNotificationResponseAsync().catch(() => null);
  if (ultima?.notification) {
    const datos = datosDe(ultima.notification);
    if (tipoVisible(datos.tipo) && !yaResuelto(datos)) abrirAviso(ultima.notification);
  }
  const presentadas = await Notifications.getPresentedNotificationsAsync().catch(() => []);
  for (const n of presentadas || []) {
    const datos = datosDe(n);
    if (!tipoVisible(datos.tipo) || yaResuelto(datos)) continue;
    abrirCartel(datos, Date.now());
    break;
  }
}

function tipoDe(data) {
  const crudo = data?.data?.dataString || data?.dataString;
  if (typeof crudo === "string" && crudo.trim()) {
    try {
      return String(JSON.parse(crudo)?.tipo || "");
    } catch {
      /* sigue con el objeto */
    }
  }
  const avisoData = data?.data || data?.notification?.data || data || {};
  return String(avisoData?.tipo || "");
}

TaskManager.defineTask(TAREA_PUSH, async ({ data }) => {
  const tipo = tipoDe(data);
  if (tipo === "cerrar-app") {
    ordenCerrarApp();
    return;
  }
  if (tipo === "hombre_vivo" || tipo === "aviso-panel") {
    DeviceEventEmitter.emit("avisoEnPantalla", data?.data || data);
    return;
  }
  if (tipo !== "keepalive") return;
  await despertarConsulta();
});

function asegurarTarea() {
  return Notifications.registerTaskAsync(TAREA_PUSH).catch((err) => {
    console.log(`[push] tarea ${err?.message || err}`);
  });
}

asegurarTarea();

Notifications.setNotificationHandler({
  handleNotification: async (avisoNotif) => {
    const datos = datosDe(avisoNotif);
    const visible = tipoVisible(datos.tipo);
    // iPhone en primer plano: abrir Acá estoy al llegar el push.
    if (visible) {
      setTimeout(() => abrirCartel(datos, Date.now()), 0);
    }
    return {
      // Nivel 1: visible en pantalla bloqueada / bandeja.
      shouldShowBanner: visible,
      shouldShowList: visible,
      shouldPlaySound: visible && leerAlarmaConfig().tipo !== "none",
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.MAX,
    };
  },
});

/** Compat: tipo none | default según config Nivel 3. */
export async function sonidoAlarmaActual() {
  const cfg = await cargarAlarmaConfig();
  const valor = cfg.tipo === "none" ? "none" : "default";
  estado.sonido = valor;
  return valor;
}

/** Compat: "default" | "none". */
export async function guardarSonidoAlarma(valor) {
  const { guardarAlarmaConfig } = await import("./alarmaConfig");
  const cfg = await guardarAlarmaConfig({ tipo: valor === "none" ? "none" : "alarm" });
  const limpio = cfg.tipo === "none" ? "none" : "default";
  estado.sonido = limpio;
  publicar({ sonido: limpio });
  await prepararCanal();
  return limpio;
}

async function prepararCanal() {
  if (Platform.OS !== "android") return;
  const cfg = leerAlarmaConfig();
  const patron = patronVibracion(cfg.vibracion) || [0, 700, 180, 700, 180, 1100];

  await Notifications.setNotificationChannelAsync(CANAL_AVISO, {
    name: "Avisos críticos DoctaControl",
    description: "Alertas de Hombre Vivo y avisos del panel",
    importance: Notifications.AndroidImportance.MAX,
    enableVibrate: cfg.vibracion !== "off",
    vibrationPattern: patron,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
    // No colocar sound: "default"
  }).catch(() => {});
}

let sesionPush = "";
let tokenGuardado = "";

function textoDe(err) {
  const msg = String(err?.message || err || "").trim();
  if (/installations service is unavailable|FIS_|API key/i.test(msg)) {
    return "Firebase rechazó el token de este celular.";
  }
  return msg || "No se pudo registrar el push.";
}

/** El logout borra el token en el servidor. Hay que volver a mandarlo al entrar. */
export function olvidarPush() {
  sesionPush = "";
  tokenGuardado = "";
  detenerAlarmaCritica();
  publicar({ listo: false, error: "" });
}

/** Pide el token FCM y lo guarda en el mismo canal que Hombre vivo. */
export async function activarPush(tokenSesion) {
  const sesion = String(tokenSesion || "").trim();
  if (!sesion) return false;
  const sesionNueva = sesionPush !== sesion;
  sesionPush = sesion;
  await asegurarTarea();
  await cargarAlarmaConfig().catch(() => {});
  await prepararCanal();
  const actual = await Notifications.getPermissionsAsync();
  if (actual.status !== "granted") {
    await Notifications.requestPermissionsAsync().catch(() => {});
  }
  let fcm = "";
  try {
    const device = await Notifications.getDevicePushTokenAsync();
    fcm = String(device?.data || "").trim();
  } catch (err) {
    publicar({ listo: false, error: textoDe(err) });
    console.log(`[push] ${textoDe(err)}`);
    return false;
  }
  if (!fcm) {
    publicar({ listo: false, error: "El celular no entregó el token." });
    return false;
  }
  if (!sesionNueva && fcm === tokenGuardado) {
    publicar({ listo: true, error: "" });
    return true;
  }
  try {
    await registrarTokenPush(sesion, fcm);
  } catch (err) {
    publicar({ listo: false, error: textoDe(err) });
    console.log(`[push] ${textoDe(err)}`);
    return false;
  }
  tokenGuardado = fcm;
  publicar({ listo: true, error: "" });
  console.log("[push] token registrado");
  return true;
}

Notifications.addNotificationReceivedListener((avisoRecibido) => {
  const datos = datosDe(avisoRecibido);
  console.log(`[push] recibido foreground/background · tipo=${datos.tipo} · pushId=${datos.pushId || "-"}`);
  avisarServerRecibido(datos);
  if (datos.tipo === "cerrar-app") {
    ordenCerrarApp();
    return;
  }
  abrirAviso(avisoRecibido);
});

Notifications.addNotificationResponseReceivedListener((respuesta) => {
  const datos = datosDe(respuesta?.notification);
  console.log(`[push] tocado · tipo=${datos.tipo} · pushId=${datos.pushId || "-"}`);
  avisarServerRecibido(datos);
  if (datos.tipo === "cerrar-app") {
    ordenCerrarApp();
    return;
  }
  abrirAviso(respuesta?.notification);
});

Notifications.addPushTokenListener((device) => {
  const fcm = String(device?.data || "").trim();
  if (!sesionPush || !fcm || fcm === tokenGuardado) return;
  registrarTokenPush(sesionPush, fcm)
    .then(() => {
      tokenGuardado = fcm;
      publicar({ listo: true, error: "" });
    })
    .catch((err) => publicar({ listo: false, error: textoDe(err) }));
});
