import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { despertarConsulta } from "./fondo";
import { registrarTokenPush } from "./sesion";

export const TAREA_PUSH = "docta5-push";
const CANAL_AVISO = "aviso-panel";

const estado = { listo: false, error: "" };
const oyentes = new Set();

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
      shouldShowAlert: visible,
      shouldShowBanner: visible,
      shouldShowList: visible,
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
    vibrationPattern: [0, 500, 200, 500, 200, 700],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
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

/** Pide el token FCM y lo guarda en el mismo canal que Hombre vivo. */
export async function activarPush(tokenSesion) {
  const sesion = String(tokenSesion || "").trim();
  if (!sesion) return false;
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
  if (fcm === tokenGuardado) {
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
