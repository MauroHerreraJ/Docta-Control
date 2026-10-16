import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { PermissionsAndroid, Platform } from "react-native";
import { consultarSolicitud, responderSolicitud, restaurarSesion } from "./sesion";

export const TAREA_FONDO = "docta5-servicio";
const TAREA_VIEJA = "docta5-keepalive";

/** Solo el emulador. Un celular real usa el GPS. */
const GEO_SIMULADOR = {
  lat: -31.34894804265244,
  lng: -64.22980990088818,
  accuracy: 10,
};

const LATIDO_DEFECTO_SEG = 60;
const GEO_DEFECTO_MIN = 5;
const TOPE_MS = 20 * 1000;

let ocupado = false;
let siguiente = null;
let latidoSeg = LATIDO_DEFECTO_SEG;
let geoMin = GEO_DEFECTO_MIN;
let ultimoGeoOk = 0;
let ultimoLatidoOk = 0;
let tokenEnviado = "";
let intervaloAplicado = 0;
let consultaTimer = null;

const estado = {
  servicio: "detenido",
  fondo: "sin pedir",
  ultimoEnvioAt: null,
  ultimoTipo: "",
  ultimoHttp: null,
  ultimoError: "",
  nota: "",
  pendiente: false,
  informa: true,
  latidoSeg: LATIDO_DEFECTO_SEG,
  geoMin: GEO_DEFECTO_MIN,
};
const oyentes = new Set();

function publicar(parcial) {
  Object.assign(estado, parcial);
  const copia = { ...estado };
  for (const fn of oyentes) fn(copia);
}

export function leerDiagnostico() {
  return { ...estado };
}

export function suscribirDiagnostico(fn) {
  oyentes.add(fn);
  fn(leerDiagnostico());
  return () => oyentes.delete(fn);
}

function esSimulador() {
  const c = Platform.constants || {};
  const texto = [c.Fingerprint, c.Model, c.Brand, c.Manufacturer]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    texto.includes("sdk_gphone") ||
    texto.includes("google_sdk") ||
    texto.includes("emulator") ||
    texto.includes("generic") ||
    texto.includes("android sdk built for") ||
    texto.includes("goldfish") ||
    texto.includes("ranchu") ||
    texto.includes("simulator")
  );
}

function puntoFijoDeSimulador() {
  return esSimulador() ? { ...GEO_SIMULADOR } : null;
}

function puntoDe(loc) {
  const lat = Number(loc?.coords?.latitude);
  const lng = Number(loc?.coords?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const accuracy = Number(loc?.coords?.accuracy);
  return {
    lat,
    lng,
    ...(Number.isFinite(accuracy) && accuracy >= 0 ? { accuracy: Math.round(accuracy) } : {}),
  };
}

function aplicarIntervalos(data) {
  const seg = Math.round(Number(data?.keepAliveSec));
  const min = Math.round(Number(data?.geoIntervalMin));
  if (Number.isFinite(seg) && seg >= 15 && seg <= 180) latidoSeg = seg;
  if (Number.isFinite(min) && min >= 1 && min <= 240) geoMin = min;
  publicar({ latidoSeg, geoMin });
  if (estado.servicio === "activo" && intervaloAplicado && intervaloAplicado !== latidoSeg) {
    arrancarServicio().catch(() => {});
  }
}

function conTope(promesa) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error("El servidor no contestó.");
      error.status = 0;
      reject(error);
    }, TOPE_MS);
    promesa.then(
      (valor) => {
        clearTimeout(timer);
        resolve(valor);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function correr(trabajo) {
  try {
    await conTope(trabajo.tarea());
    return true;
  } catch (error) {
    const status = Number(error?.status);
    const http = Number.isFinite(status) ? status : 0;
    const mensaje = String(error?.message || "Error de red");
    publicar({ ultimoHttp: http, ultimoError: mensaje });
    console.log(`[docta] ${trabajo.tipo} HTTP ${http} ${mensaje}`);
    return false;
  }
}

function encolar(trabajo) {
  return new Promise((resolve) => {
    const item = { ...trabajo, resolve };
    if (ocupado) {
      siguiente = item;
      return;
    }
    ocupado = true;
    const seguir = (actual) => {
      correr(actual).finally(() => {
        actual.resolve();
        const pend = siguiente;
        siguiente = null;
        if (pend) {
          seguir(pend);
          return;
        }
        ocupado = false;
      });
    };
    seguir(item);
  });
}

function latidoVencido() {
  if (!ultimoLatidoOk) return true;
  return Date.now() - ultimoLatidoOk >= Math.max(5, latidoSeg - 2) * 1000;
}

function cortarConsulta() {
  if (!consultaTimer) return;
  clearTimeout(consultaTimer);
  consultaTimer = null;
}

/** Sigue preguntando aunque el GPS no avise. Una sola espera, sin amontonar pedidos. */
function programarConsulta(token) {
  cortarConsulta();
  const espera = Math.max(5, latidoSeg) * 1000;
  consultaTimer = setTimeout(() => {
    consultaTimer = null;
    if (tokenEnviado !== token) return;
    encolar({
      tipo: "consulta",
      tarea: () => atenderServidor(token),
    }).finally(() => {
      if (tokenEnviado === token) programarConsulta(token);
    });
  }, espera);
}

/** Consulta al servidor. Si hay una solicitud, la confirma con la posición. */
async function atenderServidor(token) {
  const data = await consultarSolicitud(token);
  aplicarIntervalos(data);
  const http = Number(data?.http) || 200;
  const informa = typeof data?.pendiente === "boolean";
  const hayPedido = informa ? Boolean(data.pendiente) : true;
  publicar({
    ultimoEnvioAt: new Date().toISOString(),
    ultimoTipo: "consulta",
    ultimoHttp: http,
    ultimoError: "",
    pendiente: informa ? Boolean(data.pendiente) : false,
    informa,
  });
  console.log(`[docta] consulta HTTP ${http} pendiente=${informa ? Boolean(data.pendiente) : "sin-campo"}`);
  if (!hayPedido) {
    ultimoLatidoOk = Date.now();
    return;
  }
  const punto = await obtenerPunto();
  if (!punto) {
    publicar({ nota: informa ? "Hay una solicitud y no hay posición." : "No hay posición para enviar." });
    return;
  }
  const respuesta = await responderSolicitud(token, punto);
  ultimoLatidoOk = Date.now();
  ultimoGeoOk = Date.now();
  publicar({
    ultimoEnvioAt: new Date().toISOString(),
    ultimoTipo: "respuesta",
    ultimoHttp: Number(respuesta?.http) || 201,
    ultimoError: "",
    nota: "",
    pendiente: false,
  });
  console.log(`[docta] respuesta HTTP ${Number(respuesta?.http) || 201}`);
}

async function obtenerPunto() {
  const fijo = puntoFijoDeSimulador();
  if (fijo) return fijo;
  try {
    const conocido = puntoDe(await Location.getLastKnownPositionAsync());
    if (conocido) return conocido;
  } catch {
    /* sigue con una lectura nueva */
  }
  try {
    return puntoDe(
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: false,
      }),
    );
  } catch {
    return null;
  }
}

