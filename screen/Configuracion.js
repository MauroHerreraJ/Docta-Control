import { useEffect, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { pedirSinAhorro, pedirUbicacionTodoElTiempo } from "../util/fondo";
import { pedirSobreOtrasApps, puedeSobreOtrasApps } from "../util/overlay";
import { escucharPush } from "../util/push";
import { nombreDe } from "../util/sesion";

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

export default function Configuracion({ usuario, onSalir, saliendo, enFondo, diag, onVolver }) {
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
    <View style={styles.fondo}>
      <View style={styles.barra}>
        <Pressable onPress={onVolver} hitSlop={8}>
          <Text style={styles.volver}>Volver</Text>
        </Pressable>
        <Pressable onPress={onSalir} disabled={saliendo} hitSlop={8}>
          <Text style={styles.salir}>{saliendo ? "Saliendo..." : "Salir"}</Text>
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
    paddingBottom: 12,
  },
  lista: {
    flex: 1,
  },
  listaContenido: {
    paddingBottom: 24,
  },
  volver: {
    color: "#0F76C4",
    fontSize: 15,
    fontWeight: "700",
  },
  salir: {
    color: "#0F76C4",
    fontSize: 15,
    fontWeight: "700",
  },
  hola: {
    color: "#5C7A90",
    fontSize: 14,
  },
  nombre: {
    marginTop: 2,
    color: "#0B3A5B",
    fontSize: 28,
    fontWeight: "700",
  },
  rol: {
    marginTop: 4,
    color: "#138FEF",
    fontSize: 13,
    fontWeight: "700",
  },
  tarjeta: {
    marginTop: 28,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#D7F1FC",
  },
  titulo: {
    color: "#0B3A5B",
    fontSize: 18,
    fontWeight: "700",
  },
  detalle: {
    marginTop: 8,
    color: "#5C7A90",
    fontSize: 14,
    lineHeight: 20,
  },
  linea: {
    marginTop: 8,
    color: "#0B3A5B",
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#9FDFFC",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  extraTexto: {
    color: "#0F76C4",
    fontSize: 14,
    fontWeight: "700",
  },
});
