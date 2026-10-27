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
    video: "▶",
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

const VIDEO_MAX_BYTES = 16 * 1024 * 1024;

function textoSiNoHayNota(nota, hayFoto, hayAudio, hayVideo) {
  if (nota) return nota;
  const partes = [hayFoto && "foto", hayAudio && "audio", hayVideo && "video"].filter(Boolean);
  if (!partes.length) return "";
  partes[0] = partes[0][0].toUpperCase() + partes[0].slice(1);
  if (partes.length === 1) return partes[0];
  const ultima = partes.pop();
  return `${partes.join(", ")} y ${ultima}`;
}

function tituloSubida(hayFoto, hayAudio, hayVideo) {
  const tipos = [hayVideo && "video", hayFoto && "foto", hayAudio && "audio"].filter(Boolean);
  if (tipos.length > 1) return "Subiendo archivos";
  if (tipos[0] === "video") return "Subiendo video";
  if (tipos[0] === "foto") return "Subiendo foto";
  if (tipos[0] === "audio") return "Subiendo audio";
  return "Enviando novedad";
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
  const [progreso, setProgreso] = useState(0);
  const [subida, setSubida] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const [fotos, setFotos] = useState([]);
  const [audioUri, setAudioUri] = useState("");
  const [video, setVideo] = useState(null);
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

  const onVideo = async () => {
    if (!puedeEscribir || enviando || grabando) return;
    if (video) {
      setVideo(null);
      return;
    }
    const ImagePicker = picker();
    if (!ImagePicker) {
      Alert.alert("Cámara", "El video entra con la próxima compilación de la app.");
      return;
    }
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert("Cámara", "Hace falta la cámara para grabar un video.");
      return;
    }
    try {
      const audio = require("expo-audio");
      if (audio?.requestRecordingPermissionsAsync) await audio.requestRecordingPermissionsAsync();
    } catch {
      /* sin micrófono el video puede quedar mudo */
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["videos"],
      videoMaxDuration: 20,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType?.Low ?? 2,
      videoExportPreset: ImagePicker.VideoExportPreset?.LowQuality,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    if (Number(asset.fileSize) > VIDEO_MAX_BYTES) {
      Alert.alert("Video", "El video es muy pesado. Grabá uno más corto, hasta 20 segundos.");
      return;
    }
    setVideo({
      uri: asset.uri,
      type: asset.mimeType || "video/mp4",
      name: asset.fileName || "novedad.mp4",
    });
  };

  const onEnviar = async () => {
    const nota = String(texto || "").trim();
    const hayFoto = fotos.length > 0;
    const hayAudio = Boolean(audioUri);
    const hayVideo = Boolean(video?.uri);
    if ((!nota && !hayFoto && !hayAudio && !hayVideo) || enviando) return;
    if (escuchando) moduloVoz()?.stop?.();
    if (grabando) {
      Alert.alert("Audio", "Detené la grabación antes de enviar.");
      return;
    }
    const textoEnvio = textoSiNoHayNota(nota, hayFoto, hayAudio, hayVideo);
    if (!data?.enCurso) {
      Alert.alert("Turno", "El turno no está en curso.");
      return;
    }
    const hayArchivo = hayFoto || hayAudio || hayVideo;
    setEnviando(true);
    setProgreso(hayArchivo ? 0 : 0);
    setSubida(hayArchivo ? tituloSubida(hayFoto, hayAudio, hayVideo) : "");
    try {
      const res = await crearNovedad(token, {
        texto: textoEnvio,
        at: new Date().toISOString(),
        clientId: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        fotos,
        audio: audioUri ? { uri: audioUri } : null,
        video,
        onProgress: hayArchivo ? setProgreso : undefined,
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
      setVideo(null);
    } catch (error) {
      Alert.alert("No se guardó", error?.message || "Probá de nuevo.");
    } finally {
      setEnviando(false);
      setProgreso(0);
      setSubida("");
    }
  };

  const novedades = data?.novedades || [];
  const contenido = { width: "100%", maxWidth: ancho, alignSelf: "center" };
  const letra = Math.max(16, m(16));
  const puedeEnviar =
    puedeEscribir &&
    !enviando &&
    !grabando &&
    (Boolean(String(texto || "").trim()) || fotos.length > 0 || Boolean(audioUri) || Boolean(video?.uri));

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
          <ActivityIndicator size="large" color="#0F76C4" />
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
                    {(item.adjuntos || []).some((adj) => adj.tipo === "video") ? (
                      <Text style={[styles.audioNota, { fontSize: m(12), marginTop: m(6) }]}>Video</Text>
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
              <Pressable
                style={[
                  styles.chip,
                  { borderRadius: m(12), paddingHorizontal: m(12), paddingVertical: m(8) },
                  (!puedeEscribir || enviando || grabando) && styles.btnOff,
                ]}
                onPress={onVideo}
                disabled={!puedeEscribir || enviando || grabando}
              >
                <Icono name="video" size={m(16)} color="#fff" />
                <Text style={[styles.chipTexto, { fontSize: m(12) }]}>{video ? "Quitar video" : "Video"}</Text>
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
            {enviando && subida ? (
              <View
                style={[
                  contenido,
                  styles.subidaCard,
                  {
                    borderRadius: m(14),
                    paddingHorizontal: m(14),
                    paddingVertical: m(14),
                    marginTop: m(8),
                  },
                ]}
              >
                <View style={styles.subidaCabeza}>
                  <ActivityIndicator color="#fff" />
                  <View style={styles.videoTextoCaja}>
                    <Text style={[styles.videoTitulo, { fontSize: m(15) }]}>{subida}</Text>
                    <Text style={[styles.videoSub, { fontSize: m(12), marginTop: m(2) }]}>
                      {progreso >= 100 ? "Guardando en el servidor…" : `${progreso}% · no cierres la app`}
                    </Text>
                  </View>
                  <Text style={[styles.subidaPct, { fontSize: m(18) }]}>{Math.min(100, progreso)}%</Text>
                </View>
                <View style={[styles.subidaPista, { height: m(10), borderRadius: m(999), marginTop: m(12) }]}>
                  <View
                    style={[
                      styles.subidaRelleno,
                      {
                        width: `${Math.max(4, Math.min(100, progreso))}%`,
                        borderRadius: m(999),
                      },
                    ]}
                  />
                </View>
              </View>
            ) : null}
            {(fotos.length || audioUri || video?.uri) && !enviando ? (
              <View style={[contenido, styles.previas, { marginTop: m(8) }]}>
                {fotos.map((foto) => (
                  <Image key={foto.uri} source={{ uri: foto.uri }} style={styles.foto} />
                ))}
                {audioUri ? (
                  <View
                    style={[
                      styles.audioChip,
                      { borderRadius: m(12), paddingHorizontal: m(12), paddingVertical: m(10) },
                    ]}
                  >
                    <Icono name="mic" size={m(16)} color="#7B61FF" />
                    <Text style={[styles.audioChipTexto, { fontSize: m(13) }]}>Audio listo</Text>
                  </View>
                ) : null}
                {video?.uri ? (
                  <Pressable
                    style={[
                      styles.videoCard,
                      {
                        borderRadius: m(14),
                        paddingHorizontal: m(12),
                        paddingVertical: m(12),
                        minHeight: m(72),
                      },
                    ]}
                    onPress={onVideo}
                    disabled={!puedeEscribir || enviando || grabando}
                    accessibilityLabel="Quitar video"
                  >
                    <View
                      style={[
                        styles.videoPlay,
                        { width: m(44), height: m(44), borderRadius: m(22) },
                      ]}
                    >
                      <Icono name="video" size={m(20)} color="#fff" />
                    </View>
                    <View style={styles.videoTextoCaja}>
                      <Text style={[styles.videoTitulo, { fontSize: m(15) }]}>Video listo</Text>
                      <Text style={[styles.videoSub, { fontSize: m(12), marginTop: m(2) }]}>
                        Tocá Enviar o acá para quitarlo
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.videoQuitar,
                        { width: m(32), height: m(32), borderRadius: m(16) },
                      ]}
                    >
                      <Text style={{ color: "#fff", fontSize: m(18), fontWeight: "800", lineHeight: m(20) }}>×</Text>
                    </View>
                  </Pressable>
                ) : null}
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
                  !puedeEnviar && styles.btnOff,
                  puedeEnviar && video?.uri && styles.btnVideo,
                ]}
                onPress={onEnviar}
                disabled={!puedeEnviar}
              >
                <Text style={[styles.btnTexto, { fontSize: m(14) }]}>
                  {enviando
                    ? progreso > 0 && progreso < 100
                      ? `${progreso}%`
                      : "..."
                    : video?.uri && !String(texto || "").trim() && !fotos.length && !audioUri
                      ? "Enviar video"
                      : "Enviar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
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
  nota: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8ECF1" },
  hora: { fontWeight: "800", color: "#7B61FF" },
  cuerpo: { color: "#1A2332" },
  fotos: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  foto: { width: 64, height: 64, borderRadius: 8, backgroundColor: "#E8ECF1" },
  audioNota: { fontWeight: "700", color: "#7B61FF" },
  audioChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EDE9FE",
    borderWidth: 1,
    borderColor: "#C4B5FD",
  },
  audioChipTexto: { color: "#5B21B6", fontWeight: "800" },
  empty: { alignItems: "center" },
  emptyTitulo: { fontWeight: "700", color: "#1A2332" },
  emptySub: { color: "#6B7280", textAlign: "center" },
  adjuntos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#7B61FF",
  },
  chipTexto: { color: "#fff", fontWeight: "700" },
  previas: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  videoCard: {
    flexGrow: 1,
    flexBasis: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#4C1D95",
    borderWidth: 2,
    borderColor: "#A78BFA",
  },
  videoPlay: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7B61FF",
  },
  videoTextoCaja: { flex: 1, minWidth: 0 },
  videoTitulo: { color: "#FFFFFF", fontWeight: "800" },
  videoSub: { color: "#DDD6FE", fontWeight: "600" },
  videoQuitar: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  subidaCard: {
    backgroundColor: "#4C1D95",
    borderWidth: 2,
    borderColor: "#C4B5FD",
  },
  subidaCabeza: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  subidaPct: {
    color: "#F5F3FF",
    fontWeight: "900",
  },
  subidaPista: {
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  subidaRelleno: {
    height: "100%",
    backgroundColor: "#A78BFA",
  },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8ECF1",
    color: "#1A2332",
  },
  mic: { backgroundColor: "#7B61FF", alignItems: "center", justifyContent: "center" },
  micOn: { backgroundColor: "#DC2626" },
  btn: { backgroundColor: "#7B61FF" },
  btnVideo: { backgroundColor: "#5B21B6" },
  btnOff: { backgroundColor: "#94A3B8" },
  btnTexto: { color: "#fff", fontWeight: "800" },
});
