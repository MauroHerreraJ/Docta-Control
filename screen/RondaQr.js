import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { codigoQrDocta } from "../util/codigoNfc";

export default function RondaQr({ onCodigo, alto }) {
  const [permiso, pedir] = useCameraPermissions();
  const ultimo = useRef({ codigo: "", at: 0 });
  const [pedido, setPedido] = useState(false);

  useEffect(() => {
    if (!permiso || permiso.granted || pedido || !permiso.canAskAgain) return;
    setPedido(true);
    pedir();
  }, [permiso, pedir, pedido]);

  if (!permiso?.granted) {
    return (
      <View style={[styles.caja, { height: alto }]}>
        <Text style={styles.texto}>Hace falta la cámara para leer el QR.</Text>
        <Pressable style={styles.btn} onPress={pedir}>
          <Text style={styles.btnTexto}>Permitir cámara</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <CameraView
      style={[styles.camara, { height: alto }]}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      onBarcodeScanned={({ data }) => {
        const codigo = codigoQrDocta(data);
        if (!codigo) return;
        const ahora = Date.now();
        if (ultimo.current.codigo === codigo && ahora - ultimo.current.at < 4000) return;
        ultimo.current = { codigo, at: ahora };
        onCodigo(codigo);
      }}
    />
  );
}

const styles = StyleSheet.create({
  camara: { borderRadius: 14, overflow: "hidden", marginBottom: 10 },
  caja: {
    borderRadius: 14,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    padding: 16,
  },
  texto: { color: "#fff", textAlign: "center", fontWeight: "700" },
  btn: { marginTop: 10, backgroundColor: "#138FEF", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  btnTexto: { color: "#fff", fontWeight: "700" },
});
