import AsyncStorage from "@react-native-async-storage/async-storage";
import { requireOptionalNativeModule } from "expo-modules-core";

const CLAVE = "@docta5_biometria";
const AVISO_SIN = "Este teléfono no tiene biometría. El ingreso sigue con usuario y clave.";
const AVISO_INSTALACION = "La biometría se activa con la próxima instalación. El ingreso sigue con usuario y clave.";

function modulo() {
  if (!requireOptionalNativeModule("ExpoLocalAuthentication")) return null;
  try {
    return require("expo-local-authentication");
  } catch {
    return null;
  }
}

async function usuarioGuardado() {
  try {
    const raw = await AsyncStorage.getItem(CLAVE);
    const parsed = raw ? JSON.parse(raw) : null;
    return String(parsed?.usuario || "").trim();
  } catch {
    return "";
  }
}

export async function estadoBiometria() {
  const guardado = await usuarioGuardado();
  const Local = modulo();
  if (!Local) {
    return { disponible: false, aviso: AVISO_INSTALACION, usuario: "" };
  }
  const hardware = await Local.hasHardwareAsync().catch(() => false);
  const cargada = hardware ? await Local.isEnrolledAsync().catch(() => false) : false;
  if (!hardware || !cargada) {
    return { disponible: false, aviso: AVISO_SIN, usuario: "" };
  }
  return { disponible: true, aviso: "", usuario: guardado };
}

export async function reconocerUsuario() {
  const Local = modulo();
  if (!Local) return false;
  const res = await Local.authenticateAsync({
    promptMessage: "Reconocé tu usuario",
    promptSubtitle: "Después ingresá la clave",
    cancelLabel: "Cancelar",
    disableDeviceFallback: true,
    biometricsSecurityLevel: "weak",
  });
  return Boolean(res?.success);
}

export async function guardarUsuarioBiometria(usuario) {
  const nombre = String(usuario || "").trim();
  if (!nombre) return;
  await AsyncStorage.setItem(CLAVE, JSON.stringify({ usuario: nombre }));
}

export async function borrarBiometria() {
  await AsyncStorage.removeItem(CLAVE);
}
