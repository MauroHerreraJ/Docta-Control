import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { DeviceEventEmitter, Linking, Platform } from "react-native";
import { despertarConsulta, ordenCerrarApp } from "./fondo";
import { callarAlarma, sonarAlarma } from "./overlay";
import { informarHombreVivo, reconocerPush, registrarTokenPush, restaurarSesion } from "./sesion";

export const TAREA_PUSH = "docta5-push";
const CANAL_AVISO = "aviso-alarma";

const estado = { listo: false, error: "" };
const oyentes = new Set();
const avisoOyentes = new Set();
let aviso = { abierto: false, id: 0, hasta: 0, tipo: "", clientId: "", programaId: "" };
const reportados = new Set();
const AVISO_MS = 10 * 1000;

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

export function cerrarAviso() {
  if (!aviso.abierto) return;
  aviso = { ...aviso, abierto: false, hasta: 0 };
  callarAlarma();
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
  Notifications.dismissAllNotificationsAsync?.().catch(() => {});
}

/** Acá estoy queda cumplido y el panel cierra el aviso. Si el cartel se cierra solo, queda no cumplido. */
export function resolverAviso(cumplio) {
  const actual = { ...aviso };
  if (!actual.abierto) return;
  cerrarAviso();
  if (cumplio) cerrarPushEnBandeja();
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

function datosDe(origen) {
  const content = origen?.request?.content || origen?.notification?.request?.content;
  const data = content?.data || origen?.data || origen || {};
  return {
    tipo: String(data?.tipo || ""),
    clientId: String(data?.id || data?.clientId || ""),
    programaId: String(data?.programaId || ""),
  };
}

/** El push visible abre el cartel. Se cierra a los 10 s de haber llegado. */
function abrirAviso(notification) {
  const datos = datosDe(notification);
  if (!tipoVisible(datos.tipo)) return;
  const cuando = fechaDe(notification) || Date.now();
  abrirCartel(datos, cuando);
}

function abrirCartel(datos, cuando) {
  const hasta = cuando + AVISO_MS;
  if (Date.now() >= hasta) return;
  if (aviso.abierto && aviso.clientId && aviso.clientId === datos.clientId) return;
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
  aviso = {
    abierto: true,
    id: aviso.id + 1,
    hasta,
    tipo: datos.tipo,
    clientId: datos.clientId,
    programaId: datos.programaId,
  };
  sonarAlarma();
  emitirAviso();
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
  if (ultima?.notification) abrirAviso(ultima.notification);
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
  const aviso = data?.data || data?.notification?.data || data || {};
  return String(aviso?.tipo || "");
}

TaskManager.defineTask(TAREA_PUSH, async ({ data }) => {
  if (tipoDe(data) === "cerrar-app") {
    ordenCerrarApp();
    return;
  }
  if (tipoDe(data) !== "keepalive") return;
  await despertarConsulta();
});

function asegurarTarea() {
  return Notifications.registerTaskAsync(TAREA_PUSH).catch((err) => {
    console.log(`[push] tarea ${err?.message || err}`);
  });
}

asegurarTarea();

Notifications.setNotificationHandler({
  handleNotification: async (aviso) => {
    const tipo = String(aviso?.request?.content?.data?.tipo || "");
    const visible = tipo === "hombre_vivo" || tipo === "aviso-panel";
    return {
      shouldShowAlert: false,
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: visible,
      shouldSetBadge: false,
    };
  },
});

async function prepararCanal() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CANAL_AVISO, {
    name: "Avisos del panel",
    importance: Notifications.AndroidImportance.MAX,
    enableVibrate: true,
    vibrationPattern: [0, 700, 180, 700, 180, 1100],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      flags: {
        enforceAudibility: true,
        requestHardwareAudioVideoSynchronization: false,
      },
    },
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
  publicar({ listo: false, error: "" });
}

/** Pide el token FCM y lo guarda en el mismo canal que Hombre vivo. */
export async function activarPush(tokenSesion) {
  const sesion = String(tokenSesion || "").trim();
  if (!sesion) return false;
  const sesionNueva = sesionPush !== sesion;
  sesionPush = sesion;
  await asegurarTarea();
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
  if (datosDe(avisoRecibido).tipo === "cerrar-app") {
    ordenCerrarApp();
    return;
  }
  abrirAviso(avisoRecibido);
});

Notifications.addNotificationResponseReceivedListener((respuesta) => {
  if (datosDe(respuesta?.notification).tipo === "cerrar-app") {
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
