import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useMarco } from "../util/medida";
import { escucharAviso, resolverAviso, revisarAvisoAlVolver } from "../util/push";

export default function AvisoPush() {
  const { arriba, abajo } = useMarco();
  const [aviso, setAviso] = useState({ abierto: false, id: 0, hasta: 0 });

  useEffect(() => escucharAviso(setAviso), []);

  useEffect(() => {
    revisarAvisoAlVolver().catch(() => {});
  }, []);

  useEffect(() => {
    if (!aviso.abierto) return undefined;
    const espera = Math.max(0, aviso.hasta - Date.now());
    const timer = setTimeout(() => resolverAviso(false), espera);
    return () => clearTimeout(timer);
  }, [aviso.abierto, aviso.id, aviso.hasta]);

  return (
    <Modal
      visible={aviso.abierto}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      presentationStyle="fullScreen"
      onRequestClose={() => resolverAviso(false)}
    >
      <View style={[styles.pantalla, { paddingTop: arriba, paddingBottom: abajo }]}>
        <Pressable style={styles.boton} onPress={() => resolverAviso(true)}>
          <Text style={styles.botonTexto}>Acá estoy</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 48,
  },
  boton: {
    flex: 1,
    backgroundColor: "#0F76C4",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  botonTexto: {
    color: "#ffffff",
    fontSize: 42,
    fontWeight: "700",
  },
});
