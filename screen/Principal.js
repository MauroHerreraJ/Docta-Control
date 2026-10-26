import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { AppState, Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMarco } from "../util/medida";
import { flushRondaQueue } from "../util/rondaQueue";
import {
  accesosDelTurno,
  nombreDe,
  novedadesDelTurno,
  perfilDelVigilador,
  rondasDelTurno,
  tareasDeHoy,
  turnoActual,
} from "../util/sesion";

const TARJETAS = [
  {
    titulo: "Asignaciones",
    fondo: "rgba(58, 113, 183, 0.45)",
    borde: "#8FB8EF",
    iconoFondo: "#2E76E4",
    badge: "#1B4FBF",
    icono: "lista",
  },
  {
    titulo: "Rondas",
    fondo: "rgba(46, 190, 106, 0.45)",
    borde: "#7ED9A8",
    iconoFondo: "#1FA85A",
    badge: "#127A40",
    icono: "pin",
  },
  {
    titulo: "Accesos",
    fondo: "rgba(245, 165, 36, 0.45)",
    borde: "#F5C56A",
    iconoFondo: "#E08E12",
    badge: "#B86E0A",
    icono: "puerta",
  },
  {
    titulo: "Novedades",
    fondo: "rgba(139, 108, 247, 0.45)",
    borde: "#B8A0FA",
    iconoFondo: "#7048E8",
    badge: "#5428C4",
    icono: "doc",
  },
];

function Icono({ nombre, color }) {
  if (nombre === "escudo") return <IconoEscudo color={color} />;
  if (nombre === "lista") return <IconoLista color={color} />;
  if (nombre === "persona") return <IconoPersona color={color} />;
  if (nombre === "llave") return <IconoLlave color={color} />;
  if (nombre === "doc") return <IconoDoc color={color} />;
  if (nombre === "pulso") return <IconoPulso color={color} />;
  if (nombre === "casa") return <IconoCasa color={color} />;
  if (nombre === "ajuste") return <IconoAjuste color={color} />;
  if (nombre === "pin") return <IconoPin color={color} />;
  if (nombre === "reloj") return <IconoReloj color={color} />;
  if (nombre === "puerta") return <IconoPuerta color={color} />;
  if (nombre === "alerta") return <IconoAlerta color={color} />;
  return null;
}

function Chevron({ color }) {
  return <Text style={[styles.chevron, { color }]}>›</Text>;
}

function IconoEscudo({ color }) {
  return (
    <View style={styles.iconoCaja}>
      <View style={[styles.escudo, { borderColor: color }]} />
    </View>
  );
}

function IconoLista({ color }) {
  return (
    <View style={styles.iconoCaja}>
      <View style={[styles.listaHoja, { borderColor: color }]} />
      <View style={[styles.listaClip, { borderColor: color }]} />
      <View style={[styles.listaLinea, { backgroundColor: color, top: 10 }]} />
      <View style={[styles.listaLinea, { backgroundColor: color, top: 14 }]} />
    </View>
  );
}

function IconoPersona({ color }) {
  return (
    <View style={styles.iconoCaja}>
      <View style={[styles.personaCabeza, { borderColor: color }]} />
      <View style={[styles.personaCuerpo, { backgroundColor: color }]} />
      <View style={[styles.personaBrazo, styles.personaBrazoIzq, { backgroundColor: color }]} />
      <View style={[styles.personaBrazo, styles.personaBrazoDer, { backgroundColor: color }]} />
      <View style={[styles.personaPierna, styles.personaPiernaIzq, { backgroundColor: color }]} />
      <View style={[styles.personaPierna, styles.personaPiernaDer, { backgroundColor: color }]} />
    </View>
  );
}

function IconoLlave({ color }) {
  return (
    <View style={styles.iconoCaja}>
      <View style={[styles.llaveAro, { borderColor: color }]} />
      <View style={[styles.llavePalo, { backgroundColor: color }]} />
      <View style={[styles.llaveDiente, { backgroundColor: color, left: 16 }]} />
      <View style={[styles.llaveDiente, { backgroundColor: color, left: 20, height: 4 }]} />
    </View>
  );
}

