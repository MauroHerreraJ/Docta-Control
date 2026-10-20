import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import BotonVolver from "./BotonVolver";
import { useMedida } from "../util/medida";
import { crearNovedad, novedadesDelTurno } from "../util/sesion";

function Icono({ name, size = 16, color = "#222" }) {
  const glifo = {
    "chevron-back": "‹",
    "document-text-outline": "☰",
    camera: "▣",
    "mic-circle": "●",
    mic: "●",
    stop: "■",
  }[name] || "•";
  return <Text style={{ fontSize: size, color, fontWeight: "700", lineHeight: size + 4 }}>{glifo}</Text>;
}

function moduloVoz() {
  if (!requireOptionalNativeModule("ExpoSpeechRecognition")) return null;
  try {
    return require("expo-speech-recognition").ExpoSpeechRecognitionModule;
  } catch {
    return null;
  }
}

function picker() {
  if (!requireOptionalNativeModule("ExponentImagePicker")) return null;
  try {
    return require("expo-image-picker");
  } catch {
    return null;
  }
}

function dictadoSiHay() {
  if (!requireOptionalNativeModule("ExpoSpeechRecognition")) return null;
  try {
    return require("./NovedadesDictado").default;
  } catch {
    return null;
  }
}

function grabadorSiHay() {
  if (!requireOptionalNativeModule("ExpoAudio")) return null;
  try {
    return require("./NovedadesGrabador").default;
  } catch {
    return null;
  }
}

