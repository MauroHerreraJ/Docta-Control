import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TurboModuleRegistry,
  Vibration,
  View,
} from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import * as Location from "expo-location";
import BotonVolver from "./BotonVolver";
import { useMedida } from "../util/medida";
import { CERCA_M, distanceMeters, formatMetros, RADIO_M } from "../util/rondaGeo";
import { buildRondaMapHtml } from "../util/rondaMapHtml";
import { enqueueRondaOp, flushRondaQueue, getRondaQueue, sinRed } from "../util/rondaQueue";
import { codigoNfcDocta, textoDeTagNfc } from "../util/codigoNfc";
import { cerrarRonda, iniciarRonda, marcarPuntoRonda, rondasDelTurno } from "../util/sesion";

function Icono({ name, size = 16, color = "#222" }) {
  const glifo = {
    "chevron-back": "‹",
    checkmark: "✓",
    "checkmark-circle": "✓",
  }[name] || "•";
  return <Text style={{ fontSize: size, color, fontWeight: "700", lineHeight: size + 4 }}>{glifo}</Text>;
}

function WebViewRonda() {
  if (!TurboModuleRegistry.get("RNCWebViewModule")) return null;
  try {
    return require("react-native-webview").WebView;
  } catch {
    return null;
  }
}

function lectorQr() {
  if (!requireOptionalNativeModule("ExpoCamera")) return null;
  try {
    return require("./RondaQr").default;
  } catch {
    return null;
  }
}

function mensaje(error, respaldo) {
  return error?.message || respaldo;
}

