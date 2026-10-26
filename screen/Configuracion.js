import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { pedirSinAhorro, pedirUbicacionTodoElTiempo } from "../util/fondo";
import { pedirSobreOtrasApps, puedeSobreOtrasApps } from "../util/overlay";
import { escucharPush } from "../util/push";
import BotonVolver from "./BotonVolver";
import { cambiarClave, nombreDe } from "../util/sesion";

const CLAVE_OCULTA = "25361411";

function horaDe(iso) {
  if (!iso) return "todavía no";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "todavía no";
  return fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function textoServicio(diag, enFondo) {
  if (diag?.servicio === "sin permiso") return "Falta el permiso de ubicación.";
  if (enFondo || diag?.servicio === "activo") return "Aviso visible. Sigue con la pantalla apagada.";
  return "Servicio detenido.";
}

function textoFondo(diag) {
  if (diag?.fondo === "concedido") return "Ubicación en segundo plano concedida.";
  if (diag?.fondo === "denegado") return "Ubicación en segundo plano no concedida.";
  return "Ubicación en segundo plano sin confirmar.";
}

function textoHttp(diag) {
  if (!diag?.ultimoEnvioAt) return "Todavía no envió.";
  if (diag.ultimoHttp == null) return "Esperando respuesta.";
  if (diag.ultimoHttp === 0) return "Sin respuesta del servidor.";
  return `HTTP ${diag.ultimoHttp}`;
}

function textoPush(push) {
  if (push?.error) return push.error;
  if (push?.listo) return "Push listo. El servidor puede despertarla.";
  return "Registrando push.";
}

function Tecnica({ usuario, onSalir, saliendo, enFondo, diag, onVolver }) {
  const nombre = nombreDe(usuario);
  const latido = diag?.latidoSeg || 60;
  const [push, setPush] = useState(null);
  const [sobreApps, setSobreApps] = useState(false);

  useEffect(() => escucharPush(setPush), []);

  useEffect(() => {
    let vivo = true;
    const leer = () => {
      puedeSobreOtrasApps().then((ok) => {
        if (vivo) setSobreApps(ok);
      });
    };
    leer();
    const estado = AppState.addEventListener("change", (siguiente) => {
      if (siguiente === "active") leer();
    });
    return () => {
      vivo = false;
      estado.remove();
    };
  }, []);

  return (
    <ImageBackground
      source={require("../assets/ondas-fondo.png")}
      style={styles.fondo}
      imageStyle={styles.fondoImagen}
      resizeMode="cover"
    >
      <View style={styles.barra}>
        <View style={styles.volverCaja}>
          <BotonVolver onPress={onVolver} />
        </View>
        <Pressable onPress={onSalir} disabled={saliendo} style={styles.salirBtn} hitSlop={12}>
          <Text allowFontScaling={false} style={styles.salir}>Salir</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.lista} contentContainerStyle={styles.listaContenido} showsVerticalScrollIndicator={false}>
      <Text style={styles.hola}>Hola</Text>
      <Text style={styles.nombre}>{nombre}</Text>
      <Text style={styles.rol}>Vigilador</Text>

      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>Configuración</Text>
        <Text style={styles.detalle}>{textoServicio(diag, enFondo)}</Text>
        <Text style={styles.linea}>{textoPush(push)}</Text>
        <Text style={styles.linea}>{textoFondo(diag)}</Text>
        <Text style={styles.linea}>
          {diag?.informa === false
            ? `Consulta cada ${latido} s. Envía la posición.`
            : `Consulta cada ${latido} s. ${diag?.pendiente ? "Hay una solicitud." : "Sin solicitud pendiente."}`}
        </Text>
        <Text style={styles.linea}>
          {`Último envío ${horaDe(diag?.ultimoEnvioAt)}${diag?.ultimoTipo ? ` · ${diag.ultimoTipo}` : ""}`}
        </Text>
        <Text style={styles.linea}>{textoHttp(diag)}</Text>
        {diag?.ultimoError ? <Text style={styles.error}>{diag.ultimoError}</Text> : null}
        {diag?.nota ? <Text style={styles.linea}>{diag.nota}</Text> : null}
        <Text style={styles.linea}>
          {sobreApps
            ? "Puede mostrarse sobre otras apps."
            : "Sin «Mostrar sobre otras apps» el push no abre la pantalla si está minimizada."}
        </Text>
        <Pressable style={styles.extra} onPress={() => pedirSobreOtrasApps()}>
          <Text style={styles.extraTexto}>Mostrar sobre otras apps</Text>
        </Pressable>
        <Pressable style={styles.extra} onPress={() => pedirSinAhorro()}>
          <Text style={styles.extraTexto}>Evitar que Android la duerma</Text>
        </Pressable>
        <Pressable style={styles.extra} onPress={() => pedirUbicacionTodoElTiempo()}>
          <Text style={styles.extraTexto}>Ubicación todo el tiempo</Text>
        </Pressable>
      </View>
      </ScrollView>
    </ImageBackground>
  );
}

