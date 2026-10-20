import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import BotonVolver from "./BotonVolver";
import { useMedida } from "../util/medida";
import { avanzarTarea, tareaPorId, tareasDeHoy } from "../util/sesion";

const ESTADO = {
  pendiente: "Pendiente",
  aceptada: "Aceptada",
  en_sitio: "En sitio",
  partida: "Partida",
  finalizada: "Reconocida",
  cancelada: "Cancelada",
};

function Icono({ name, size = 16, color = "#222" }) {
  const glifo = { "chevron-back": "‹", "chevron-forward": "›" }[name] || "•";
  return <Text style={{ fontSize: size, color, fontWeight: "700", lineHeight: size + 4 }}>{glifo}</Text>;
}

function objetivoDe(cuenta) {
  if (!cuenta || typeof cuenta !== "object") return "Objetivo";
  return String(cuenta.nombrefantasia || cuenta.nombre || "").trim() || "Objetivo";
}

function direccionDe(cuenta) {
  if (!cuenta || typeof cuenta !== "object") return "";
  return [cuenta.direccion, cuenta.barrio, cuenta.ciudad].filter((parte) => String(parte || "").trim()).join(", ");
}

function colorPrioridad(prioridad) {
  if (prioridad === "alta") return "#E74C3C";
  if (prioridad === "baja") return "#95A5A6";
  return "#EB7F27";
}