function mergeOne(ronda, queue) {
  if (!ronda) return null;
  const marcas = [...(ronda.marcas || [])];
  for (const item of queue) {
    if (item.kind !== "marcar" || String(item.rondaId) !== String(ronda.rondaId)) continue;
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
}

class MapaSiHay extends Component {
  state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  render() {
    if (this.state.fallo) return null;
    return this.props.children;
  }
}

function RecorridoMap({ puntos, marcas, pos, mostrarVos, alto }) {
  const WebView = WebViewRonda();
  const webRef = useRef(null);
  const html = useMemo(() => buildRondaMapHtml(puntos, marcas), [puntos, marcas]);

  useEffect(() => {
    if (!WebView) return undefined;
    const js =
      mostrarVos && pos && Number.isFinite(pos.lat) && Number.isFinite(pos.lng)
        ? `window.setUser && window.setUser(${Number(pos.lat)}, ${Number(pos.lng)}); true;`
        : "window.hideUser && window.hideUser(); true;";
    webRef.current?.injectJavaScript(js);
    return undefined;
  }, [WebView, pos, mostrarVos]);

  if (!WebView) return null;

  return (
    <MapaSiHay>
      <View style={[styles.map, { height: alto }]}>
        <WebView
          ref={webRef}
          originWhitelist={["*"]}
          source={{ html, baseUrl: "https://localhost" }}
          style={styles.web}
          javaScriptEnabled
          setSupportMultipleWindows={false}
          onLoadEnd={() => {
            if (mostrarVos && pos && Number.isFinite(pos.lat) && Number.isFinite(pos.lng)) {
              webRef.current?.injectJavaScript(
                `window.setUser && window.setUser(${Number(pos.lat)}, ${Number(pos.lng)}); true;`,
              );
            }
          }}
        />
      </View>
    </MapaSiHay>
  );
}

export default function RondaRecorrido({ token, rondaId, onVolver }) {
  const { m, ancho, height } = useMedida();
  const altoMapa = Math.min(m(280), Math.max(120, Math.round(height * 0.28)));
  const altoQr = Math.min(m(240), Math.max(110, Math.round(height * 0.24)));
  const id = String(rondaId || "");
  const [cargando, setCargando] = useState(true);
  const [pack, setPack] = useState(null);
  const [ronda, setRonda] = useState(null);
  const [queue, setQueue] = useState([]);
  const [pos, setPos] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      await flushRondaQueue().catch(() => {});
      const [payload, pending] = await Promise.all([rondasDelTurno(token), getRondaQueue()]);
      const found = (payload?.rondas || []).find((item) => String(item.rondaId) === id);
      setPack(payload);
      setRonda(found || null);
      setQueue(pending);
    } catch (error) {
      Alert.alert("Sin conexión", "No se pudo abrir la ronda.");
    } finally {
      setCargando(false);
    }
  }, [token, id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    let watch = null;
    let alive = true;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!alive) return;
        if (perm.status !== "granted") {
          setGpsError("Sin permiso de ubicación");
          return;
        }
        const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (alive) {
          setPos({
            lat: first.coords.latitude,
            lng: first.coords.longitude,
            accuracy: first.coords.accuracy,
          });
        }
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 4, timeInterval: 2500 },
          (loc) => {
            setPos({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              accuracy: loc.coords.accuracy,
            });
          },
        );
        if (!alive) sub.remove();
        else watch = sub;
      } catch {
        if (alive) setGpsError("No se pudo leer el GPS");
      }
    })();
    return () => {
      alive = false;
      watch?.remove();
    };
  }, []);

  const vista = mergeOne(ronda, queue);
  const radio = Number(pack?.radioM) || RADIO_M;
  const cerrada = vista?.estado === "cerrada" || vista?.estado === "cierre_pendiente";

  const puntosConDist = useMemo(() => {
    const puntos = vista?.puntos || [];
    return puntos.map((punto, index) => {
      const tieneGeo = Number.isFinite(Number(punto.lat)) && Number.isFinite(Number(punto.lng));
      const anterior = puntos[index - 1];
      const anteriorGeo =
        anterior && Number.isFinite(Number(anterior.lat)) && Number.isFinite(Number(anterior.lng));
      const dist =
        pos && Number.isFinite(pos.lat) && tieneGeo
          ? distanceMeters(pos.lat, pos.lng, punto.lat, punto.lng)
          : null;
      const tramo =
        index === 0 || !tieneGeo || !anteriorGeo
          ? 0
          : distanceMeters(anterior.lat, anterior.lng, punto.lat, punto.lng);
      const marca = (vista?.marcas || []).find((item) => item.puntoId === punto._id);
      return { ...punto, dist, tramo, marca };
    });
  }, [vista, pos]);

  const largoAPie = useMemo(
    () => puntosConDist.reduce((sum, punto) => sum + (punto.tramo || 0), 0),
    [puntosConDist],
  );

  const candidato = useMemo(() => {
    const libres = puntosConDist.filter((punto) => !punto.marca && punto.dist != null);
    libres.sort((a, b) => a.dist - b.dist);
    return libres[0] || null;
  }, [puntosConDist]);

  const puedeMarcar = Boolean(candidato) && candidato.dist <= radio && pack?.enCurso && !cerrada && !busy;
  const iniciada =
    vista?.estado === "en_curso" || vista?.estado === "cerrada" || vista?.estado === "cierre_pendiente";
  const esNfc = vista?.tipo === "nfc";
  const esQr = vista?.tipo === "qr";
  const datosRef = useRef({});
  datosRef.current = { vista, pos, id, token, busy };

  const marcarConCodigo = useCallback(async (codigo) => {
    const actual = datosRef.current;
    if (actual.busy) return;
    const punto = (actual.vista?.puntos || []).find(
      (item) => String(item.nfcCodigo || "").trim().toLowerCase() === String(codigo).toLowerCase(),
    );
    if (!punto) {
      setAviso("Este tag no está en la ronda");
      return;
    }
    const ya = (actual.vista?.marcas || []).some((marca) => marca.puntoId === String(punto._id));
    if (ya) {
      setAviso(`${punto.label || "Punto"} ya estaba marcado`);
      return;
    }
    const lugar = actual.pos;
    setBusy(true);
    const body = {
      kind: "marcar",
      rondaId: actual.id,
      puntoId: punto._id,
      lat: lugar?.lat,
      lng: lugar?.lng,
      accuracy: lugar?.accuracy,
      at: new Date().toISOString(),
      clientId: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      nfcCodigo: codigo,
    };
    try {
      const res = await marcarPuntoRonda(actual.token, actual.id, body);
      let marcada = res?.ronda || null;
      if (marcada && marcada.total > 0 && marcada.hechas >= marcada.total && marcada.estado !== "cerrada") {
        const cierre = await cerrarRonda(actual.token, actual.id);
        if (cierre?.ronda) marcada = cierre.ronda;
      }
      if (marcada) setRonda(marcada);
      Vibration.vibrate(220);
      setAviso(
        marcada?.estado === "cerrada"
          ? "Ronda completa. Quedó cerrada."
          : `Marcado ${punto.label || `punto ${punto.orden}`}`,
      );
    } catch (error) {
      if (sinRed(error)) {
        await enqueueRondaOp(body);
        const faltan = (actual.vista?.puntos || []).filter((item) => {
          const puntoId = String(item._id);
          if (puntoId === String(punto._id)) return false;
          return !(actual.vista?.marcas || []).some((marca) => marca.puntoId === puntoId);
        });
        if (faltan.length === 0) {
          await enqueueRondaOp({ kind: "cerrar", rondaId: actual.id, clientId: `c_${actual.id}` });
        }
        setQueue(await getRondaQueue());
        setAviso("Marca guardada. Se envía cuando vuelva la red.");
      } else {
        setAviso(mensaje(error, "No se pudo marcar el tag"));
      }
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!esNfc || !iniciada || cerrada || !pack?.enCurso) return undefined;
    if (Platform.OS !== "android") return undefined;
    let vivo = true;
    let ultimo = "";
    let ultimoAt = 0;
    let NfcManager;
    let Ndef;
    let NfcTech;
    try {
      const lib = require("react-native-nfc-manager");
      NfcManager = lib.default;
      Ndef = lib.Ndef;
      NfcTech = lib.NfcTech;
    } catch {
      setAviso("El lector NFC entra con la próxima instalación de la app.");
      return undefined;
    }
    let leyendo = false;
    let apagado = false;
    const escuchar = async () => {
      if (leyendo || !vivo) return;
      leyendo = true;
      apagado = false;
      try {
        const ok = await NfcManager.isSupported();
        if (!ok || !vivo) {
          if (vivo) setAviso("Este teléfono no tiene NFC.");
          return;
        }
        const habilitado = await NfcManager.isEnabled();
        if (!habilitado) {
          apagado = true;
          if (vivo) setAviso("Activá el NFC del teléfono para marcar la ronda.");
          return;
        }
        await NfcManager.start();
        while (vivo) {
          try {
            await NfcManager.requestTechnology(NfcTech.Ndef, {
              alertMessage: "Acercá el tag de la ronda",
            });
            const tag = await NfcManager.getTag();
            const codigo = codigoNfcDocta(textoDeTagNfc(tag, Ndef));
            const ahora = Date.now();
            if (codigo && (codigo !== ultimo || ahora - ultimoAt > 4000) && vivo) {
              ultimo = codigo;
              ultimoAt = ahora;
              await marcarConCodigo(codigo);
            } else if (!codigo && vivo) {
              setAviso("El tag no tiene el código de la ronda.");
            }
          } catch {
            if (!vivo) break;
          } finally {
            try {
              await NfcManager.cancelTechnologyRequest({ delayMsAndroid: 200 });
            } catch {
              // ya cancelado
            }
          }
        }
      } catch {
        if (vivo) setAviso("No se pudo abrir el lector NFC.");
      } finally {
        leyendo = false;
      }
    };
    escuchar();
    const avisoApagado = setTimeout(() => {
      if (!vivo || !apagado) return;
      Alert.alert("NFC apagado", "Activá el NFC para leer el tag del puesto.", [
        { text: "Ahora no", style: "cancel" },
        { text: "Abrir ajustes", onPress: () => NfcManager.goToNfcSetting?.() },
      ]);
    }, 400);
    const vuelta = AppState.addEventListener("change", (estado) => {
      if (estado === "active") escuchar();
    });
    return () => {
      vivo = false;
      clearTimeout(avisoApagado);
      vuelta.remove();
      NfcManager?.cancelTechnologyRequest?.({ delayMsAndroid: 0 }).catch(() => {});
    };
  }, [esNfc, iniciada, cerrada, pack?.enCurso, marcarConCodigo]);

  const siguiente = useMemo(() => puntosConDist.find((punto) => !punto.marca) || null, [puntosConDist]);
  const cercaRef = useRef("");
  useEffect(() => {
    if (!iniciada || cerrada || !siguiente || siguiente.dist == null) return;
    const puntoId = String(siguiente._id);
    if (siguiente.dist <= 10) {
      if (cercaRef.current !== puntoId) {
        cercaRef.current = puntoId;
        Vibration.vibrate(400);
      }
    } else if (siguiente.dist > 18 && cercaRef.current === puntoId) {
      cercaRef.current = "";
    }
  }, [iniciada, cerrada, siguiente]);

  const onIniciar = async () => {
    if (!pack?.enCurso || busy || iniciada) return;
    setBusy(true);
    try {
      const res = await iniciarRonda(token, id);
      if (res?.ronda) setRonda(res.ronda);
      Vibration.vibrate(180);
      setAviso("Ronda iniciada");
    } catch (error) {
      if (sinRed(error)) {
        await enqueueRondaOp({ kind: "iniciar", rondaId: id, clientId: `i_${id}` });
        setQueue(await getRondaQueue());
        setAviso("Inicio guardado. Se envía cuando vuelva la red.");
      } else {
        Alert.alert("No se pudo iniciar", mensaje(error, "Probá de nuevo."));
      }
    } finally {
      setBusy(false);
    }
  };

  const onMarcar = async () => {
    if (!puedeMarcar || !candidato || !pos) return;
    setBusy(true);
    const body = {
      kind: "marcar",
      rondaId: id,
      puntoId: candidato._id,
      lat: pos.lat,
      lng: pos.lng,
      accuracy: pos.accuracy,
      at: new Date().toISOString(),
      clientId: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
    try {
      const res = await marcarPuntoRonda(token, id, body);
      let marcada = res?.ronda || null;
      if (marcada && marcada.total > 0 && marcada.hechas >= marcada.total && marcada.estado !== "cerrada") {
        const cierre = await cerrarRonda(token, id);
        if (cierre?.ronda) marcada = cierre.ronda;
      }
      if (marcada) setRonda(marcada);
      Vibration.vibrate(220);
      setAviso(
        marcada?.estado === "cerrada"
          ? "Ronda completa. Quedó cerrada."
          : `Marcado ${candidato.label || `punto ${candidato.orden}`}`,
      );
    } catch (error) {
      if (sinRed(error)) {
        await enqueueRondaOp(body);
        const faltan = (vista?.puntos || []).filter((punto) => {
          const puntoId = String(punto._id);
          if (puntoId === String(candidato._id)) return false;
          return !(vista?.marcas || []).some((marca) => marca.puntoId === puntoId);
        });
        if (faltan.length === 0) {
          await enqueueRondaOp({ kind: "cerrar", rondaId: id, clientId: `c_${id}` });
        }
        setQueue(await getRondaQueue());
        Alert.alert(
          "Sin conexión",
          faltan.length === 0
            ? "La ronda quedó completa en el teléfono y se cierra cuando vuelva la red."
            : "La marca quedó en el teléfono y se envía cuando vuelva la red.",
        );
      } else {
        Alert.alert("No se pudo marcar", mensaje(error, "Probá de nuevo."));
      }
    } finally {
      setBusy(false);
    }
  };

  const onCerrar = async () => {
    if (!vista || vista.hechas < vista.total || cerrada || busy) return;
    setBusy(true);
    try {
      const res = await cerrarRonda(token, id);
      if (res?.ronda) setRonda(res.ronda);
      setQueue(await getRondaQueue());
    } catch (error) {
      if (sinRed(error)) {
        await enqueueRondaOp({ kind: "cerrar", rondaId: id, clientId: `c_${id}` });
        setQueue(await getRondaQueue());
        Alert.alert("Sin conexión", "El cierre quedó en el teléfono y se envía cuando vuelva la red.");
      } else {
        Alert.alert("No se pudo cerrar", mensaje(error, "Probá de nuevo."));
      }
    } finally {
      setBusy(false);
    }
  };

  const contenido = { width: "100%", maxWidth: ancho, alignSelf: "center" };

  const botonMarca = esNfc || esQr
    ? !pack?.enCurso
      ? "El turno no está en curso"
      : !iniciada
        ? esQr
          ? "Iniciá la ronda y apuntá al QR"
          : "Iniciá la ronda y acercá el tag"
        : cerrada
          ? "Ronda completa"
          : esQr
            ? "Apuntá al QR del puesto"
            : "Acercá el tag NFC del puesto"
    : !pack?.enCurso
      ? "El turno no está en curso"
      : gpsError
        ? gpsError
        : !pos
          ? "Buscando ubicación..."
          : !candidato
            ? "Puntos completos"
            : puedeMarcar
              ? `Marcar ${candidato.label || `punto ${candidato.orden}`}`
              : candidato.dist > CERCA_M
                ? "Estás lejos del recorrido"
                : `Acercate · ${formatMetros(candidato.dist)} (máx. ${radio} m)`;

  return (
    <View style={styles.root}>
      <Text style={[styles.marca, { fontSize: m(18), marginTop: m(12) }]}>Vigilantes</Text>
      <View style={[styles.cabeza, { paddingHorizontal: m(16), marginTop: m(6) }]}>
        <BotonVolver m={m} titulo={vista?.nombre || "Ronda"} onPress={onVolver} />
      </View>

      {cargando && !vista ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color="#2E86C1" />
        </View>
      ) : !vista ? (
        <View style={styles.centro}>
          <Text style={[styles.titulo, { fontSize: m(16) }]}>Ronda no disponible</Text>
          <Text style={[styles.sub, { fontSize: m(13), marginTop: 4 }]}>No está en el turno actual.</Text>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: m(16) }}>
          <View style={contenido}>
            <Text style={[styles.sub, { fontSize: m(12), marginBottom: m(8) }]}>
              {vista.hechas}/{vista.total} puntos
              {largoAPie > 0 ? ` · ${formatMetros(largoAPie)} a pie` : ""}
              {vista.horaInicio ? ` · inicio ${vista.horaInicio}` : ""}
            </Text>
          </View>

          {esQr && iniciada && !cerrada && pack?.enCurso ? (
            (() => {
              const Lector = lectorQr();
              return Lector ? (
                <Lector alto={altoQr} onCodigo={marcarConCodigo} />
              ) : (
                <Text style={[styles.aviso, { fontSize: m(13), marginBottom: m(8) }]}>
                  El lector QR entra con la próxima instalación de la app.
                </Text>
              );
            })()
          ) : null}

          {esNfc || esQr ? null : (
            <RecorridoMap
              puntos={vista.puntos}
              marcas={vista.marcas}
              pos={pos}
              alto={altoMapa}
              mostrarVos={Boolean(
                candidato
                  ? candidato.dist <= CERCA_M
                  : puntosConDist.some((p) => p.dist != null && p.dist <= CERCA_M),
              )}
            />
          )}

          <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ paddingBottom: m(8) }}>
            <View style={contenido}>
              {puntosConDist.map((punto) => (
                <View key={punto._id} style={[styles.fila, { borderRadius: m(10), marginBottom: m(6) }]}>
                  <View
                    style={[
                      styles.num,
                      { width: m(28), height: m(28), borderRadius: m(14) },
                      punto.marca && styles.numHecho,
                      punto.marca?.pending && styles.numPendiente,
                    ]}
                  >
                    <Text style={[styles.numTexto, { fontSize: m(12) }]}>{punto.orden}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.filaTitulo, { fontSize: m(14) }]} numberOfLines={1}>
                      {punto.label || `Punto ${punto.orden}`}
                    </Text>
                    <Text style={[styles.sub, { fontSize: m(12), marginTop: 1 }]}>
                      {punto.marca
                        ? punto.marca.pending
                          ? "Marcado · pendiente de envío"
                          : "Marcado"
                        : punto.tramo > 0
                          ? `${formatMetros(punto.tramo)} a pie desde el anterior${
                              punto.dist != null && punto.dist <= CERCA_M
                                ? ` · a ${formatMetros(punto.dist)} de vos`
                                : ""
                            }`
                          : punto.dist != null && punto.dist <= CERCA_M
                            ? `Inicio · a ${formatMetros(punto.dist)} de vos`
                            : vista?.tipo === "nfc"
                              ? "Pendiente de tag"
                              : vista?.tipo === "qr"
                                ? "Pendiente de QR"
                                : "Inicio del recorrido"}
                    </Text>
                  </View>
                  {punto.marca ? <Icono name="checkmark-circle" size={m(20)} color="#16A085" /> : null}
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={[contenido, { paddingBottom: m(12), flexShrink: 0 }]}>
            {vista.estado === "cerrada" ? (
              <View style={[styles.cerrada, { borderRadius: m(12) }]}>
                <Icono name="checkmark-circle" size={m(18)} color="#16A085" />
                <Text style={[styles.cerradaTexto, { fontSize: m(15) }]}>Ronda cerrada</Text>
              </View>
            ) : vista.estado === "cierre_pendiente" ? (
              <View style={[styles.pendienteBox, { borderRadius: m(12) }]}>
                <Text style={[styles.pendienteTexto, { fontSize: m(14) }]}>Cierre pendiente de envío</Text>
              </View>
            ) : vista.hechas >= vista.total && vista.total > 0 ? (
              <Pressable
                style={[styles.btn, styles.btnCerrar, { borderRadius: m(12) }, busy && styles.btnOff]}
                onPress={onCerrar}
                disabled={busy}
              >
                <Text style={[styles.btnTexto, { fontSize: m(15) }]}>{busy ? "Guardando..." : "Cerrar ronda"}</Text>
              </Pressable>
            ) : !iniciada ? (
              <Pressable
                style={[styles.btn, { borderRadius: m(12) }, (!pack?.enCurso || busy) && styles.btnOff]}
                onPress={onIniciar}
                disabled={!pack?.enCurso || busy}
              >
                <Text style={[styles.btnTexto, { fontSize: m(15) }]}>
                  {busy ? "Guardando..." : pack?.enCurso ? "Iniciar ronda" : "El turno no está en curso"}
                </Text>
              </Pressable>
            ) : esNfc || esQr ? (
              <View style={[styles.btn, { borderRadius: m(12) }, busy && styles.btnOff]}>
                <Text style={[styles.btnTexto, { fontSize: m(15) }]}>{busy ? "Guardando..." : botonMarca}</Text>
              </View>
            ) : (
              <Pressable
                style={[styles.btn, { borderRadius: m(12) }, !puedeMarcar && styles.btnOff]}
                onPress={onMarcar}
                disabled={!puedeMarcar}
              >
                <Text style={[styles.btnTexto, { fontSize: m(15) }]}>{busy ? "Guardando..." : botonMarca}</Text>
              </Pressable>
            )}
            {aviso ? <Text style={[styles.aviso, { fontSize: m(13) }]}>{aviso}</Text> : null}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7FB" },
  marca: { textAlign: "center", color: "#1E293B", fontWeight: "700" },
  cabeza: { marginBottom: 4 },
  volver: { flexDirection: "row", alignItems: "center", gap: 2 },
  titulo: { color: "#222266", fontWeight: "700", flexShrink: 1 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  sub: { color: "#6B7280" },
  map: {
    borderRadius: 14,
    backgroundColor: "#D7E3EE",
    borderWidth: 1,
    borderColor: "#D5E3EF",
    marginBottom: 10,
    overflow: "hidden",
  },
  web: { flex: 1, backgroundColor: "#e2e8f0" },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  num: { backgroundColor: "#0F76C4", alignItems: "center", justifyContent: "center" },
  numHecho: { backgroundColor: "#16A085" },
  numPendiente: { backgroundColor: "#D97706" },
  numTexto: { color: "#fff", fontWeight: "800" },
  flex: { flex: 1, minWidth: 0 },
  filaTitulo: { fontWeight: "700", color: "#1A2332" },
  btn: { backgroundColor: "#2E86C1", paddingVertical: 14, alignItems: "center" },
  btnCerrar: { backgroundColor: "#16A085" },
  btnOff: { backgroundColor: "#94A3B8" },
  btnTexto: { color: "#fff", fontWeight: "800" },
  aviso: { marginTop: 8, textAlign: "center", fontWeight: "700", color: "#16A085" },
  cerrada: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E8F8F5",
    paddingVertical: 14,
  },
  cerradaTexto: { color: "#0F766E", fontWeight: "800" },
  pendienteBox: { backgroundColor: "#FEF3C7", paddingVertical: 14, alignItems: "center" },
  pendienteTexto: { color: "#B45309", fontWeight: "800" },
});