function IconoDoc({ color }) {
  return (
    <View style={styles.iconoCaja}>
      <View style={[styles.docHoja, { borderColor: color }]} />
      <View style={[styles.docLinea, { backgroundColor: color, top: 8 }]} />
      <View style={[styles.docLinea, { backgroundColor: color, top: 12 }]} />
      <View style={[styles.docLinea, { backgroundColor: color, top: 16, width: 7 }]} />
    </View>
  );
}

function IconoPulso({ color }) {
  return (
    <View style={styles.iconoCaja}>
      <View style={[styles.pulsoBase, { backgroundColor: color, left: 0, width: 5 }]} />
      <View style={[styles.pulsoBajo, { backgroundColor: color }]} />
      <View style={[styles.pulsoAlto, { backgroundColor: color }]} />
      <View style={[styles.pulsoSube, { backgroundColor: color }]} />
      <View style={[styles.pulsoBase, { backgroundColor: color, right: 0, width: 6 }]} />
    </View>
  );
}

function IconoCasa({ color }) {
  return (
    <View style={styles.iconoCaja}>
      <View style={[styles.casaTecho, { borderBottomColor: color }]} />
      <View style={[styles.casaCuerpo, { borderColor: color }]} />
    </View>
  );
}

function IconoPin({ color }) {
  return (
    <View style={styles.iconoCaja}>
      <View style={[styles.pinCabeza, { borderColor: color }]} />
      <View style={[styles.pinPunta, { borderTopColor: color }]} />
    </View>
  );
}

function IconoReloj({ color }) {
  return (
    <View style={styles.iconoCaja}>
      <View style={[styles.relojAro, { borderColor: color }]} />
      <View style={[styles.relojMano, { backgroundColor: color }]} />
    </View>
  );
}

function IconoPuerta({ color }) {
  return (
    <View style={styles.iconoCaja}>
      <View style={[styles.puertaHoja, { borderColor: color }]} />
      <View style={[styles.puertaPomo, { backgroundColor: color }]} />
    </View>
  );
}

function IconoAlerta({ color }) {
  return <Ionicons name="warning-outline" size={22} color={color} />;
}

function IconoAjuste({ color }) {
  return (
    <View style={styles.iconoCaja}>
      <View style={[styles.ajusteLinea, { backgroundColor: color, top: 4 }]} />
      <View style={[styles.ajusteLinea, { backgroundColor: color, top: 11 }]} />
      <View style={[styles.ajusteLinea, { backgroundColor: color, top: 18 }]} />
      <View style={[styles.ajustePunto, { borderColor: color, top: 2, left: 3 }]} />
      <View style={[styles.ajustePunto, { borderColor: color, top: 9, left: 13 }]} />
      <View style={[styles.ajustePunto, { borderColor: color, top: 16, left: 7 }]} />
    </View>
  );
}

function IconoMenuAjuste({ color, perilla = "#8EC8F0" }) {
  return (
    <View style={styles.menuAjuste}>
      <View style={[styles.menuAjusteLinea, { backgroundColor: color, top: 3 }]} />
      <View style={[styles.menuAjusteLinea, { backgroundColor: color, top: 11 }]} />
      <View style={[styles.menuAjusteLinea, { backgroundColor: color, top: 19 }]} />
      <View style={[styles.menuAjustePerilla, { borderColor: color, backgroundColor: perilla, top: 0, left: 2 }]} />
      <View style={[styles.menuAjustePerilla, { borderColor: color, backgroundColor: perilla, top: 8, left: 14 }]} />
      <View style={[styles.menuAjustePerilla, { borderColor: color, backgroundColor: perilla, top: 16, left: 7 }]} />
    </View>
  );
}

function IconoTrabajo({ nombre, color }) {
  if (nombre === "lista") return <Ionicons name="clipboard-outline" size={26} color={color} />;
  if (nombre === "pin") return <Ionicons name="location-outline" size={26} color={color} />;
  if (nombre === "puerta") return <Ionicons name="enter-outline" size={26} color={color} />;
  if (nombre === "doc") return <Ionicons name="document-text-outline" size={26} color={color} />;
  return <Icono nombre={nombre} color={color} />;
}