function horaBA(value) {
  const fecha = new Date(value);
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

export default function Novedades({ token, onVolver }) {
  const { m, ancho } = useMedida();
  const [cargando, setCargando] = useState(true);
  const [data, setData] = useState(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [fotos, setFotos] = useState([]);
  const [audioUri, setAudioUri] = useState("");
  const [grabando, setGrabando] = useState(false);
  const baseRef = useRef("");
  const Dictado = dictadoSiHay();
  const Grabador = grabadorSiHay();

  const onDictadoStart = useCallback(() => setEscuchando(true), []);
  const onDictadoEnd = useCallback(() => setEscuchando(false), []);
  const onDictadoResult = useCallback((event) => {
    const dicho = String(event.results?.[0]?.transcript || "").trim();
    if (!dicho) return;
    const base = baseRef.current;
    setTexto([base, dicho].filter(Boolean).join(" ").slice(0, 2000));
  }, []);
  const onDictadoError = useCallback((event) => {
    setEscuchando(false);
    if (event.error === "no-speech" || event.error === "aborted" || event.error === "speech-timeout") return;
    Alert.alert("No se pudo dictar", "Probá de nuevo o escribí la novedad.");
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setData(await novedadesDelTurno(token));
    } catch (error) {
      console.warn("[Novedades]", error?.message || error);
      Alert.alert("Sin conexión", "No se pudo abrir el libro de novedades.");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const puedeEscribir = Boolean(data?.enCurso && data?.asignacionId);

  const onDictar = async () => {
    if (!puedeEscribir || enviando || grabando) return;
    const modulo = moduloVoz();
    if (!modulo) {
      Alert.alert("Dictado", "El reconocimiento de voz entra con la próxima compilación de la app.");
      return;
    }
    if (escuchando) {
      modulo.stop();
      return;
    }
    try {
      const perm = await modulo.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Micrófono", "Hace falta el micrófono para dictar la novedad.");
        return;
      }
      baseRef.current = String(texto || "").trim();
      modulo.start({
        lang: "es-AR",
        interimResults: true,
        continuous: false,
      });
    } catch {
      setEscuchando(false);
      Alert.alert("Dictado", "El reconocimiento de voz entra con la próxima compilación de la app.");
    }
  };

  const onFoto = async () => {
    if (!puedeEscribir || enviando || fotos.length >= 3) return;
    const ImagePicker = picker();
    if (!ImagePicker) {
      Alert.alert("Cámara", "La foto entra con la próxima compilación de la app.");
      return;
    }
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert("Cámara", "Hace falta la cámara para adjuntar una foto.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      allowsEditing: false,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    setFotos((prev) => [...prev, { uri: asset.uri, type: "image/jpeg", name: "foto.jpg" }].slice(0, 3));
  };

  const onEnviar = async () => {
    const nota = String(texto || "").trim();
    if (!nota || enviando) return;
    if (escuchando) moduloVoz()?.stop?.();
    if (grabando) {
      Alert.alert("Audio", "Detené la grabación antes de enviar.");
      return;
    }
    if (!data?.enCurso) {
      Alert.alert("Turno", "El turno no está en curso.");
      return;
    }
    setEnviando(true);
    try {
      const res = await crearNovedad(token, {
        texto: nota,
        at: new Date().toISOString(),
        clientId: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        fotos,
        audio: audioUri ? { uri: audioUri } : null,
      });
      const creada = res?.novedad;
      if (creada) {
        setData((prev) => ({
          ...(prev || {}),
          novedades: [...(prev?.novedades || []), creada],
        }));
      }
      setTexto("");
      setFotos([]);
      setAudioUri("");
    } catch (error) {
      Alert.alert("No se guardó", error?.message || "Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const novedades = data?.novedades || [];
  const contenido = { width: "100%", maxWidth: ancho, alignSelf: "center" };
  const letra = Math.max(16, m(16));

  return (
    <KeyboardAvoidingView style={styles.root}>
      {Dictado ? (
        <Dictado
          onStart={onDictadoStart}
          onEnd={onDictadoEnd}
          onResult={onDictadoResult}
          onError={onDictadoError}
        />
      ) : null}
      <Text style={[styles.marca, { fontSize: m(18), marginTop: m(12) }]}>Vigilantes</Text>
      <View style={[styles.cabeza, { paddingHorizontal: m(16), marginTop: m(6) }]}>
        <BotonVolver m={m} titulo="Novedades" onPress={onVolver} />
      </View>

      {cargando && !data ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color="#8E44AD" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: m(16), paddingBottom: m(8) }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={contenido}>
              <Text style={[styles.sub, { fontSize: m(13), marginBottom: m(8) }]} numberOfLines={2}>
                {data?.objetivo || "Sin objetivo"}
                {data?.enCurso ? "" : " · el turno no está en curso"}
              </Text>
              {novedades.length === 0 ? (
                <View style={[styles.empty, { paddingTop: m(36) }]}>
                  <Icono name="document-text-outline" size={m(40)} color="#B0B8C4" />
                  <Text style={[styles.emptyTitulo, { fontSize: m(15), marginTop: m(8) }]}>Sin novedades</Text>
                  <Text style={[styles.emptySub, { fontSize: m(12), marginTop: m(4) }]}>
                    {data?.asignacionId
                      ? "Lo que anotes queda en este turno."
                      : "Cuando tengas un turno, el libro aparece acá."}
                  </Text>
                </View>
              ) : (
                novedades.map((item) => (
                  <View key={item._id} style={[styles.nota, { borderRadius: m(12), padding: m(12), marginBottom: m(8) }]}>
                    <Text style={[styles.hora, { fontSize: m(12) }]}>{horaBA(item.at)}</Text>
                    <Text style={[styles.cuerpo, { fontSize: m(14), lineHeight: m(20), marginTop: m(4) }]}>{item.texto}</Text>
                    {(item.adjuntos || []).some((adj) => adj.tipo === "foto") ? (
                      <View style={[styles.fotos, { marginTop: m(8) }]}>
                        {(item.adjuntos || [])
                          .filter((adj) => adj.tipo === "foto" && adj.url)
                          .map((adj) => (
                            <Image key={adj.url} source={{ uri: adj.url }} style={styles.foto} />
                          ))}
                      </View>
                    ) : null}
                    {(item.adjuntos || []).some((adj) => adj.tipo === "audio") ? (
                      <Text style={[styles.audioNota, { fontSize: m(12), marginTop: m(6) }]}>Audio</Text>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          <View style={{ paddingHorizontal: m(16), paddingBottom: m(12), flexShrink: 0 }}>
            <View style={[contenido, styles.adjuntos, { marginTop: m(8) }]}>
              <Pressable
                style={[
                  styles.chip,
                  { borderRadius: m(12), paddingHorizontal: m(12), paddingVertical: m(8) },
                  (!puedeEscribir || enviando || fotos.length >= 3) && styles.btnOff,
                ]}
                onPress={onFoto}
                disabled={!puedeEscribir || enviando || fotos.length >= 3}
              >
                <Icono name="camera" size={m(16)} color="#fff" />
                <Text style={[styles.chipTexto, { fontSize: m(12) }]}>Foto{fotos.length ? ` ${fotos.length}` : ""}</Text>
              </Pressable>
              {Grabador ? (
                <Grabador
                  puede={puedeEscribir}
                  sending={enviando}
                  escuchando={escuchando}
                  audioUri={audioUri}
                  setAudioUri={setAudioUri}
                  onGrabando={setGrabando}
                  m={m}
                />
              ) : (
                <Pressable
                  style={[styles.chip, styles.btnOff, { borderRadius: m(12), paddingHorizontal: m(12), paddingVertical: m(8) }]}
                  onPress={() => Alert.alert("Audio", "La grabación entra con la próxima compilación de la app.")}
                >
                  <Icono name="mic-circle" size={m(16)} color="#fff" />
                  <Text style={[styles.chipTexto, { fontSize: m(12) }]}>Grabar</Text>
                </Pressable>
              )}
            </View>
            {fotos.length || audioUri ? (
              <View style={[contenido, styles.previas, { marginTop: m(8) }]}>
                {fotos.map((foto) => (
                  <Image key={foto.uri} source={{ uri: foto.uri }} style={styles.foto} />
                ))}
                {audioUri ? <Text style={[styles.audioNota, { fontSize: m(12) }]}>Audio listo</Text> : null}
              </View>
            ) : null}
            <View style={[contenido, styles.composer, { marginTop: m(8) }]}>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderRadius: m(12),
                    paddingHorizontal: m(12),
                    paddingVertical: m(10),
                    fontSize: letra,
                    minHeight: m(44),
                    maxHeight: m(110),
                  },
                ]}
                value={texto}
                onChangeText={setTexto}
                placeholder={
                  escuchando ? "Hablá la novedad…" : puedeEscribir ? "Anotá o dictá una novedad" : "El turno no está en curso"
                }
                placeholderTextColor="#9CA3AF"
                multiline
                editable={puedeEscribir && !enviando}
                maxLength={2000}
              />
              <Pressable
                style={[
                  styles.mic,
                  { width: m(44), height: m(44), borderRadius: m(12) },
                  escuchando && styles.micOn,
                  (!puedeEscribir || enviando) && styles.btnOff,
                ]}
                onPress={onDictar}
                disabled={!puedeEscribir || enviando || grabando}
                accessibilityLabel={escuchando ? "Detener dictado" : "Dictar novedad"}
              >
                <Icono name={escuchando ? "stop" : "mic"} size={m(20)} color="#fff" />
              </Pressable>
              <Pressable
                style={[
                  styles.btn,
                  { borderRadius: m(12), paddingHorizontal: m(16), paddingVertical: m(12) },
                  (!puedeEscribir || !texto.trim() || enviando) && styles.btnOff,
                ]}
                onPress={onEnviar}
                disabled={!puedeEscribir || !texto.trim() || enviando}
              >
                <Text style={[styles.btnTexto, { fontSize: m(14) }]}>{enviando ? "..." : "Enviar"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7FB" },
  marca: { textAlign: "center", color: "#1E293B", fontWeight: "700" },
  cabeza: { marginBottom: 8 },
  volver: { flexDirection: "row", alignItems: "center", gap: 2 },
  titulo: { color: "#222266", fontWeight: "700", flexShrink: 1 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  sub: { color: "#6B7280" },
  nota: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8ECF1" },
  hora: { fontWeight: "800", color: "#8E44AD" },
  cuerpo: { color: "#1A2332" },
  fotos: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  foto: { width: 64, height: 64, borderRadius: 8, backgroundColor: "#E8ECF1" },
  audioNota: { fontWeight: "700", color: "#8E44AD" },
  empty: { alignItems: "center" },
  emptyTitulo: { fontWeight: "700", color: "#1A2332" },
  emptySub: { color: "#6B7280", textAlign: "center" },
  adjuntos: { flexDirection: "row", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#8E44AD",
  },
  chipTexto: { color: "#fff", fontWeight: "700" },
  previas: { flexDirection: "row", alignItems: "center", gap: 8 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8ECF1",
    color: "#1A2332",
  },
  mic: { backgroundColor: "#8E44AD", alignItems: "center", justifyContent: "center" },
  micOn: { backgroundColor: "#DC2626" },
  btn: { backgroundColor: "#8E44AD" },
  btnOff: { backgroundColor: "#94A3B8" },
  btnTexto: { color: "#fff", fontWeight: "800" },
});