/** La despierta el servicio de Android. La consulta no usa el punto GPS de este aviso. */
TaskManager.defineTask(TAREA_FONDO, async () => {
  const sesion = await restaurarSesion();
  const token = sesion?.token;
  if (!token || !latidoVencido()) return;
  await encolar({
    tipo: "consulta",
    tarea: () => atenderServidor(token),
  });
});

async function pedirAviso() {
  if (Platform.OS !== "android" || Number(Platform.Version) < 33) return;
  const tiene = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  ).catch(() => false);
  if (tiene) return;
  await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(() => {});
}

/** Solo lee el permiso. Pedirlo abre Ajustes y manda la app atrás. */
async function leerUbicacionEnFondo() {
  const actual = await Location.getBackgroundPermissionsAsync().catch(() => null);
  if (actual?.status === "granted") {
    publicar({ fondo: "concedido" });
    return;
  }
  if (actual && actual.canAskAgain === false) {
    publicar({ fondo: "denegado" });
    return;
  }
  publicar({ fondo: "sin pedir" });
}

/** Aviso fijo de Android. Sigue con la pantalla apagada y si cierran la app. */
export async function arrancarServicio() {
  const sesion = await restaurarSesion();
  if (!sesion?.token) return false;

  await pedirAviso();
  const yaFrente = await Location.getForegroundPermissionsAsync().catch(() => null);
  if (yaFrente?.status !== "granted") {
    const frente = await Location.requestForegroundPermissionsAsync();
    if (frente.status !== "granted") {
      publicar({ servicio: "sin permiso" });
      return false;
    }
  }

  await Location.stopLocationUpdatesAsync(TAREA_VIEJA).catch(() => {});
  const ya = await Location.hasStartedLocationUpdatesAsync(TAREA_FONDO).catch(() => false);
  if (!ya || intervaloAplicado !== latidoSeg) {
    if (ya) await Location.stopLocationUpdatesAsync(TAREA_FONDO).catch(() => {});
    intervaloAplicado = latidoSeg;
    await Location.startLocationUpdatesAsync(TAREA_FONDO, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: latidoSeg * 1000,
      distanceInterval: 0,
      deferredUpdatesInterval: 0,
      deferredUpdatesDistance: 0,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Docta en servicio",
        notificationBody: "Sigue conectada con la pantalla apagada. No cierres este aviso.",
        notificationColor: "#0F76C4",
        killServiceOnDestroy: false,
      },
    });
    await new Promise((resolver) => setTimeout(resolver, 1500));
  }
  publicar({ servicio: "activo" });
  await leerUbicacionEnFondo();
  return true;
}

export async function pararServicio() {
  const activa = await Location.hasStartedLocationUpdatesAsync(TAREA_FONDO).catch(() => false);
  if (!activa) return;
  await Location.stopLocationUpdatesAsync(TAREA_FONDO).catch(() => {});
}

/** Arranca el aviso al entrar. Lo detiene solo el logout. La consulta sigue aunque no haya GPS. */
export async function iniciarConexion(token) {
  if (!token) return false;
  const primera = tokenEnviado !== token;
  tokenEnviado = token;
  if (primera || latidoVencido()) {
    cortarConsulta();
    await encolar({
      tipo: "consulta",
      tarea: () => atenderServidor(token),
    });
    programarConsulta(token);
  } else if (!consultaTimer) {
    programarConsulta(token);
  }
  return arrancarServicio().catch(() => false);
}

/** Logout: para el aviso y deja de enviar. */
export async function pararConexion() {
  cortarConsulta();
  tokenEnviado = "";
  ultimoLatidoOk = 0;
  ultimoGeoOk = 0;
  intervaloAplicado = 0;
  siguiente = null;
  await pararServicio();
  publicar({ servicio: "detenido" });
}
