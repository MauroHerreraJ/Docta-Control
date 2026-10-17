import { Dimensions, Platform, StatusBar, useWindowDimensions } from "react-native";

/**
 * Alto libre de las barras del sistema.
 * En Android la ventana ocupa también la barra de navegación, y el botón de abajo queda tapado.
 */
export function useMarco() {
  const { height: ventana } = useWindowDimensions();
  const pantalla = Dimensions.get("screen").height;
  const arriba = Platform.OS === "android" ? StatusBar.currentHeight || 24 : 54;
  const yaRecortada = Platform.OS === "android" && pantalla - ventana > arriba + 8;
  const abajo = yaRecortada ? 0 : Platform.OS === "android" ? 48 : 34;
  return { arriba, abajo };
}

/** La app se dibuja detrás de las barras del sistema. Estos altos las dejan libres. */
function margenesSistema() {
  if (Platform.OS !== "android") return { arriba: 0, abajo: 0 };
  const screenH = Dimensions.get("screen").height;
  const windowH = Dimensions.get("window").height;
  const status = StatusBar.currentHeight || 0;
  if (screenH - windowH > status + 8) return { arriba: 0, abajo: 0 };
  return { arriba: Math.max(status, 36), abajo: 48 };
}

/** Escala espacios e iconos según el tamaño de la pantalla, sin pasar de un teléfono grande. */
export function useMedida() {
  const { width, height } = useWindowDimensions();
  const escala = Math.max(0.82, Math.min(width / 390, height / 800, 1.15));
  const m = (valor) => Math.round(valor * escala);
  const columnas = width < 340 ? 1 : width >= 760 ? 3 : 2;
  const ancho = Math.min(width, 840);
  const { arriba, abajo } = margenesSistema();
  return { width, height, escala, m, columnas, ancho, arriba, abajo };
}