const CLAVE_INICIO = "253614";

export default function Configuracion({ usuario, onSalir, saliendo, enFondo, diag, onVolver, onReiniciar }) {
  const [vista, setVista] = useState("clave");
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [inicioAbierto, setInicioAbierto] = useState(false);
  const [claveInicio, setClaveInicio] = useState("");
  const [iniciando, setIniciando] = useState(false);

  const guardar = async () => {
    const claveActual = actual.trim();
    const claveNueva = nueva.trim();
    if (!claveActual || !claveNueva) {
      setError("Completá la clave actual y la nueva.");
      return;
    }
    if (claveNueva.length < 8) {
      setError("La clave nueva tiene que tener al menos 8 caracteres.");
      return;
    }
    if (claveNueva !== repetir.trim()) {
      setError("La clave nueva no coincide.");
      return;
    }
    setError("");
    setGuardando(true);
    try {
      await cambiarClave(usuario?.token, claveActual, claveNueva);
      await onSalir();
    } catch (err) {
      setError(err?.message || "No se pudo cambiar la clave.");
      setGuardando(false);
    }
  };

  const iniciarDeCero = async () => {
    if (!inicioAbierto) {
      setError("");
      setInicioAbierto(true);
      return;
    }
    if (claveInicio.trim() !== CLAVE_INICIO) {
      setError("Clave incorrecta.");
      return;
    }
    setError("");
    setIniciando(true);
    try {
      await onReiniciar?.();
    } catch (err) {
      setError(err?.message || "No se pudo borrar el teléfono.");
      setIniciando(false);
    }
  };

  const abrirOculta = () => {
    if (codigo.trim() !== CLAVE_OCULTA) {
      setError("Clave incorrecta.");
      return;
    }
    setError("");
    setCodigo("");
    setVista("tecnica");
  };

  if (vista === "tecnica") {
    return (
      <Tecnica
        usuario={usuario}
        onSalir={onSalir}
        saliendo={saliendo}
        enFondo={enFondo}
        diag={diag}
        onVolver={() => setVista("clave")}
      />
    );
  }

  return (
    <ImageBackground
      source={require("../assets/ondas-fondo.png")}
      style={styles.fondo}
      imageStyle={styles.fondoImagen}
      resizeMode="cover"
    >
      <View style={styles.barra}>
        <View style={styles.volverCaja}>
          <BotonVolver onPress={onVolver} />
        </View>
        <Pressable onPress={onSalir} disabled={saliendo || guardando || iniciando} style={styles.salirBtn} hitSlop={12}>
          <Text allowFontScaling={false} style={styles.salir}>Salir</Text>
        </Pressable>
      </View>
      <ScrollView
        style={styles.lista}
        contentContainerStyle={styles.listaContenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tarjeta}>
          <Pressable onLongPress={() => setVista(vista === "candado" ? "clave" : "candado")} delayLongPress={700}>
            <Text style={styles.titulo}>Configuración</Text>
          </Pressable>
          <Text style={styles.detalle}>Cambiá la clave de ingreso. Después hay que entrar de nuevo.</Text>

          <Text style={styles.etiqueta}>Clave actual</Text>
          <TextInput
            style={styles.campo}
            value={actual}
            onChangeText={setActual}
            secureTextEntry
            editable={!guardando}
            autoCapitalize="none"
          />
          <Text style={styles.etiqueta}>Clave nueva</Text>
          <TextInput
            style={styles.campo}
            value={nueva}
            onChangeText={setNueva}
            secureTextEntry
            editable={!guardando}
            autoCapitalize="none"
          />
          <Text style={styles.etiqueta}>Repetir clave nueva</Text>
          <TextInput
            style={styles.campo}
            value={repetir}
            onChangeText={setRepetir}
            secureTextEntry
            editable={!guardando}
            autoCapitalize="none"
          />

          {vista === "candado" ? (
            <>
              <Text style={styles.etiqueta}>Código</Text>
              <TextInput
                style={styles.campo}
                value={codigo}
                onChangeText={setCodigo}
                secureTextEntry
                keyboardType="number-pad"
                editable={!guardando}
              />
              <Pressable style={styles.extra} onPress={abrirOculta}>
                <Text style={styles.extraTexto}>Abrir</Text>
              </Pressable>
            </>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {inicioAbierto ? (
            <>
              <Text style={styles.etiqueta}>Clave para iniciar de cero</Text>
              <TextInput
                style={styles.campo}
                value={claveInicio}
                onChangeText={setClaveInicio}
                secureTextEntry
                keyboardType="number-pad"
                editable={!iniciando}
                autoCapitalize="none"
              />
            </>
          ) : null}

          <Pressable
            style={[styles.boton, (guardando || iniciando) && styles.botonOff]}
            onPress={guardar}
            disabled={guardando || iniciando}
          >
            {guardando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.botonTexto}>Guardar clave</Text>
            )}
          </Pressable>
          <Pressable
            style={[styles.extra, iniciando && styles.botonOff]}
            onPress={iniciarDeCero}
            disabled={iniciando || guardando}
          >
            {iniciando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.extraTexto}>{inicioAbierto ? "Borrar e iniciar" : "Iniciar"}</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: "#445864",
    paddingHorizontal: 22,
  },
  fondoImagen: {
    opacity: 0.55,
  },
  barra: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  volverCaja: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
    overflow: "hidden",
  },
  salirBtn: {
    width: 120,
    height: 48,
    flexGrow: 0,
    flexShrink: 0,
    zIndex: 30,
    elevation: 30,
    borderRadius: 16,
    backgroundColor: "#0F76C4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#6BB0E8",
  },
  lista: {
    flex: 1,
  },
  listaContenido: {
    paddingBottom: 24,
  },
  volver: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  salir: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
  },
  hola: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
  },
  nombre: {
    marginTop: 2,
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  rol: {
    marginTop: 4,
    color: "#8FB8EF",
    fontSize: 13,
    fontWeight: "700",
  },
  tarjeta: {
    marginTop: 20,
    backgroundColor: "rgba(186, 198, 208, 0.35)",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#D8E2E8",
  },
  titulo: {
    color: "#1A2B3C",
    fontSize: 18,
    fontWeight: "800",
  },
  detalle: {
    marginTop: 8,
    color: "#3A4A58",
    fontSize: 14,
    lineHeight: 20,
  },
  linea: {
    marginTop: 8,
    color: "#1A2B3C",
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    marginTop: 8,
    color: "#9A3412",
    fontSize: 14,
    lineHeight: 20,
  },
  extra: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#8FB8EF",
    backgroundColor: "rgba(58, 113, 183, 0.45)",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  extraTexto: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  etiqueta: {
    marginTop: 16,
    marginBottom: 6,
    color: "#1A2B3C",
    fontSize: 13,
    fontWeight: "700",
  },
  campo: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D8E2E8",
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#1A2B3C",
    fontSize: 16,
  },
  boton: {
    marginTop: 22,
    backgroundColor: "#0F76C4",
    borderRadius: 16,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#6BB0E8",
  },
  botonOff: {
    opacity: 0.6,
  },
  botonTexto: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