export default function Asignaciones({ token, onVolver }) {
  const { m, ancho } = useMedida();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [tareas, setTareas] = useState([]);
  const [elegida, setElegida] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    setError("");
    try {
      const data = await tareasDeHoy(token);
      const lista = [
        ...(Array.isArray(data?.pendientes) ? data.pendientes : []),
        ...(Array.isArray(data?.activos) ? data.activos : []),
        ...(Array.isArray(data?.historial) ? data.historial : []),
      ];
      setTareas(lista);
    } catch (err) {
      setError(err?.message || "No se pudieron cargar las tareas.");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrir = async (tarea) => {
    setElegida(tarea);
    setError("");
    try {
      const fresca = await tareaPorId(token, tarea?._id);
      if (fresca?._id) setElegida(fresca);
    } catch (err) {
      setError(err?.message || "No se pudo abrir la tarea.");
    }
  };

  const avanzar = async (paso) => {
    if (!elegida?._id || ocupado) return;
    setOcupado(true);
    setError("");
    try {
      const fresca = await avanzarTarea(token, elegida._id, paso);
      setElegida(fresca || elegida);
      await cargar();
    } catch (err) {
      setError(err?.message || "No se pudo actualizar la tarea.");
    } finally {
      setOcupado(false);
    }
  };

  const cuenta = elegida?.cuentaId && typeof elegida.cuentaId === "object" ? elegida.cuentaId : null;
  const estado = String(elegida?.estado || "");
  const direccion = direccionDe(cuenta);
  const contenido = { width: "100%", maxWidth: ancho, alignSelf: "center" };

  return (
    <View style={styles.root}>
      <Text style={[styles.marca, { fontSize: m(18), marginTop: m(12) }]}>Vigilantes</Text>
      <View style={[styles.cabeza, { paddingHorizontal: m(16), marginTop: m(6) }]}>
        <BotonVolver
          m={m}
          titulo={elegida ? "Tarea" : "Asignaciones"}
          onPress={() => {
            if (elegida) {
              setElegida(null);
              setError("");
              return;
            }
            onVolver?.();
          }}
        />
      </View>

      {cargando && !elegida ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color="#222266" />
        </View>
      ) : elegida ? (
        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: m(16), paddingBottom: m(16) }}>
            <View style={contenido}>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={[styles.card, { borderRadius: m(14), padding: m(14) }]}>
                <Text style={[styles.estado, { color: colorPrioridad(elegida.prioridad), fontSize: m(12) }]}>
                  {ESTADO[estado] || estado || "—"}
                </Text>
                <Text style={[styles.cardTitulo, { fontSize: m(20), marginTop: 4 }]}>{elegida.titulo || "Tarea"}</Text>
                {elegida.detalle ? (
                  <Text style={[styles.sub, { fontSize: m(14), marginTop: 8 }]}>{elegida.detalle}</Text>
                ) : null}
                <Text style={[styles.sub, { fontSize: m(12), marginTop: 8 }]}>
                  {String(elegida.tipo || "tarea").toUpperCase()} · Prioridad {String(elegida.prioridad || "media").toUpperCase()}
                </Text>
              </View>
              <View style={[styles.card, { borderRadius: m(14), padding: m(14), marginTop: m(10) }]}>
                <Text style={[styles.estado, { fontSize: m(12) }]}>Objetivo</Text>
                <Text style={[styles.cardTitulo, { fontSize: m(16), marginTop: 4 }]}>{objetivoDe(cuenta)}</Text>
                {direccion ? (
                  <Text style={[styles.sub, { fontSize: m(13), marginTop: 6 }]}>{direccion}</Text>
                ) : null}
                {cuenta?.telefono ? (
                  <Pressable onPress={() => Linking.openURL(`tel:${cuenta.telefono}`).catch(() => {})}>
                    <Text style={[styles.link, { fontSize: m(14), marginTop: 8 }]}>{cuenta.telefono}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </ScrollView>
          <View style={{ paddingHorizontal: m(16), paddingBottom: m(12), flexShrink: 0 }}>
            <View style={[contenido, { gap: m(8) }]}>
              {estado === "pendiente" ? (
                <Boton texto="Aceptar" color="#0F76C4" ocupado={ocupado} m={m} onPress={() => avanzar("aceptar")} />
              ) : null}
              {["aceptada", "en_sitio", "partida"].includes(estado) ? (
                <Boton texto="Reconocer" color="#16A085" ocupado={ocupado} m={m} onPress={() => avanzar("finalizar")} />
              ) : null}
              {["finalizada", "cancelada"].includes(estado) ? (
                <Text style={[styles.sub, { textAlign: "center", fontSize: m(14) }]}>
                  Cerrada · {ESTADO[estado] || estado}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: m(16), paddingBottom: m(16) }}>
          <View style={contenido}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Text style={[styles.seccion, { fontSize: m(16) }]}>Tareas del turno</Text>
            <Text style={[styles.sub, { fontSize: m(13), marginBottom: m(10) }]}>
              {tareas.length ? `${tareas.length} en el día` : "Sin tareas"}
            </Text>
            {tareas.length === 0 ? (
              <View style={[styles.card, { borderRadius: m(14), padding: m(16) }]}>
                <Text style={[styles.cardTitulo, { fontSize: m(16) }]}>Nada por ahora</Text>
                <Text style={[styles.sub, { fontSize: m(13), marginTop: 4 }]}>
                  Cuando el panel envíe una tarea, aparece acá.
                </Text>
              </View>
            ) : (
              tareas.map((tarea) => (
                <Pressable
                  key={String(tarea._id)}
                  style={[styles.card, styles.fila, { borderRadius: m(12), padding: m(12), marginBottom: m(8) }]}
                  onPress={() => abrir(tarea)}
                >
                  <View style={[styles.punto, { backgroundColor: colorPrioridad(tarea.prioridad) }]} />
                  <View style={styles.flex}>
                    <Text style={[styles.cardTitulo, { fontSize: m(15) }]} numberOfLines={1}>
                      {tarea.titulo || "Tarea"}
                    </Text>
                    <Text style={[styles.sub, { fontSize: m(12) }]} numberOfLines={1}>
                      {objetivoDe(tarea.cuentaId)} · {ESTADO[tarea.estado] || tarea.estado}
                    </Text>
                  </View>
                  <Icono name="chevron-forward" size={m(18)} color="#94A3B8" />
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Boton({ texto, color, ocupado, m, onPress }) {
  return (
    <Pressable
      style={[styles.boton, { backgroundColor: color, minHeight: m(48), borderRadius: m(12), opacity: ocupado ? 0.7 : 1 }]}
      onPress={onPress}
      disabled={ocupado}
    >
      {ocupado ? <ActivityIndicator color="#fff" /> : <Text style={[styles.botonTexto, { fontSize: m(16) }]}>{texto}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7FB" },
  marca: { textAlign: "center", color: "#1E293B", fontWeight: "700" },
  cabeza: { marginBottom: 8 },
  volver: { flexDirection: "row", alignItems: "center", gap: 2 },
  titulo: { color: "#222266", fontWeight: "700", flexShrink: 1 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  seccion: { color: "#1A2332", fontWeight: "800" },
  sub: { color: "#6B7280", marginTop: 2 },
  error: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    overflow: "hidden",
  },
  card: { backgroundColor: "#fff" },
  fila: { flexDirection: "row", alignItems: "center" },
  punto: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  flex: { flex: 1, minWidth: 0 },
  cardTitulo: { color: "#1A2332", fontWeight: "700" },
  estado: { color: "#EB7F27", fontWeight: "800", textTransform: "uppercase" },
  link: { color: "#0F76C4", fontWeight: "700" },
  boton: { alignItems: "center", justifyContent: "center" },
  botonTexto: { color: "#fff", fontWeight: "700" },
});
