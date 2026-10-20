import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  borrarBiometria,
  estadoBiometria,
  guardarUsuarioBiometria,
  reconocerUsuario,
} from "../util/biometria";
import { idDeEsteCelular, ingresarVigilador } from "../util/sesion";

export default function Login({ onIngresar }) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [bioOk, setBioOk] = useState(false);
  const [aviso, setAviso] = useState("");
  const [guardado, setGuardado] = useState("");
  const [reconocido, setReconocido] = useState(false);
  const [reconociendo, setReconociendo] = useState(false);
  const [codigo, setCodigo] = useState("");

  const reconocer = async () => {
    setReconociendo(true);
    setError("");
    try {
      const ok = await reconocerUsuario();
      if (!ok) {
        setReconocido(false);
        setUsuario("");
        return;
      }
      setUsuario(guardado);
      setReconocido(true);
    } finally {
      setReconociendo(false);
    }
  };

  useEffect(() => {
    let vivo = true;
    idDeEsteCelular().then((id) => {
      if (vivo) setCodigo(id || "");
    });
    estadoBiometria().then(async (estado) => {
      if (!vivo) return;
      setBioOk(estado.disponible);
      setAviso(estado.aviso);
      if (!estado.disponible || !estado.usuario) return;
      setGuardado(estado.usuario);
      setReconociendo(true);
      const ok = await reconocerUsuario();
      if (!vivo) return;
      setReconociendo(false);
      if (ok) {
        setUsuario(estado.usuario);
        setReconocido(true);
      }
    });
    return () => {
      vivo = false;
    };
  }, []);

  const olvidar = async () => {
    await borrarBiometria();
    setGuardado("");
    setReconocido(false);
    setUsuario("");
    setClave("");
    setError("");
  };

  const ofrecerGuardar = (nombre, sesion) => {
    Alert.alert(
      "Biometría",
      "¿Guardamos tu usuario en este teléfono para reconocerte la próxima vez? La clave se pide siempre.",
      [
        { text: "Ahora no", onPress: () => onIngresar(sesion) },
        {
          text: "Guardar",
          onPress: () => {
            reconocerUsuario()
              .then((ok) => (ok ? guardarUsuarioBiometria(nombre) : null))
              .finally(() => onIngresar(sesion));
          },
        },
      ],
      { cancelable: false },
    );
  };

  const ingresar = async () => {
    const nombre = (reconocido ? guardado : usuario).trim();
    if (guardado && !reconocido) {
      setError("Primero reconocé la biometría.");
      return;
    }
    if (!nombre || !clave) {
      setError("Completá usuario y clave.");
      return;
    }
    setError("");
    setEntrando(true);
    try {
      const sesion = await ingresarVigilador(nombre, clave);
      if (bioOk && !guardado) {
        setEntrando(false);
        ofrecerGuardar(nombre, sesion);
        return;
      }
      onIngresar(sesion);
    } catch (err) {
      setError(err?.message || "No se pudo ingresar.");
    } finally {
      setEntrando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.fondo}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contenido}
      >
      <View style={styles.tarjeta}>
        <Text style={styles.marca}>Docta</Text>
        <Text style={styles.titulo}>Ingreso de vigilador</Text>
        <Text selectable style={styles.codigo}>
          {codigo || "…"}
        </Text>
        <Text style={styles.ayuda}>
          Cargá este código en la empresa antes de entrar. Sin eso, el usuario no ingresa.
        </Text>
        <Text style={styles.ayuda}>Usá el usuario y la clave del panel.</Text>
        {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}
        {guardado ? (
          <Pressable onPress={olvidar} disabled={entrando} hitSlop={6}>
            <Text style={styles.leyenda}>
              Borrar la biometría de {guardado} para entrar con otro usuario.
            </Text>
          </Pressable>
        ) : null}

        <Text style={styles.etiqueta}>Usuario</Text>
        {guardado && !reconocido ? (
          <Pressable
            style={({ pressed }) => [styles.botonSuave, pressed && styles.botonOn]}
            onPress={reconocer}
            disabled={reconociendo || entrando}
          >
            {reconociendo ? (
              <ActivityIndicator color="#0F76C4" />
            ) : (
              <Text style={styles.botonSuaveTexto}>Reconocer con biometría</Text>
            )}
          </Pressable>
        ) : (
          <TextInput
            style={styles.campo}
            value={usuario}
            onChangeText={setUsuario}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!entrando && !reconocido}
            returnKeyType="next"
          />
        )}

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
    marginBottom: 8,
    color: "#5C7A90",
    fontSize: 13,
  },
  codigo: {
    marginBottom: 8,
    color: "#0B3A5B",
    fontSize: 13,
    fontWeight: "700",
  },
  aviso: {
    marginBottom: 10,
    color: "#8A5A00",
    fontSize: 13,
  },
  leyenda: {
    marginBottom: 12,
    color: "#0F76C4",
    fontSize: 13,
    fontWeight: "600",
  },
  botonSuave: {
    marginBottom: 14,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#9FDFFC",
    backgroundColor: "#F8FDFF",
    alignItems: "center",
    justifyContent: "center",
  },
  botonSuaveTexto: {
    color: "#0F76C4",
    fontSize: 15,
    fontWeight: "700",
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
