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

let sesionEnMemoria = null;

export function sesionGuardadaAhora() {
  return sesionEnMemoria;
}

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

function codigoDe(valor) {
  return String(valor || "").replace(/^5-doctacontrol:/, "").trim();
}

export async function idDeEsteCelular() {
  const guardado = codigoDe(await AsyncStorage.getItem(CLAVE_DEVICE).catch(() => ""));
  if (guardado) {
    await AsyncStorage.setItem(CLAVE_DEVICE, guardado).catch(() => {});
    return guardado;
  }
  const id = nuevoId();
  await AsyncStorage.setItem(CLAVE_DEVICE, id).catch(() => {});
  return id;
}

export async function restaurarSesion() {
  try {
    const raw = await AsyncStorage.getItem(CLAVE_SESION);
    const data = raw ? JSON.parse(raw) : null;
    sesionEnMemoria = data?.token ? data : null;
    return sesionEnMemoria;
  } catch {
    sesionEnMemoria = null;
    return null;
  }
}

export async function olvidarSesion() {
  sesionEnMemoria = null;
  await AsyncStorage.removeItem(CLAVE_SESION).catch(() => {});
}

async function pedir(path, { method, body, token, timeoutMs = 20000, signal }) {
  const deviceId = await idDeEsteCelular();
  const control = new AbortController();
  let vencio = false;
  const alCorte = () => control.abort();
  if (signal?.aborted) alCorte();
  else signal?.addEventListener("abort", alCorte);
  const tope = setTimeout(() => {
    vencio = true;
    control.abort();
  }, timeoutMs);
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
    const cancelada = Boolean(signal?.aborted) && !vencio;
    const fallo = new Error(
      cancelada
        ? "Consulta cancelada."
        : error?.name === "AbortError"
          ? "El servidor no contestó."
          : "No se pudo conectar con el servidor.",
    );
    fallo.status = 0;
    fallo.cancelada = cancelada;
    throw fallo;
  } finally {
    clearTimeout(tope);
    signal?.removeEventListener("abort", alCorte);
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

async function pedirForm(path, form, token) {
  const deviceId = await idDeEsteCelular();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${apiDe()}${path}`);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("X-Auth-Mode", "bearer");
    xhr.setRequestHeader("X-Client-Info", CLIENT);
    xhr.setRequestHeader("X-Device-Id", deviceId);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.timeout = 60000;
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText || "{}");
      } catch {
        data = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
        return;
      }
      const error = new Error(mensajeDe(data, "No se pudo completar."));
      error.status = xhr.status;
      reject(error);
    };
    xhr.onerror = () => {
      const error = new Error("No se pudo conectar con el servidor.");
      error.status = 0;
      reject(error);
    };
    xhr.ontimeout = () => {
      const error = new Error("La subida tardó demasiado. Probá de nuevo.");
      error.status = 0;
      reject(error);
    };
    xhr.send(form);
  });
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
  sesionEnMemoria = data;
  await AsyncStorage.setItem(CLAVE_SESION, JSON.stringify(data));
  return data;
}

export async function verificarSesion(token) {
  return pedir("/api/verify", { method: "GET", token });
}

export async function cambiarClave(token, actual, nueva) {
  return pedir("/api/profile/password", {
    method: "PUT",
    token,
    body: { currentPassword: actual, newPassword: nueva },
  });
}

/** Perfil del vigilador logueado, incluida la foto del servidor. */
export async function perfilDelVigilador(token) {
  if (!token) return null;
  return pedir("/api/vigiladores/me", { method: "GET", token });
}

export async function mantenerSesion(token, signal) {
  const deviceId = await idDeEsteCelular();
  return pedir("/api/geo/keepalive", {
    method: "POST",
    token,
    signal,
    body: { deviceId, platform: Platform.OS },
  });
}

/** Guarda el token FCM para que el servidor pueda despertar este celular. */
export async function registrarTokenPush(tokenSesion, fcmToken) {
  const limpio = String(fcmToken || "").trim();
  if (!tokenSesion || !limpio) return null;
  return pedir("/api/push/token", {
    method: "POST",
    token: tokenSesion,
    body: { token: limpio, deviceId: await idDeEsteCelular() },
  });
}

/** El celular pregunta si el servidor tiene una solicitud. No manda la posición. */
export async function consultarSolicitud(token, signal) {
  return mantenerSesion(token, signal);
}

/** Confirma la solicitud del servidor con la posición. */
export async function responderSolicitud(token, punto, signal) {
  return responderConGeo(token, punto, signal);
}

/** Respuesta al pedido del server: la posición para el mapa. */
export async function responderConGeo(token, punto, signal) {
  const lat = Number(punto?.lat);
  const lng = Number(punto?.lng);
  if (!token || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const deviceId = await idDeEsteCelular();
  const accuracy = Number(punto?.accuracy);
  return pedir("/api/geo/ping", {
    method: "POST",
    token,
    signal,
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

/** El cartel de hombre vivo: cumplido si tocó Acá estoy, no cumplido si se cerró solo. */
export async function informarHombreVivo(token, { clientId, programaId, cumplio, punto }) {
  if (!token) return null;
  const id = String(clientId || "").trim();
  const body = {
    respondio: Boolean(cumplio),
  };
  if (id) body.clientId = id;
  if (programaId) body.programaId = String(programaId);
  const lat = Number(punto?.lat);
  const lng = Number(punto?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    body.lat = lat;
    body.lng = lng;
    const accuracy = Number(punto?.accuracy);
    if (Number.isFinite(accuracy) && accuracy >= 0) body.accuracy = Math.round(accuracy);
  }
  return pedir("/api/hombre-vivo/mias", { method: "POST", token, body });
}

/** Rondas del turno, con puntos y marcas. */
export async function rondasDelTurno(token) {
  if (!token) return null;
  return pedir(`/api/rondas/mias?_t=${Date.now()}`, { method: "GET", token });
}

export async function iniciarRonda(token, rondaId) {
  const id = String(rondaId || "").trim();
  if (!token || !id) return null;
  return pedir(`/api/rondas/mias/${encodeURIComponent(id)}/iniciar`, { method: "POST", token, body: {} });
}

export async function marcarPuntoRonda(token, rondaId, body) {
  const id = String(rondaId || "").trim();
  if (!token || !id) return null;
  return pedir(`/api/rondas/mias/${encodeURIComponent(id)}/marcar`, {
    method: "POST",
    token,
    body: body || {},
  });
}

export async function cerrarRonda(token, rondaId) {
  const id = String(rondaId || "").trim();
  if (!token || !id) return null;
  return pedir(`/api/rondas/mias/${encodeURIComponent(id)}/cerrar`, { method: "POST", token, body: {} });
}

/** Ingresos registrados hoy en el objetivo del turno. */
export async function accesosDelTurno(token) {
  if (!token) return null;
  return pedir(`/api/accesos/mias?_t=${Date.now()}`, { method: "GET", token });
}

export async function crearAcceso(token, body) {
  if (!token) return null;
  return pedir("/api/accesos/mias", { method: "POST", token, body: body || {} });
}

/** Libro de novedades del turno del vigilador. */
export async function novedadesDelTurno(token) {
  if (!token) return null;
  return pedir(`/api/novedades/mias?_t=${Date.now()}`, { method: "GET", token });
}

export async function crearNovedad(token, { texto, at, clientId, fotos = [], audio } = {}) {
  if (!token) return null;
  const fotosOk = (fotos || []).filter((foto) => foto?.uri).slice(0, 3);
  const hayArchivos = fotosOk.length > 0 || Boolean(audio?.uri);
  if (!hayArchivos) {
    return pedir("/api/novedades/mias", {
      method: "POST",
      token,
      body: { texto, at, clientId },
    });
  }
  const form = new FormData();
  form.append("texto", String(texto || ""));
  if (at) form.append("at", at);
  if (clientId) form.append("clientId", clientId);
  fotosOk.forEach((foto, index) => {
    form.append("fotos", {
      uri: foto.uri,
      name: foto.name || `foto-${index}.jpg`,
      type: foto.type || "image/jpeg",
    });
  });
  if (audio?.uri) {
    form.append("audio", {
      uri: audio.uri,
      name: audio.name || "novedad.m4a",
      type: audio.type || "audio/mp4",
    });
  }
  return pedirForm("/api/novedades/mias", form, token);
}

/** Tareas que el panel le mandó a este vigilador en el día. */
export async function tareasDeHoy(token) {
  if (!token) return null;
  return pedir("/api/despachos/mios", { method: "GET", token });
}

export async function tareaPorId(token, id) {
  const tareaId = String(id || "").trim();
  if (!token || !tareaId) return null;
  return pedir(`/api/despachos/${encodeURIComponent(tareaId)}`, { method: "GET", token });
}

/** aceptar, llegada, partida o finalizar. */
export async function avanzarTarea(token, id, paso) {
  const tareaId = String(id || "").trim();
  const accion = String(paso || "").trim();
  if (!token || !tareaId || !accion) return null;
  return pedir(`/api/despachos/${encodeURIComponent(tareaId)}/${accion}`, {
    method: "POST",
    token,
    body: {},
  });
}

/** Avisa al panel que en el celular tocaron Acá estoy, para cerrar ese push. */
export async function reconocerPush(token) {
  if (!token) return null;
  return pedir("/api/push/visto", { method: "POST", token, body: {} });
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
