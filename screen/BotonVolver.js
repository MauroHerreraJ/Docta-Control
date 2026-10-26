import { Pressable, StyleSheet, Text, View } from "react-native";

function Flecha({ m }) {
  const lado = m(10);
  return (
    <View
      style={{
        width: lado,
        height: lado,
        marginRight: m(2),
        borderLeftWidth: 3,
        borderBottomWidth: 3,
        borderColor: "#fff",
        transform: [{ rotate: "45deg" }],
      }}
    />
  );
}

export default function BotonVolver({ onPress, titulo, m = (n) => n }) {
  return (
    <View style={styles.fila}>
      <Pressable
        onPress={onPress}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Volver atrás"
        style={({ pressed }) => [
          styles.boton,
          {
            minHeight: m(40),
            borderRadius: m(10),
            paddingHorizontal: m(14),
            gap: m(8),
          },
          pressed && styles.botonOn,
        ]}
      >
        <Flecha m={m} />
        <Text style={[styles.texto, { fontSize: m(16) }]} numberOfLines={1}>
          Volver atrás
        </Text>
      </Pressable>
      {titulo ? (
        <Text style={[styles.titulo, { fontSize: m(18) }]} numberOfLines={1}>
          {titulo}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    minWidth: 0,
    flexShrink: 1,
    gap: 10,
  },
  boton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
    maxWidth: "100%",
    backgroundColor: "#0F76C4",
    borderWidth: 1,
    borderColor: "#6BB0E8",
  },
  botonOn: {
    backgroundColor: "#0B5F9C",
  },
  texto: {
    flexShrink: 1,
    color: "#fff",
    fontWeight: "800",
  },
  titulo: {
    flex: 1,
    color: "#1A2332",
    fontWeight: "700",
  },
});
