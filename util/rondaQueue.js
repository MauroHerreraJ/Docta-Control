import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  cerrarRonda,
  iniciarRonda,
  marcarPuntoRonda,
  sesionGuardadaAhora,
} from "./sesion";

const QUEUE_KEY = "@docta5_ronda_queue";

function tokenActual() {
  return sesionGuardadaAhora()?.token || "";
}

async function readQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueueRondaOp(op) {
  const queue = await readQueue();
  const clientId = String(op?.clientId || "");
  const next = clientId ? queue.filter((item) => item.clientId !== clientId) : queue;
  next.push(op);
  await writeQueue(next);
  return next;
}

export async function getRondaQueue() {
  return readQueue();
}

function esPermanente(error) {
  const status = Number(error?.status);
  return status === 400 || status === 401 || status === 404 || status === 409;
}

function sinRed(error) {
  return !Number(error?.status);
}

/** Manda marcas y cierres guardados sin red. Devuelve lo que sigue pendiente. */
export async function flushRondaQueue() {
  const token = tokenActual();
  const queue = await readQueue();
  if (!token) return queue;
  const starts = queue.filter((item) => item.kind === "iniciar");
  const marks = queue.filter((item) => item.kind === "marcar");
  const closes = queue.filter((item) => item.kind === "cerrar");
  const left = [];

  for (const item of starts) {
    try {
      await iniciarRonda(token, item.rondaId);
    } catch (error) {
      if (!esPermanente(error)) left.push(item);
    }
  }
  for (const item of marks) {
    try {
      await marcarPuntoRonda(token, item.rondaId, item);
    } catch (error) {
      if (!esPermanente(error)) left.push(item);
    }
  }
  for (const item of closes) {
    try {
      await cerrarRonda(token, item.rondaId);
    } catch (error) {
      if (!esPermanente(error)) left.push(item);
    }
  }

  await writeQueue(left);
  return left;
}

export { sinRed };
