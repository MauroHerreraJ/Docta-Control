import { useEffect, useRef } from "react";
import { Alert, Linking, Platform, Pressable, StyleSheet, Text } from "react-native";
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

function Marca({ nombre, size, color }) {
  const glifo = nombre === "stop" ? "■" : nombre === "trash" ? "×" : "●";
  return <Text style={{ fontSize: size, color, fontWeight: "700", lineHeight: size + 4 }}>{glifo}</Text>;
}

export default function NovedadesGrabador({ puede, sending, escuchando, audioUri, setAudioUri, onGrabando, m }) {
  const grabacionInicio = useRef(0);
  const grabacionTimer = useRef(null);
  const audioRecorder = useAudioRecorder({
    extension: ".m4a",
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
  });
  const { isRecording } = useAudioRecorderState(audioRecorder);

  useEffect(() => {
    onGrabando?.(isRecording);
  }, [isRecording, onGrabando]);

  useEffect(() => {
    return () => {
      if (grabacionTimer.current) clearTimeout(grabacionTimer.current);
    };
  }, []);

  const cortarGrabacion = async () => {
    if (grabacionTimer.current) {
      clearTimeout(grabacionTimer.current);
      grabacionTimer.current = null;
    }
    const transcurrido = Date.now() - (grabacionInicio.current || 0);
    if (transcurrido < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 1000 - transcurrido));
    }
    await audioRecorder.stop();
    setAudioUri(audioRecorder.uri || "");
    grabacionInicio.current = 0;
    // En iOS conviene liberar el modo de grabación al terminar.
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
  };

  const pedirMic = async () => {
    const permiso = await requestRecordingPermissionsAsync();
    if (permiso.granted) return true;
    Alert.alert(
      "Micrófono",
      Platform.OS === "ios"
        ? "Docta no tiene permiso de micrófono. Activalo en Ajustes → Docta → Micrófono."
        : "Hace falta el micrófono para grabar el audio.",
      Platform.OS === "ios"
        ? [
            { text: "Cancelar", style: "cancel" },
            { text: "Abrir Ajustes", onPress: () => Linking.openSettings().catch(() => {}) },
          ]
        : [{ text: "OK" }],
    );
    return false;
  };

  const onGrabar = async () => {
    if (!puede || sending || escuchando) return;
    if (isRecording) {
      try {
        await cortarGrabacion();
      } catch {
        Alert.alert("Audio", "No se pudo guardar la grabación.");
      }
      return;
    }
    if (audioUri) {
      setAudioUri("");
      return;
    }
    if (!(await pedirMic())) return;
    try {
      // Obligatorio en iPhone: sin allowsRecording el micrófono no graba.
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      grabacionInicio.current = Date.now();
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      grabacionTimer.current = setTimeout(() => {
        cortarGrabacion().catch(() => {});
      }, 60000);
    } catch (err) {
      console.warn("[NovedadesGrabador]", err?.message || err);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      Alert.alert("Audio", "No se pudo empezar a grabar.");
    }
  };

  return (
    <Pressable
      style={[
        styles.chip,
        { borderRadius: m(12), paddingHorizontal: m(12), paddingVertical: m(8) },
        isRecording && styles.micOn,
        (!puede || sending) && styles.btnOff,
      ]}
      onPress={onGrabar}
      disabled={!puede || sending || escuchando}
    >
      <Marca nombre={isRecording ? "stop" : audioUri ? "trash" : "mic"} size={m(16)} color="#fff" />
      <Text style={[styles.chipTexto, { fontSize: m(12) }]}>
        {isRecording ? "Detener" : audioUri ? "Quitar audio" : "Grabar"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#7B61FF",
  },
  chipTexto: { color: "#fff", fontWeight: "700" },
  micOn: { backgroundColor: "#DC2626" },
  btnOff: { backgroundColor: "#94A3B8" },
});