function GloboNumero({ fondo, badge, icono, numero }) {
  const visible = Number(numero) > 0;
  return (
    <View style={styles.globo}>
      <View style={[styles.iconoCuadro, { backgroundColor: fondo }]}>
        <View style={styles.iconoBrillo} />
        <View style={styles.iconoSombra} />
        <View style={styles.iconoDibujo}>
          <IconoTrabajo nombre={icono} color="#FFFFFF" />
        </View>
      </View>
      {visible ? (
        <View style={styles.globoBadge}>
          <Text allowFontScaling={false} style={styles.globoNumero}>
            {numero}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const FONDO_COLOR = "#445864";

function horaTurno(iso) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function textoTurno(turno) {
  const cuenta = turno?.cuentaId;
  const nombre = String(cuenta?.nombrefantasia || cuenta?.nombre || "").trim();
  const desde = horaTurno(turno?.inicio);
  const hasta = horaTurno(turno?.fin);
  const horario = desde && hasta ? `${desde} - ${hasta}` : "";
  const ahora = Date.now();
  const inicio = new Date(turno?.inicio).getTime();
  const fin = new Date(turno?.fin).getTime();
  const enCurso = Number.isFinite(inicio) && Number.isFinite(fin) && inicio <= ahora && ahora <= fin;
  const estado = enCurso ? "EN TURNO" : String(turno?.estado || "").toLowerCase() === "activa" ? "ACTIVA" : "PROGRAMADO";
  return {
    nombre: nombre || "Sin objetivo",
    horario: horario || "Sin turno",
    estado,
  };
}

export function MenuInferior({ activo, onHome, onConfiguracion }) {
  const home = activo === "home";
  const { abajo } = useMarco();
  const activoColor = "#0B1220";
  const inactivoColor = "#2A3444";
  return (
    <View style={[styles.barra, { marginBottom: -abajo, paddingBottom: 12 + abajo }]}>
      <Pressable style={styles.tab} onPress={onHome} hitSlop={6}>
        <Ionicons name="home" size={24} color={home ? activoColor : inactivoColor} />
        <Text style={[styles.tabTexto, home && styles.tabActivo]} numberOfLines={1}>
          Home
        </Text>
        {home ? <View style={styles.tabLinea} /> : <View style={styles.tabLineaVacia} />}
      </Pressable>
      <Pressable style={styles.tab} onPress={onConfiguracion} hitSlop={6}>
        <IconoMenuAjuste color={!home ? activoColor : inactivoColor} />
        <Text style={[styles.tabTexto, !home && styles.tabActivo]} numberOfLines={1}>
          Configuración
        </Text>
        {!home ? <View style={styles.tabLinea} /> : <View style={styles.tabLineaVacia} />}
      </Pressable>
    </View>
  );
}

export default function Principal({
  usuario,
  onSalir,
  saliendo,
  onAbrirRondas,
  onAbrirAsignaciones,
  onAbrirAccesos,
  onAbrirNovedades,
}) {
  const documento = String(usuario?.documento || "").trim();
  const [foto, setFoto] = useState("");
  const [rondasActivas, setRondasActivas] = useState(null);
  const [tareasCount, setTareasCount] = useState(null);
  const [accesosHoy, setAccesosHoy] = useState(null);
  const [novedadesCount, setNovedadesCount] = useState(null);
  const [turno, setTurno] = useState(null);

  useEffect(() => {
    const token = usuario?.token;
    if (!token) return undefined;
    let vivo = true;
    const cargar = () => {
      flushRondaQueue()
        .catch(() => {})
        .then(() => rondasDelTurno(token))
        .then((data) => {
          if (!vivo || !data) return;
          setRondasActivas((data.rondas || []).length);
        })
        .catch(() => {});
      tareasDeHoy(token)
        .then((data) => {
          if (!vivo || !data) return;
          const pendientes = Array.isArray(data.pendientes) ? data.pendientes.length : 0;
          const enCurso = Array.isArray(data.activos) ? data.activos.length : 0;
          setTareasCount(pendientes + enCurso);
        })
        .catch(() => {});
      accesosDelTurno(token)
        .then((data) => {
          if (!vivo || !data) return;
          setAccesosHoy(Number(data.hoy) || 0);
        })
        .catch(() => {});
      novedadesDelTurno(token)
        .then((data) => {
          if (!vivo || !data) return;
          setNovedadesCount((data.novedades || []).length);
        })
        .catch(() => {});
      turnoActual(token)
        .then((data) => {
          if (!vivo) return;
          setTurno(data?.activa || null);
        })
        .catch(() => {});
      perfilDelVigilador(token)
        .then((data) => {
          if (!vivo || !data) return;
          const url = String(data?.perfil?.foto || data?.vigilador?.foto || "").trim();
          setFoto(url);
        })
        .catch(() => {});
    };
    cargar();
    const timer = setInterval(cargar, 15000);
    const estado = AppState.addEventListener("change", (siguiente) => {
      if (siguiente === "active") cargar();
    });
    return () => {
      vivo = false;
      clearInterval(timer);
      estado.remove();
    };
  }, [usuario?.token]);

  const cuentaDe = (item) => {
    if (item.titulo === "Rondas") {
      const n = rondasActivas;
      return { numero: n == null ? "…" : String(n), etiqueta: n === 1 ? "activa" : "activas" };
    }
    if (item.titulo === "Asignaciones") {
      const n = tareasCount;
      return { numero: n == null ? "…" : String(n), etiqueta: n === 1 ? "pendiente" : "pendientes" };
    }
    if (item.titulo === "Accesos") {
      const n = accesosHoy;
      return { numero: n == null ? "…" : String(n), etiqueta: "hoy" };
    }
    if (item.titulo === "Novedades") {
      const n = novedadesCount;
      return { numero: n == null ? "…" : String(n), etiqueta: "sin leer" };
    }
    return { numero: "0", etiqueta: "" };
  };

  const abrirDe = (titulo) => {
    if (titulo === "Rondas") return onAbrirRondas;
    if (titulo === "Asignaciones") return onAbrirAsignaciones;
    if (titulo === "Accesos") return onAbrirAccesos;
    if (titulo === "Novedades") return onAbrirNovedades;
    return null;
  };
  const ficha = turno ? textoTurno(turno) : null;
  return (
    <ImageBackground
      source={require("../assets/ondas-fondo.png")}
      style={styles.fondo}
      imageStyle={styles.fondoImagen}
      resizeMode="cover"
    >
      <View style={styles.cabecera}>
        <Text style={styles.titulo} numberOfLines={1}>DoctaControl</Text>
      </View>

      <ScrollView
        style={styles.lista}
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.perfil}>
          <View style={styles.avatar}>
            {foto ? (
              <Image
                source={{ uri: foto }}
                style={styles.avatarFoto}
                onError={() => setFoto("")}
              />
            ) : (
              <>
                <View style={styles.avatarCabeza} />
                <View style={styles.avatarCuerpo} />
              </>
            )}
          </View>
          <View style={styles.perfilTexto}>
            <Text style={styles.nombre} numberOfLines={1}>
              {nombreDe(usuario)}
            </Text>
            <Text style={styles.documento} numberOfLines={1}>
              {documento ? `Documento ${documento}` : "Sin documento"}
            </Text>
          </View>
          <Pressable
            onPress={onSalir}
            disabled={saliendo}
            style={[styles.salir, saliendo && styles.salirOff]}
            hitSlop={8}
          >
            <Text allowFontScaling={false} style={styles.salirTexto}>
              Salir
            </Text>
          </Pressable>
        </View>

        <View style={styles.objetivo}>
          <View style={styles.iconoTurno}>
            <Ionicons name="location" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.objetivoTexto}>
            <Text style={styles.objetivoNombre} numberOfLines={1}>
              {ficha ? ficha.nombre : "…"}
            </Text>
            <View style={styles.horaFila}>
              <View style={styles.relojMini}>
                <Icono nombre="reloj" color="#8B93A7" />
              </View>
              <Text style={styles.objetivoHora}>{ficha ? ficha.horario : "…"}</Text>
            </View>
          </View>
          <View style={styles.programado}>
            <Text style={styles.programadoTexto}>{ficha ? ficha.estado : ""}</Text>
          </View>
        </View>

        <View style={styles.seccionFila}>
          <View style={styles.seccionMarca} />
          <Text style={styles.seccion}>Mi escritorio</Text>
        </View>
        <View style={styles.grilla}>
          {TARJETAS.map((item) => {
            const cuenta = cuentaDe(item);
            const cuerpo = item.ancha ? (
              <View style={styles.tarjetaTope}>
                <View style={[styles.iconoCirculo, { backgroundColor: item.tinta }]}>
                  <Icono nombre={item.icono} color="#FFFFFF" />
                </View>
                <View style={styles.tarjetaTexto}>
                  <Text style={styles.tarjetaTituloFila}>{item.titulo}</Text>
                </View>
                <Chevron color="#1A2B3C" />
              </View>
            ) : (
              <>
                <View style={styles.iconoCentro}>
                  <GloboNumero
                    fondo={item.iconoFondo}
                    badge={item.badge}
                    icono={item.icono}
                    numero={cuenta.numero}
                  />
                </View>
                <View style={styles.tarjetaPie}>
                  <Text
                    style={[styles.tarjetaTitulo, styles.tarjetaTituloPie]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.9}
                  >
                    {item.titulo}
                  </Text>
                  <View style={styles.pieFlecha}>
                    <Chevron color="#FFFFFF" />
                  </View>
                </View>
              </>
            );
            const abrir = abrirDe(item.titulo);
            const caja = [
              styles.tarjeta,
              item.ancha && styles.tarjetaAncha,
              { backgroundColor: item.fondo, borderColor: item.borde },
            ];
            if (!abrir) {
              return (
                <View key={item.titulo} style={caja}>
                  {cuerpo}
                </View>
              );
            }
            return (
              <Pressable key={item.titulo} style={caja} onPress={abrir}>
                {cuerpo}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.emergencia}>
          <View style={styles.emergenciaIcono}>
            <Icono nombre="alerta" color="#FFFFFF" />
          </View>
          <Text style={styles.emergenciaTexto}>ENVIAR EMERGENCIA</Text>
          <Chevron color="#FFFFFF" />
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: FONDO_COLOR,
    overflow: "hidden",
  },
  fondoImagen: {
    opacity: 0.55,
  },
  cabecera: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    minHeight: 56,
  },
  salir: {
    width: 88,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F76C4",
    borderWidth: 1,
    borderColor: "#6BB0E8",
  },
  salirOff: {
    opacity: 0.6,
  },
  salirTexto: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
  },
  titulo: {
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  lista: {
    flex: 1,
  },
  contenido: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  perfil: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(186, 198, 208, 0.35)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    minHeight: 72,
    borderWidth: 1,
    borderColor: "#D8E2E8",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(90,106,122,0.9)",
    overflow: "hidden",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  avatarCabeza: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E4EAF0",
    marginTop: 10,
  },
  avatarCuerpo: {
    width: 32,
    height: 22,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: "#E4EAF0",
    marginTop: 4,
  },
  avatarFoto: {
    width: 44,
    height: 44,
  },
  perfilTexto: {
    flex: 1,
    minWidth: 0,
  },
  nombre: {
    color: "#1A2B3C",
    fontSize: 17,
    fontWeight: "800",
  },
  documento: {
    marginTop: 2,
    color: "#6B7788",
    fontSize: 12,
    fontWeight: "500",
  },
  objetivo: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E8EEF2",
    shadowColor: "#1A2744",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  objetivoTexto: {
    flex: 1,
  },
  horaFila: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  relojMini: {
    width: 16,
    height: 16,
    transform: [{ scale: 0.7 }],
  },
  objetivoNombre: {
    color: "#1A2B3C",
    fontSize: 15,
    fontWeight: "800",
  },
  objetivoHora: {
    marginTop: 2,
    color: "#8B93A7",
    fontSize: 12,
    fontWeight: "500",
  },
  programado: {
    backgroundColor: "transparent",
    borderRadius: 999,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  programadoTexto: {
    color: "#3B82F6",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  seccionFila: {
    marginTop: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  seccionMarca: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  seccion: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  grilla: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
  },
  tarjeta: {
    width: "48%",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingTop: 24,
    paddingBottom: 16,
    minHeight: 148,
    borderWidth: 1,
    overflow: "hidden",
  },
  tarjetaAncha: {
    width: "100%",
  },
  tarjetaTope: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tarjetaTexto: {
    flex: 1,
    marginLeft: 10,
  },
  iconoCirculo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  iconoCentro: {
    alignItems: "center",
  },
  globo: {
    width: 66,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  globoBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 4,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E53935",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  globoNumero: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 13,
  },
  iconoCuadro: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  iconoBrillo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  iconoSombra: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.18)",
    top: 14,
    left: 12,
  },
  iconoDibujo: {
    zIndex: 1,
  },
  iconoTurno: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  cuenta: {
    flex: 1,
    marginLeft: 8,
    justifyContent: "center",
  },
  cuentaNumero: {
    color: "#1A2B3C",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 30,
  },
  cuentaEtiqueta: {
    flex: 1,
    marginLeft: 8,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  tarjetaPie: {
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 26,
  },
  pieFlecha: {
    position: "absolute",
    right: 0,
  },
  tarjetaTituloPie: {
    width: "100%",
    marginTop: 0,
    paddingRight: 12,
    textAlign: "center",
    fontSize: 17,
    lineHeight: 22,
  },
  pastillaLado: {
    flex: 1,
    minWidth: 0,
    marginTop: 0,
    marginLeft: 8,
    alignSelf: "center",
  },
  iconoPin: {
    backgroundColor: "#138FEF",
  },
  chevron: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 24,
  },
  tarjetaTitulo: {
    marginTop: 8,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  tarjetaTituloFila: {
    color: "#1A2B3C",
    fontSize: 19,
    fontWeight: "800",
  },
  tarjetaDetalle: {
    marginTop: 2,
    color: "#7B8798",
    fontSize: 12,
  },
  pastilla: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pastillaTexto: {
    fontSize: 11,
    fontWeight: "700",
  },
  emergencia: {
    marginTop: 11,
    minHeight: 80,
    borderRadius: 16,
    backgroundColor: "rgba(232, 104, 104, 0.82)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 6,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F5B0B0",
  },
  emergenciaIcono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  emergenciaCorte: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  emergenciaTexto: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  barra: {
    flexShrink: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "rgba(186, 198, 208, 0.35)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#D8E2E8",
    paddingTop: 14,
    paddingBottom: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
  },
  tabTexto: {
    color: "#2A3444",
    fontSize: 12,
    fontWeight: "500",
  },
  tabActivo: {
    color: "#0B1220",
    fontWeight: "800",
  },
  tabLinea: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#0B1220",
  },
  tabLineaVacia: {
    width: 28,
    height: 3,
  },
  menuAjuste: {
    width: 24,
    height: 24,
  },
  menuAjusteLinea: {
    position: "absolute",
    left: 1,
    width: 22,
    height: 2.5,
    borderRadius: 2,
  },
  menuAjustePerilla: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  iconoCaja: {
    width: 26,
    height: 24,
  },
  escudo: {
    marginTop: 1,
    width: 16,
    height: 18,
    borderWidth: 2,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  listaHoja: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 16,
    height: 18,
    borderWidth: 2,
    borderRadius: 3,
  },
  listaClip: {
    position: "absolute",
    top: 1,
    left: 8,
    width: 8,
    height: 5,
    borderWidth: 2,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  listaLinea: {
    position: "absolute",
    left: 8,
    width: 8,
    height: 2,
    borderRadius: 1,
  },
  personaCabeza: {
    position: "absolute",
    top: 0,
    left: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 2,
  },
  personaCuerpo: {
    position: "absolute",
    top: 8,
    left: 11,
    width: 2,
    height: 7,
    borderRadius: 1,
  },
  personaBrazo: {
    position: "absolute",
    top: 10,
    width: 8,
    height: 2,
    borderRadius: 1,
  },
  personaBrazoIzq: {
    left: 3,
    transform: [{ rotate: "-28deg" }],
  },
  personaBrazoDer: {
    left: 12,
    transform: [{ rotate: "28deg" }],
  },
  personaPierna: {
    position: "absolute",
    top: 15,
    width: 8,
    height: 2,
    borderRadius: 1,
  },
  personaPiernaIzq: {
    left: 5,
    transform: [{ rotate: "42deg" }],
  },
  personaPiernaDer: {
    left: 11,
    transform: [{ rotate: "-36deg" }],
  },
  llaveAro: {
    position: "absolute",
    left: 1,
    top: 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  llavePalo: {
    position: "absolute",
    left: 10,
    top: 9,
    width: 13,
    height: 2,
    borderRadius: 1,
  },
  llaveDiente: {
    position: "absolute",
    top: 11,
    width: 2,
    height: 5,
  },
  docHoja: {
    position: "absolute",
    top: 2,
    left: 5,
    width: 14,
    height: 18,
    borderWidth: 2,
    borderRadius: 2,
  },
  docLinea: {
    position: "absolute",
    left: 8,
    width: 8,
    height: 2,
    borderRadius: 1,
  },
  pulsoBase: {
    position: "absolute",
    top: 11,
    height: 2,
    borderRadius: 1,
  },
  pulsoBajo: {
    position: "absolute",
    left: 5,
    top: 8,
    width: 2,
    height: 8,
    borderRadius: 1,
    transform: [{ rotate: "32deg" }],
  },
  pulsoAlto: {
    position: "absolute",
    left: 9,
    top: 3,
    width: 2,
    height: 14,
    borderRadius: 1,
    transform: [{ rotate: "-28deg" }],
  },
  pulsoSube: {
    position: "absolute",
    left: 14,
    top: 7,
    width: 2,
    height: 8,
    borderRadius: 1,
    transform: [{ rotate: "30deg" }],
  },
  casaTecho: {
    position: "absolute",
    top: 1,
    left: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  casaCuerpo: {
    position: "absolute",
    left: 6,
    bottom: 1,
    width: 12,
    height: 9,
    borderWidth: 2,
    borderTopWidth: 0,
  },
  ajusteLinea: {
    position: "absolute",
    left: 2,
    width: 20,
    height: 2,
    borderRadius: 1,
  },
  pinCabeza: {
    position: "absolute",
    top: 2,
    left: 7,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  pinPunta: {
    position: "absolute",
    top: 10,
    left: 8,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  relojAro: {
    position: "absolute",
    top: 3,
    left: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  relojMano: {
    position: "absolute",
    top: 7,
    left: 11,
    width: 2,
    height: 6,
    borderRadius: 1,
  },
  puertaHoja: {
    position: "absolute",
    top: 3,
    left: 5,
    width: 14,
    height: 16,
    borderWidth: 2,
    borderRadius: 3,
  },
  puertaPomo: {
    position: "absolute",
    top: 10,
    left: 14,
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  alertaCaja: {
    width: 22,
    height: 20,
    alignItems: "center",
  },
  alertaLado: {
    position: "absolute",
    top: 2,
    width: 2.5,
    height: 16,
    borderRadius: 2,
  },
  alertaLadoIzq: {
    left: 4,
    transform: [{ rotate: "-33deg" }],
  },
  alertaLadoDer: {
    right: 4,
    transform: [{ rotate: "33deg" }],
  },
  alertaBase: {
    position: "absolute",
    bottom: 1,
    width: 16,
    height: 2.5,
    borderRadius: 2,
  },
  alertaPalo: {
    position: "absolute",
    top: 5,
    width: 2.5,
    height: 7,
    borderRadius: 1,
  },
  alertaPunto: {
    position: "absolute",
    top: 14,
    width: 2.5,
    height: 2.5,
    borderRadius: 2,
  },
  ajustePunto: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
  },
  trabajoCaja: {
    width: 38,
    height: 38,
  },
  trabajoClip: {
    position: "absolute",
    top: 1,
    left: 12,
    width: 14,
    height: 7,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderWidth: 2,
  },
  trabajoHoja: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 26,
    height: 28,
    borderWidth: 2,
    borderRadius: 4,
  },
  trabajoBanda: {
    position: "absolute",
    top: 12,
    left: 11,
    width: 16,
    height: 3,
    borderRadius: 1,
  },
  trabajoRaya: {
    position: "absolute",
    left: 11,
    height: 2,
    borderRadius: 1,
  },
  trabajoPinAro: {
    position: "absolute",
    top: 2,
    left: 11,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
  },
  trabajoPinPunto: {
    position: "absolute",
    top: 7,
    left: 16,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  trabajoPinPunta: {
    position: "absolute",
    top: 15,
    left: 13,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 16,
  },
  salidaMarco: {
    position: "absolute",
    top: 5,
    left: 4,
    width: 16,
    height: 28,
    borderWidth: 2,
    borderRadius: 2,
  },
  salidaVara: {
    position: "absolute",
    top: 18,
    left: 16,
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  salidaPunta: {
    position: "absolute",
    top: 14,
    left: 25,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 7,
  },
  trabajoPagina: {
    position: "absolute",
    top: 4,
    left: 8,
    width: 22,
    height: 30,
    borderWidth: 2,
    borderRadius: 3,
  },
  trabajoDoblez: {
    position: "absolute",
    top: 4,
    left: 22,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderBottomWidth: 8,
  },
  trabajoRayaDoc: {
    position: "absolute",
    left: 12,
    height: 2,
    borderRadius: 1,
  },
});
