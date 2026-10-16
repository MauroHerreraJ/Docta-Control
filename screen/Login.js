import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ingresarVigilador } from "../util/sesion";

function altoDelTeclado(evento) {
  const alto = Number(evento?.endCoordinates?.height);
  const techo = Number(evento?.endCoordinates?.screenY);
  const pantalla = Dimensions.get("screen").height;
  const porTecho = Number.isFinite(techo) ? pantalla - techo : 0;
  const porAlto = Number.isFinite(alto) ? alto : 0;
  return Math.max(0, Math.round(Math.max(porAlto, porTecho)));
}

export default function Login({ onIngresar }) {
  const lista = useRef(null);
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [teclado, setTeclado] = useState(0);

  useEffect(() => {
    const mostrar = Keyboard.addListener("keyboardDidShow", (evento) => {
      setTeclado(Platform.OS === "android" ? altoDelTeclado(evento) : 0);
    });
    const ocultar = Keyboard.addListener("keyboardDidHide", () => setTeclado(0));
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);

  useEffect(() => {
    if (teclado <= 0) return undefined;
    const frame = requestAnimationFrame(() => lista.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [teclado]);

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
      <ScrollView
        ref={lista}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contenido,
          teclado > 0 && styles.contenidoConTeclado,
          teclado > 0 && { paddingBottom: teclado },
        ]}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: "#F4FBFE",
  },
  contenido: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  contenidoConTeclado: {
    justifyContent: "flex-end",
    paddingTop: 8,
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
