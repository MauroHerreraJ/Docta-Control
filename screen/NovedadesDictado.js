import { useSpeechRecognitionEvent } from "expo-speech-recognition";

/** Escucha nativa de dictado; solo se monta si ExpoSpeechRecognition está en el build. */
export default function NovedadesDictado({ onStart, onEnd, onResult, onError }) {
  useSpeechRecognitionEvent("start", () => onStart?.());
  useSpeechRecognitionEvent("end", () => onEnd?.());
  useSpeechRecognitionEvent("result", (event) => onResult?.(event));
  useSpeechRecognitionEvent("error", (event) => onError?.(event));
  return null;
}
