import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo-modules-core";
import * as Location from "expo-location";

function reactNative() {
  try {
    return require("react-native");
  } catch {
    return null;
  }
}

function leer(objeto, clave) {
  try {
    return objeto?.[clave] ?? null;
  } catch {
    return null;
  }
}
const CARGA = 2;
const LLENA = 3;
const CACHE_MS = 15 * 1000;

const MARCAS = {
  samsung: "Samsung",
  motorola: "Motorola",
  xiaomi: "Xiaomi",
  google: "Google",
  huawei: "Huawei",
  honor: "Honor",
  oppo: "Oppo",
  vivo: "Vivo",
  realme: "Realme",
  nokia: "Nokia",
  sony: "Sony",
  lg: "LG",
  oneplus: "OnePlus",
  tcl: "TCL",
};

let cache = null;
let cacheAt = 0;

function marca(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const conocida = MARCAS[raw.toLowerCase()];
  if (conocida) return conocida;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function permiso(frente, fondo) {
  if (fondo?.granted) return "always";
  if (frente?.granted) return "while-using";
  const status = String(frente?.status || fondo?.status || "").toLowerCase();
  if (status === "denied") return "denied";
  return "none";
}

function cobertura(state) {
  if (!state) return "";
  const type = String(state.type || "").trim().toLowerCase();
  if (!type || type === "none" || state.isConnected === false) return "none";
  if (type === "cellular" || type === "cell") return "cellular";
  if (type === "wifi") return "wifi";
  return type.slice(0, 24);
}

/** Lo que el panel muestra de este celular. No falla si falta un módulo nativo. */
export async function fichaDeEsteCelular() {
  if (cache && Date.now() - cacheAt < CACHE_MS) return cache;
  try {
  const rn = reactNative();
  const Platform = leer(rn, "Platform");
  const AppState = leer(rn, "AppState");
  const ExpoBattery = requireOptionalNativeModule("ExpoBattery");
  const ExpoNetwork = requireOptionalNativeModule("ExpoNetwork");
  const constants = leer(Platform, "constants") || {};
  const os = leer(Platform, "OS");
  const fabricante = marca(constants.Manufacturer || constants.manufacturer || constants.Brand || constants.brand);
  const modelo = String(constants.Model || constants.model || "").trim();
  const release = String(constants.Release || constants.osVersion || leer(Platform, "Version") || "").trim();
  const osName = os === "ios" ? "iOS" : "Android";
  const cfg = Constants.expoConfig || Constants.manifest2?.extra?.expoClient || {};
  const appVersion = String(cfg.version || Constants.nativeAppVersion || "").trim();
  const buildVersion = String(Constants.nativeBuildVersion || "").trim();

  const [nivel, estadoBateria, gpsOn, frente, fondo, red] = await Promise.all([
    ExpoBattery?.getBatteryLevelAsync?.().catch(() => null) ?? Promise.resolve(null),
    ExpoBattery?.getBatteryStateAsync?.().catch(() => null) ?? Promise.resolve(null),
    Location.hasServicesEnabledAsync().catch(() => null),
    Location.getForegroundPermissionsAsync().catch(() => null),
    Location.getBackgroundPermissionsAsync().catch(() => null),
    ExpoNetwork?.getNetworkStateAsync?.().catch(() => null) ?? Promise.resolve(null),
  ]);

  const pct = Number(nivel);
  const battery = Number.isFinite(pct) && pct >= 0 ? Math.round(Math.max(0, Math.min(1, pct)) * 100) : null;
  const appState = String(leer(AppState, "currentState") || "").toLowerCase();
  const ficha = {
    platform: os || "",
    brand: fabricante.toLowerCase(),
    manufacturer: fabricante,
    modelName: modelo,
    osName,
    osVersion: release,
    appVersion,
    buildVersion,
    battery,
    charging: battery == null ? null : estadoBateria === CARGA || estadoBateria === LLENA,
    gpsState: gpsOn === true ? "activo" : gpsOn === false ? "apagado" : "",
    network: cobertura(red),
    appState: appState && appState !== "unknown" ? appState : "",
    locationPermission: permiso(frente, fondo),
  };
  cache = ficha;
  cacheAt = Date.now();
  return ficha;
  } catch {
    return {};
  }
}

/** Campos que el servidor guarda en el dispositivo. Omite lo que no se pudo leer. */
export async function cuerpoDeEquipo(extra = {}) {
  const ficha = await fichaDeEsteCelular().catch(() => ({}));
  const body = { ...extra };
  for (const key of [
    "platform",
    "brand",
    "manufacturer",
    "modelName",
    "osName",
    "osVersion",
    "appVersion",
    "buildVersion",
    "gpsState",
    "network",
    "appState",
    "locationPermission",
  ]) {
    if (ficha?.[key]) body[key] = ficha[key];
  }
  if (ficha?.battery != null) {
    body.battery = ficha.battery;
    body.charging = Boolean(ficha.charging);
  }
  return body;
}
