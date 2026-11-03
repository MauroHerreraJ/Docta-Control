import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform, Vibration } from "react-native";

const CLAVE = "@docta5_alarma_cfg_v1";
const CLAVE_SONIDO_VIEJA = "@docta5_alarma_sonido";
const nativo = NativeModules.DoctaOverlay;

export const TIPOS_SONIDO = [
  { id: "alarm", etiqueta: "Alarma" },
  { id: "ringtone", etiqueta: "Timbre" },
  { id: "notification", etiqueta: "Notificación" },
  { id: "none", etiqueta: "Apagado" },
];

export const DURACIONES_SEG = [4, 8, 12, 20, 30];

export const INTENSIDADES = [
  { id: "off", etiqueta: "Apagada" },
  { id: "baja", etiqueta: "Baja" },
  { id: "media", etiqueta: "Media" },
  { id: "alta", etiqueta: "Alta" },
];

export const DEFAULT_ALARMA = {
  volumen: 100,
  tipo: "alarm",
  repeticionSeg: 12,
  vibracion: "alta",
};

let cache = { ...DEFAULT_ALARMA };
const oyentes = new Set();

function publicar() {
  const copia = { ...cache };
  for (const fn of oyentes) fn(copia);
}

export function escucharAlarmaConfig(fn) {
  oyentes.add(fn);
  fn({ ...cache });
  return () => oyentes.delete(fn);
}

export function leerAlarmaConfig() {
  return { ...cache };
}

function limpia(parcial = {}) {
  const volumen = Math.round(Number(parcial.volumen ?? cache.volumen));
  const tipo = String(parcial.tipo ?? cache.tipo);
  const repeticionSeg = Number(parcial.repeticionSeg ?? cache.repeticionSeg);
  const vibracion = String(parcial.vibracion ?? cache.vibracion);
  return {
    volumen: Number.isFinite(volumen) ? Math.min(100, Math.max(0, volumen)) : 100,
    tipo: TIPOS_SONIDO.some((t) => t.id === tipo) ? tipo : "alarm",
    repeticionSeg: DURACIONES_SEG.includes(repeticionSeg) ? repeticionSeg : 12,
    vibracion: INTENSIDADES.some((i) => i.id === vibracion) ? vibracion : "alta",
  };
}

async function syncNativo(cfg) {
  if (Platform.OS !== "android" || !nativo?.guardarAlarmaConfig) return;
  await nativo.guardarAlarmaConfig(cfg.volumen, cfg.tipo, cfg.repeticionSeg * 1000, cfg.vibracion);
}

export async function cargarAlarmaConfig() {
  let raw = "";
  try {
    raw = (await AsyncStorage.getItem(CLAVE)) || "";
  } catch {
    raw = "";
  }
  if (raw) {
    try {
      cache = limpia(JSON.parse(raw));
      await syncNativo(cache);
      publicar();
      return { ...cache };
    } catch {
      /* sigue */
    }
  }
  // Migra el toggle viejo sonido on/off.
  const viejo = await AsyncStorage.getItem(CLAVE_SONIDO_VIEJA).catch(() => "");
  if (viejo === "none") {
    cache = limpia({ ...DEFAULT_ALARMA, tipo: "none" });
  } else {
    cache = { ...DEFAULT_ALARMA };
  }
  await AsyncStorage.setItem(CLAVE, JSON.stringify(cache)).catch(() => {});
  await syncNativo(cache);
  publicar();
  return { ...cache };
}

export async function guardarAlarmaConfig(parcial) {
  cache = limpia(parcial);
  await AsyncStorage.setItem(CLAVE, JSON.stringify(cache)).catch(() => {});
  await syncNativo(cache);
  publicar();
  return { ...cache };
}

/** Patrón JS según intensidad (refuerzo mientras el cartel está abierto). */
export function patronVibracion(nivel = cache.vibracion) {
  if (nivel === "off") return null;
  if (nivel === "baja") return [0, 220, 420, 220];
  if (nivel === "media") return [0, 450, 220, 450, 220, 700];
  return [0, 700, 180, 700, 180, 1100];
}

export function probarAlarma() {
  if (Platform.OS === "android" && nativo?.probarAlarma) {
    nativo.probarAlarma();
    const patron = patronVibracion();
    if (patron) Vibration.vibrate(patron, false);
    return;
  }
  const patron = patronVibracion();
  if (patron) Vibration.vibrate(patron, false);
}

export function detenerPruebaAlarma() {
  if (nativo?.callar) nativo.callar();
  Vibration.cancel();
}

/** Carga al arrancar / login para que el FCM nativo use la misma config. */
cargarAlarmaConfig().catch(() => {});
