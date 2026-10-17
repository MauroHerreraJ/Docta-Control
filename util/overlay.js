import { NativeModules, Platform, Vibration } from "react-native";

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

/** Suena la alarma del teléfono mientras el cartel está abierto. */
export function sonarAlarma() {
  if (Platform.OS !== "android") return;
  if (nativo?.sonar) {
    nativo.sonar();
    return;
  }
  Vibration.vibrate([0, 800, 150, 800, 150, 1200], true);
}

export function callarAlarma() {
  if (nativo?.callar) nativo.callar();
  Vibration.cancel();
}
