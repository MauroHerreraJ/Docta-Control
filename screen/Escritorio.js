import { Pressable, StyleSheet, Text, View } from "react-native";
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

export default function Escritorio({ usuario, onSalir, saliendo, enFondo, diag }) {
  const nombre = nombreDe(usuario);
  const latido = diag?.latidoSeg || 60;

  return (
    <View style={styles.fondo}>
      <View style={styles.barra}>
        <Text style={styles.marca}>Docta</Text>
        <Pressable onPress={onSalir} disabled={saliendo} hitSlop={8}>
          <Text style={styles.salir}>{saliendo ? "Saliendo..." : "Salir"}</Text>
        </Pressable>
      </View>

      <Text style={styles.hola}>Hola</Text>
      <Text style={styles.nombre}>{nombre}</Text>
      <Text style={styles.rol}>Vigilador</Text>

      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>Escritorio</Text>
        <Text style={styles.detalle}>{textoServicio(diag, enFondo)}</Text>
        <Text style={styles.linea}>{textoFondo(diag)}</Text>
        <Text style={styles.linea}>
          {`Consulta cada ${latido} s. ${diag?.pendiente ? "Hay una solicitud." : "Sin solicitud pendiente."}`}
        </Text>
        <Text style={styles.linea}>
          {`Último envío ${horaDe(diag?.ultimoEnvioAt)}${diag?.ultimoTipo ? ` · ${diag.ultimoTipo}` : ""}`}
        </Text>
        <Text style={styles.linea}>{textoHttp(diag)}</Text>
        {diag?.ultimoError ? <Text style={styles.error}>{diag.ultimoError}</Text> : null}
        {diag?.nota ? <Text style={styles.linea}>{diag.nota}</Text> : null}
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
});
