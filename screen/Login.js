import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
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
import { empresaDeEsteCelular, idDeEsteCelular, ingresarVigilador } from "../util/sesion";

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
  const [empresa, setEmpresa] = useState("");

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
    const leerEmpresa = async () => {
      try {
        const id = await idDeEsteCelular();
        if (vivo) setCodigo(id || "");
        const nombre = await empresaDeEsteCelular();
        if (!vivo) return;
        setEmpresa(nombre);
        if (nombre) setError("");
      } catch {
        /* sin respuesta se sigue mostrando el código */
      }
    };
    leerEmpresa();
    const timer = setInterval(leerEmpresa, 8000);
    estadoBiometria().then((estado) => {
      if (!vivo) return;
      setBioOk(estado.disponible);
      setAviso(estado.aviso);
      if (!estado.disponible || !estado.usuario) return;
      setGuardado(estado.usuario);
    });
    return () => {
      vivo = false;
      clearInterval(timer);
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
    <ImageBackground
      source={require("../assets/ondas-fondo.png")}
      style={styles.fondo}
      imageStyle={styles.fondoImagen}
      resizeMode="cover"
    >
    <KeyboardAvoidingView style={styles.capa}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contenido}
      >
      <Text style={styles.marca}>DoctaControl</Text>
      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>Ingreso de vigilador</Text>
        {empresa ? (
          <>
            <Text style={styles.empresa}>{empresa}</Text>
            <Text style={styles.ayuda}>Este celular está registrado en esta empresa.</Text>
          </>
        ) : (
          <>
            <Text selectable style={[styles.codigo, codigo.length === 6 && styles.codigoCorto]}>
              {codigo || "…"}
            </Text>
            <Text style={styles.ayuda}>
              Cargá este código en la empresa antes de entrar. Sin eso, el usuario no ingresa.
            </Text>
          </>
        )}
        <Text style={styles.ayuda}>Usá el usuario y la clave del panel.</Text>
        {aviso ? (
          <View style={styles.avisoCaja}>
            <Text style={styles.aviso}>{aviso}</Text>
          </View>
        ) : null}
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
              <ActivityIndicator color="#FFFFFF" />
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
          <Pressable onPress={() => setVerClave((v) => !v)} hitSlop={8} style={styles.verBtn}>
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: "#445864",
  },
  fondoImagen: {
    opacity: 0.55,
  },
  capa: {
    flex: 1,
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
    backgroundColor: "rgba(186, 198, 208, 0.35)",
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: "#D8E2E8",
  },
  marca: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
  },
  titulo: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  ayuda: {
    marginTop: 4,
    marginBottom: 8,
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
  },
  codigo: {
    marginTop: 8,
    marginBottom: 8,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  codigoCorto: {
    fontSize: 22,
    letterSpacing: 3,
  },
  empresa: {
    marginTop: 8,
    marginBottom: 8,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  avisoCaja: {
    marginBottom: 12,
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5B0B0",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  aviso: {
    color: "#C62828",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#8FB8EF",
    backgroundColor: "rgba(58, 113, 183, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  botonSuaveTexto: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  etiqueta: {
    marginBottom: 6,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  campo: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#D8E2E8",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1A2B3C",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  claveFila: {
    flexDirection: "row",
    alignItems: "center",
  },
  claveCampo: {
    flex: 1,
    marginBottom: 0,
  },
  verBtn: {
    marginLeft: 10,
    backgroundColor: "rgba(15, 118, 196, 0.9)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#6BB0E8",
  },
  ver: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  error: {
    marginTop: 12,
    color: "#B42318",
    fontSize: 13,
  },
  boton: {
    marginTop: 18,
    backgroundColor: "#0F76C4",
    borderRadius: 16,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#6BB0E8",
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
