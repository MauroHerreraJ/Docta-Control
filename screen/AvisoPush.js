import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useMarco } from "../util/medida";
import { escucharAviso, resolverAviso, revisarAvisoAlVolver } from "../util/push";

/** Nivel 2: pantalla grande de reconocimiento. Un solo toque: ACÁ ESTOY. */
export default function AvisoPush() {
  const { arriba, abajo } = useMarco();
  const [aviso, setAviso] = useState({ abierto: false, id: 0, hasta: 0, tipo: "" });

  useEffect(() => escucharAviso(setAviso), []);

  useEffect(() => {
    revisarAvisoAlVolver().catch(() => {});
  }, []);

  useEffect(() => {
    if (!aviso.abierto || !aviso.hasta) return undefined;
    const espera = Math.max(0, aviso.hasta - Date.now());
    const timer = setTimeout(() => resolverAviso(false), espera);
    return () => clearTimeout(timer);
  }, [aviso.abierto, aviso.id, aviso.hasta]);

  const hombre = aviso.tipo === "hombre_vivo";

  return (
    <Modal
      visible={aviso.abierto}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      presentationStyle="fullScreen"
      onRequestClose={() => {}}
    >
      <View style={[styles.pantalla, { paddingTop: arriba, paddingBottom: abajo }]}>
        <Text style={styles.etiqueta}>{hombre ? "Hombre vivo" : "Aviso del panel"}</Text>
        <Pressable
          style={styles.boton}
          onPress={() => resolverAviso(true)}
          accessibilityRole="button"
          accessibilityLabel="Acá estoy"
        >
          <Text style={styles.botonTexto}>ACÁ ESTOY</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: "#0B1220",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 28,
    gap: 20,
  },
  etiqueta: {
    color: "#94A3B8",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  boton: {
    flex: 1,
    backgroundColor: "#0F76C4",
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  botonTexto: {
    color: "#ffffff",
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: 1.5,
    textAlign: "center",
  },
});
