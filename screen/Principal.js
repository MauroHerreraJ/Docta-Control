import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Principal({ onSalir, saliendo, onConfiguracion }) {
  return (
    <View style={styles.fondo}>
      <View style={styles.barra}>
        <Text style={styles.marca}>Docta</Text>
        <View style={styles.acciones}>
          <Pressable onPress={onConfiguracion} hitSlop={8}>
            <Text style={styles.accion}>Configuración</Text>
          </Pressable>
          <Pressable onPress={onSalir} disabled={saliendo} hitSlop={8}>
            <Text style={styles.accion}>{saliendo ? "Saliendo..." : "Salir"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: "#F4FBFE",
    paddingHorizontal: 22,
  },
  barra: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 18,
  },
  marca: {
    color: "#0F76C4",
    fontSize: 26,
    fontWeight: "700",
  },
  acciones: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  accion: {
    color: "#0F76C4",
    fontSize: 15,
    fontWeight: "700",
  },
});
