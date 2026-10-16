import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ingresarVigilador } from "../util/sesion";

export default function Login({ onIngresar }) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);

  const ingresar = async () => {
    const nombre = usuario.trim();
    if (!nombre || !clave) {
      setError("Completá usuario y clave.");
      return;
    }
    setError("");
    setEntrando(true);
    try {
      const sesion = await ingresarVigilador(nombre, clave);
      onIngresar(sesion);
    } catch (err) {
      setError(err?.message || "No se pudo ingresar.");
    } finally {
      setEntrando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.fondo}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.tarjeta}>
        <Text style={styles.marca}>Docta</Text>
        <Text style={styles.titulo}>Ingreso de vigilador</Text>
        <Text style={styles.ayuda}>Usá el usuario y la clave del panel.</Text>

        <Text style={styles.etiqueta}>Usuario</Text>
        <TextInput
          style={styles.campo}
          value={usuario}
          onChangeText={setUsuario}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!entrando}
          returnKeyType="next"
        />

        <Text style={styles.etiqueta}>Clave</Text>
        <View style={styles.claveFila}>
          <TextInput
            style={[styles.campo, styles.claveCampo]}
            value={clave}
            onChangeText={setClave}
            secureTextEntry={!verClave}
            editable={!entrando}
            returnKeyType="done"
            onSubmitEditing={ingresar}
          />
          <Pressable onPress={() => setVerClave((v) => !v)} hitSlop={8}>
            <Text style={styles.ver}>{verClave ? "Ocultar" : "Ver"}</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.boton, pressed && styles.botonOn, entrando && styles.botonOff]}
          onPress={ingresar}
          disabled={entrando}
        >
          {entrando ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.botonTexto}>Entrar</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: "#F4FBFE",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  tarjeta: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#D7F1FC",
    shadowColor: "#0F76C4",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  marca: {
    color: "#0F76C4",
    fontSize: 28,
    fontWeight: "700",
  },
  titulo: {
    marginTop: 8,
    color: "#0B3A5B",
    fontSize: 18,
    fontWeight: "700",
  },
  ayuda: {
    marginTop: 4,
    marginBottom: 18,
    color: "#5C7A90",
    fontSize: 13,
  },
  etiqueta: {
    marginBottom: 6,
    color: "#0B3A5B",
    fontSize: 12,
    fontWeight: "600",
  },
  campo: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#9FDFFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0B3A5B",
    backgroundColor: "#F8FDFF",
  },
  claveFila: {
    flexDirection: "row",
    alignItems: "center",
  },
  claveCampo: {
    flex: 1,
    marginBottom: 0,
  },
  ver: {
    marginLeft: 10,
    color: "#138FEF",
    fontSize: 13,
    fontWeight: "700",
  },
  error: {
    marginTop: 12,
    color: "#B42318",
    fontSize: 13,
  },
  boton: {
    marginTop: 18,
    backgroundColor: "#0F76C4",
    borderRadius: 14,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  botonOn: {
    backgroundColor: "#0B5F9C",
  },
  botonOff: {
    opacity: 0.7,
  },
  botonTexto: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
