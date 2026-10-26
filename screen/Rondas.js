import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import BotonVolver from "./BotonVolver";
import { useMedida } from "../util/medida";
import { flushRondaQueue, getRondaQueue } from "../util/rondaQueue";
import { rondasDelTurno } from "../util/sesion";

function Icono({ name, size = 16, color = "#222" }) {
  const glifo = {
    "chevron-back": "‹",
    "chevron-forward": "›",
    "cloud-upload-outline": "↑",
    "walk-outline": "→",
    walk: "→",
    checkmark: "✓",
    refresh: "↻",
  }[name] || "•";
  return <Text style={{ fontSize: size, color, fontWeight: "700", lineHeight: size + 4 }}>{glifo}</Text>;
}

function horaLabel(value) {
  const text = String(value || "").trim();
  return text || "Sin hora";
}

function estadoTexto(ronda) {
  if (ronda.estado === "cerrada") return "Cerrada";
  if (ronda.estado === "cierre_pendiente") return "Cierre pendiente";
  if (ronda.estado === "en_curso") return `${ronda.hechas}/${ronda.total} puntos`;
  if (ronda.estado === "pendiente") return "Sin iniciar";
  return ronda.total ? `${ronda.total} puntos` : "Sin puntos";
}

function mergeQueue(rondas, queue) {
  return (rondas || []).map((ronda) => {
    const extra = queue.filter(
      (item) => item.kind === "marcar" && String(item.rondaId) === String(ronda.rondaId),
    );
    const marcas = [...(ronda.marcas || [])];
    for (const item of extra) {
      const puntoId = String(item.puntoId);
      if (!marcas.some((marca) => marca.puntoId === puntoId)) {
        marcas.push({ puntoId, at: item.at, pending: true });
      }
    }
    const hechas = (ronda.puntos || []).filter((punto) =>
      marcas.some((marca) => marca.puntoId === String(punto._id)),
    ).length;
    const cierrePendiente = queue.some(
      (item) => item.kind === "cerrar" && String(item.rondaId) === String(ronda.rondaId),
    );
    const inicioPendiente = queue.some(
      (item) => item.kind === "iniciar" && String(item.rondaId) === String(ronda.rondaId),
    );
    let estado = ronda.estado;
    if (ronda.estado !== "cerrada" && cierrePendiente) estado = "cierre_pendiente";
    else if (ronda.estado === "pendiente" && (inicioPendiente || hechas > 0)) estado = "en_curso";
    return { ...ronda, marcas, hechas, estado };
  });
}

