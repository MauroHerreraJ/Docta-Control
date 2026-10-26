import { useCallback, useEffect, useState } from "react";
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
import BotonVolver from "./BotonVolver";
import { useMedida } from "../util/medida";
import { accesosDelTurno, crearAcceso } from "../util/sesion";

const VACIO = {
  dni: "",
  nombre: "",
  apellido: "",
  vehiculo: "",
  patente: "",
  motivo: "",
};

function Icono({ name, size = 16, color = "#222" }) {
  const glifo = { "chevron-back": "‹" }[name] || "•";
  return <Text style={{ fontSize: size, color, fontWeight: "700", lineHeight: size + 4 }}>{glifo}</Text>;
}

function fechaBA(value) {
  const fecha = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(fecha.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
}

function horaBA(value) {
  const fecha = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(fecha)
    .replace(/\s/g, "");
}

export default function Accesos({ token, onVolver }) {
  const { m, ancho } = useMedida();
  const [cargando, setCargando] = useState(true);
  const [data, setData] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setData(await accesosDelTurno(token));
    } catch (error) {
      console.warn("[Accesos]", error?.message || error);
      Alert.alert("Sin conexión", "No se pudo abrir Accesos.");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const setCampo = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const guardar = async () => {
    if (enviando) return;
    if (!data?.enCurso) {
      Alert.alert("Turno", "El turno no está en curso.");
      return;
    }
    const dni = form.dni.trim();
    const nombre = form.nombre.trim();
    const apellido = form.apellido.trim();
    const motivo = form.motivo.trim();
    if (!dni || !nombre || !apellido || !motivo) {
      Alert.alert("Faltan datos", "DNI, nombre, apellido y motivo son obligatorios.");
      return;
    }
    setEnviando(true);
    try {
      const res = await crearAcceso(token, {
        dni,
        nombre,
        apellido,
        vehiculo: form.vehiculo.trim(),
        patente: form.patente.trim(),
        motivo,
        clientId: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });
      const creado = res?.acceso;
      if (creado) {
        setData((prev) => ({
          ...(prev || {}),
          hoy: (prev?.hoy || 0) + 1,
          accesos: [creado, ...(prev?.accesos || [])],
        }));
      }
      setForm(VACIO);
    } catch (error) {
      Alert.alert("No se guardó", error?.message || "Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const puede = Boolean(data?.enCurso && data?.asignacionId);
  const ahora = new Date();
  const contenido = { width: "100%", maxWidth: ancho, alignSelf: "center" };
  const letra = Math.max(16, m(16));

  return (
    <KeyboardAvoidingView style={styles.root}>
      <Text style={[styles.marca, { fontSize: m(18), marginTop: m(12) }]}>Vigilantes</Text>
      <View style={[styles.cabeza, { paddingHorizontal: m(16), marginTop: m(6) }]}>
        <BotonVolver m={m} titulo="Accesos" onPress={onVolver} />
      </View>

      {cargando && !data ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color="#12A39A" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: m(16), paddingBottom: m(24) }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={contenido}>
            <Text style={[styles.sub, { fontSize: m(13) }]} numberOfLines={2}>
              {data?.objetivo || "Sin objetivo"}
              {data?.enCurso ? "" : " · el turno no está en curso"}
            </Text>
            <Text style={[styles.cuando, { fontSize: m(13), marginTop: m(6), marginBottom: m(8) }]}>
              {data?.puesto || "Puesto 1"} · {fechaBA(ahora)} · {horaBA(ahora)}
            </Text>

            <Campo m={m} letra={letra} label="DNI" value={form.dni} onChange={(v) => setCampo("dni", v)} editable={puede} keyboardType="number-pad" />
            <Campo m={m} letra={letra} label="Nombre" value={form.nombre} onChange={(v) => setCampo("nombre", v)} editable={puede} />
            <Campo m={m} letra={letra} label="Apellido" value={form.apellido} onChange={(v) => setCampo("apellido", v)} editable={puede} />
            <Campo m={m} letra={letra} label="Vehículo" value={form.vehiculo} onChange={(v) => setCampo("vehiculo", v)} editable={puede} placeholder="A pie, auto, moto..." />
            <Campo m={m} letra={letra} label="Patente" value={form.patente} onChange={(v) => setCampo("patente", v)} editable={puede} autoCapitalize="characters" />
            <Campo m={m} letra={letra} label="Motivo" value={form.motivo} onChange={(v) => setCampo("motivo", v)} editable={puede} multiline />

            <Pressable
              style={[styles.btn, { borderRadius: m(12), paddingVertical: m(14), marginTop: m(16) }, (!puede || enviando) && styles.btnOff]}
              onPress={guardar}
              disabled={!puede || enviando}
            >
              <Text style={[styles.btnTexto, { fontSize: m(15) }]}>{enviando ? "Guardando…" : "Registrar ingreso"}</Text>
            </Pressable>

            <Text style={[styles.listaTitulo, { fontSize: m(13), marginTop: m(22), marginBottom: m(8) }]}>Hoy en este objetivo</Text>
            {(data?.accesos || []).length === 0 ? (
              <Text style={[styles.sub, { fontSize: m(13) }]}>Todavía no registraste ingresos.</Text>
            ) : (
              (data?.accesos || []).map((item) => (
                <View key={item._id} style={[styles.fila, { borderRadius: m(12), padding: m(12), marginBottom: m(8) }]}>
                  <Text style={[styles.filaHora, { fontSize: m(14) }]}>
                    {horaBA(item.at)} · {item.apellido}, {item.nombre}
                  </Text>
                  <Text style={[styles.sub, { fontSize: m(12), marginTop: 2 }]}>
                    DNI {item.dni}
                    {item.patente ? ` · ${item.patente}` : ""}
                    {item.motivo ? ` · ${item.motivo}` : ""}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function Campo({ m, letra, label, value, onChange, editable, placeholder, keyboardType, autoCapitalize, multiline }) {
  return (
    <View style={{ marginTop: m(8) }}>
      <Text style={[styles.label, { fontSize: m(12), marginBottom: m(4) }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          { borderRadius: m(12), paddingHorizontal: m(12), paddingVertical: m(10), fontSize: letra },
          multiline && { minHeight: m(72), textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChange}
        editable={editable}
        placeholder={placeholder || ""}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize || "sentences"}
        multiline={Boolean(multiline)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E5E7EB" },
  marca: { textAlign: "center", color: "#1E293B", fontWeight: "700" },
  cabeza: { marginBottom: 8 },
  volver: { flexDirection: "row", alignItems: "center", gap: 2 },
  titulo: { color: "#0F76C4", fontWeight: "700", flexShrink: 1 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  sub: { color: "#6B7280" },
  cuando: { fontWeight: "700", color: "#12A39A" },
  label: { fontWeight: "700", color: "#475569" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8ECF1",
    color: "#1A2332",
  },
  btn: { backgroundColor: "#12A39A", alignItems: "center" },
  btnOff: { backgroundColor: "#94A3B8" },
  btnTexto: { color: "#fff", fontWeight: "800" },
  listaTitulo: { fontWeight: "800", color: "#1A2332" },
  fila: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8ECF1" },
  filaHora: { fontWeight: "700", color: "#1A2332" },
});
