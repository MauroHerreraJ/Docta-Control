import { NativeModules, Platform } from "react-native";

const nativo = NativeModules.DoctaOverlay;

export async function puedeSobreOtrasApps() {
  if (Platform.OS !== "android" || !nativo?.puede) return false;
  return Boolean(await nativo.puede().catch(() => false));
}

/** Lo abre el vigilador. No se muestra solo al iniciar. */
export function pedirSobreOtrasApps() {
  if (Platform.OS !== "android" || !nativo?.abrirAjustes) return;
  nativo.abrirAjustes();
}

/** Android 14+: permiso de notificación a pantalla completa. */
export async function puedePantallaCompleta() {
  if (Platform.OS !== "android") return false;
  if (!nativo?.puedePantallaCompleta) return true;
  return Boolean(await nativo.puedePantallaCompleta().catch(() => false));
}

export function pedirPantallaCompleta() {
  if (Platform.OS !== "android" || !nativo?.pedirPantallaCompleta) return;
  nativo.pedirPantallaCompleta();
}

/**
 * Alarma continua nativa (Foreground Service + WakeLock + MediaPlayer).
 * No usa setInterval de JS: sigue con la pantalla apagada.
 */
export function sonarAlarma() {
  if (Platform.OS === "android" && nativo?.sonar) {
    nativo.sonar();
  }
}

export function callarAlarma() {
  if (nativo?.callar) nativo.callar();
}

export function cancelarNotificacionAviso() {
  if (nativo?.cancelarAviso) nativo.cancelarAviso();
}