export default function Rondas({ token, onVolver, onAbrir }) {
  const { m, ancho } = useMedida();
  const [cargando, setCargando] = useState(true);
  const [data, setData] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      await flushRondaQueue().catch(() => {});
      const [payload, queue] = await Promise.all([rondasDelTurno(token), getRondaQueue()]);
      setData({
        ...payload,
        rondas: mergeQueue(payload?.rondas, queue),
        pendientes: queue.length,
      });
    } catch (error) {
      console.warn("[Rondas]", error?.message || error);
      Alert.alert("Sin conexión", "No se pudieron cargar las rondas del turno.");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
    const timer = setInterval(cargar, 15000);
    const estado = AppState.addEventListener("change", (siguiente) => {
      if (siguiente === "active") cargar();
    });
    return () => {
      clearInterval(timer);
      estado.remove();
    };
  }, [cargar]);

  const rondas = data?.rondas || [];
  const contenido = { width: "100%", maxWidth: ancho, alignSelf: "center" };

  return (
    <View style={styles.root}>
      <Text style={[styles.marca, { fontSize: m(18), marginTop: m(12) }]}>Vigilantes</Text>
      <View style={[styles.cabeza, { paddingHorizontal: m(16), marginTop: m(6) }]}>
        <BotonVolver m={m} titulo="Rondas" onPress={onVolver} />
      </View>

      {cargando && !data ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color="#0F76C4" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: m(16), paddingBottom: m(16) }}
        >
          <View style={contenido}>
            <Text style={[styles.sub, { fontSize: m(13), marginBottom: m(8) }]}>
              {data?.objetivo || "Sin objetivo"}
              {data?.enCurso ? "" : " · el turno no está en curso"}
            </Text>

            {data?.pendientes > 0 ? (
              <View style={[styles.banner, { borderRadius: m(10), marginBottom: m(8) }]}>
                <Icono name="cloud-upload-outline" size={m(16)} color="#B45309" />
                <Text style={[styles.bannerTexto, { fontSize: m(12) }]}>
                  {data.pendientes} marca{data.pendientes === 1 ? "" : "s"} sin enviar
                </Text>
              </View>
            ) : null}

            {rondas.length === 0 ? (
              <View style={styles.vacio}>
                <Icono name="walk-outline" size={m(40)} color="#B0B8C4" />
                <Text style={[styles.vacioTitulo, { fontSize: m(15), marginTop: m(8) }]}>Sin rondas</Text>
                <Text style={[styles.sub, { fontSize: m(12), textAlign: "center", marginTop: 4 }]}>
                  {data?.asignacionId
                    ? "Este turno no tiene recorridos cargados."
                    : "Cuando tengas un turno con rondas, aparecen acá."}
                </Text>
              </View>
            ) : (
              rondas.map((ronda) => {
                const cerrada = ronda.estado === "cerrada";
                return (
                  <Pressable
                    key={ronda.rondaId}
                    style={[styles.card, { borderRadius: m(12), padding: m(12), marginBottom: m(8) }]}
                    onPress={() => onAbrir?.(ronda.rondaId)}
                  >
                    <View
                      style={[
                        styles.punto,
                        { width: m(32), height: m(32), borderRadius: m(16) },
                        cerrada && styles.puntoHecho,
                        ronda.estado === "en_curso" && styles.puntoCurso,
                      ]}
                    >
                      <Icono name={cerrada ? "checkmark" : "walk"} size={m(16)} color="#fff" />
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.cardTitulo, { fontSize: m(15) }]} numberOfLines={1}>
                        {ronda.nombre}
                      </Text>
                      <Text style={[styles.sub, { fontSize: m(12), marginTop: 2 }]} numberOfLines={1}>
                        {horaLabel(ronda.horaInicio)} · {ronda.tipo === "qr" ? "QR · " : ronda.tipo === "nfc" ? "NFC · " : ""}{estadoTexto(ronda)}
                      </Text>
                    </View>
                    <Icono name="chevron-forward" size={m(18)} color="#9CA3AF" />
                  </Pressable>
                );
              })
            )}

            <Pressable style={styles.refresh} onPress={cargar}>
              <Icono name="refresh" size={m(16)} color="#6B7280" />
              <Text style={[styles.refreshTexto, { fontSize: m(12) }]}>Actualizar</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E5E7EB" },
  marca: { textAlign: "center", color: "#1E293B", fontWeight: "700" },
  cabeza: { marginBottom: 8 },
  volver: { flexDirection: "row", alignItems: "center", gap: 2 },
  titulo: { color: "#0F76C4", fontWeight: "700" },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  sub: { color: "#6B7280" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bannerTexto: { flex: 1, fontWeight: "600", color: "#B45309" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
  },
  punto: { backgroundColor: "#138FEF", alignItems: "center", justifyContent: "center" },
  puntoCurso: { backgroundColor: "#EB7F27" },
  puntoHecho: { backgroundColor: "#16A085" },
  flex: { flex: 1, minWidth: 0 },
  cardTitulo: { fontWeight: "700", color: "#1A2332" },
  vacio: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 },
  vacioTitulo: { fontWeight: "700", color: "#1A2332" },
  refresh: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
  },
  refreshTexto: { color: "#6B7280", fontWeight: "600" },
});
