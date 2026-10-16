import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const API_PUBLICA = "https://doctacontrol-e7803a4382c9.herokuapp.com";
const API_SIMULADOR = "http://10.0.2.2:4000";

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

function apiDe() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  return esSimulador() ? API_SIMULADOR : API_PUBLICA;
}
const CLIENT = "5-doctacontrol vigicontrol-app";
const CLAVE_SESION = "@docta5_sesion";
const CLAVE_DEVICE = "@docta5_device";

function mensajeDe(data, respaldo) {
  const raw = data?.message;
  if (Array.isArray(raw) && raw[0]) return String(raw[0]);
  if (typeof raw === "string" && raw.trim()) return raw;
  return respaldo;
}

function nuevoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export async function idDeEsteCelular() {
  const guardado = await AsyncStorage.getItem(CLAVE_DEVICE).catch(() => "");
  if (guardado) return guardado;
  const id = `5-doctacontrol:${nuevoId()}`;
  await AsyncStorage.setItem(CLAVE_DEVICE, id).catch(() => {});
  return id;
}

export async function restaurarSesion() {
  try {
    const raw = await AsyncStorage.getItem(CLAVE_SESION);
    const data = raw ? JSON.parse(raw) : null;
    return data?.token ? data : null;
  } catch {
    return null;
  }
}

export async function olvidarSesion() {
  await AsyncStorage.removeItem(CLAVE_SESION).catch(() => {});
}

async function pedir(path, { method, body, token, timeoutMs = 20000 }) {
  const deviceId = await idDeEsteCelular();
  const control = new AbortController();
  const tope = setTimeout(() => control.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${apiDe()}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Auth-Mode": "bearer",
        "X-Client-Info": CLIENT,
        "X-Device-Id": deviceId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: control.signal,
    });
  } catch (error) {
    const fallo = new Error(
      error?.name === "AbortError" ? "El servidor no contestó." : "No se pudo conectar con el servidor.",
    );
    fallo.status = 0;
    throw fallo;
  } finally {
    clearTimeout(tope);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(mensajeDe(data, "No se pudo completar."));
    error.status = res.status;
    throw error;
  }
  if (data && typeof data === "object" && !Array.isArray(data)) data.http = res.status;
  return data;
}

/** Login contra el server. Entra solo un usuario con rol vigilador. */
export async function ingresarVigilador(usuario, clave) {
  const login = String(usuario || "").trim();
  const password = String(clave || "");
  const deviceId = await idDeEsteCelular();
  const data = await pedir("/api/login", {
    method: "POST",
    body: {
      login,
      username: login,
      password,
      app: "vigicontrol",
      deviceId,
      source: "5-doctacontrol",
      platform: Platform.OS,
    },
  });
  if (String(data?.role || "").toLowerCase() !== "vigilador") {
    if (data?.token) {
      await pedir("/api/logout", { method: "POST", token: data.token }).catch(() => {});
    }
    throw new Error("Solo puede ingresar un vigilador.");
  }
  if (!data?.token) {
    throw new Error("El servidor no devolvió la sesión.");
  }
  await AsyncStorage.setItem(CLAVE_SESION, JSON.stringify(data));
  return data;
}

export async function verificarSesion(token) {
  return pedir("/api/verify", { method: "GET", token });
}

export async function mantenerSesion(token) {
  const deviceId = await idDeEsteCelular();
  return pedir("/api/geo/keepalive", {
    method: "POST",
    token,
    body: { deviceId, platform: Platform.OS },
  });
}

/** El celular pregunta si el servidor tiene una solicitud. No manda la posición. */
export async function consultarSolicitud(token) {
  const data = await mantenerSesion(token);
  if (typeof data?.pendiente !== "boolean") {
    const error = new Error("El servidor no informa solicitudes.");
    error.status = Number(data?.http) || 200;
    throw error;
  }
  return data;
}

/** Confirma la solicitud del servidor con la posición. */
export async function responderSolicitud(token, punto) {
  return responderConGeo(token, punto);
}

/** Respuesta al pedido del server: la posición para el mapa. */
export async function responderConGeo(token, punto) {
  const lat = Number(punto?.lat);
  const lng = Number(punto?.lng);
  if (!token || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const deviceId = await idDeEsteCelular();
  const accuracy = Number(punto?.accuracy);
  return pedir("/api/geo/ping", {
    method: "POST",
    token,
    body: {
      deviceId,
      platform: Platform.OS,
      source: "5-doctacontrol",
      lat,
      lng,
      ...(Number.isFinite(accuracy) && accuracy >= 0 ? { accuracy: Math.round(accuracy) } : {}),
    },
  });
}

export async function salirVigilador(token) {
  if (token) {
    await pedir("/api/logout", { method: "POST", token }).catch(() => {});
  }
  await olvidarSesion();
}

export function nombreDe(usuario) {
  const nombre = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ").trim();
  return nombre || usuario?.username || "Vigilador";
}
