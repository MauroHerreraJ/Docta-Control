import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { flushRondaQueue } from "../util/rondaQueue";
import {
  accesosDelTurno,
  nombreDe,
  novedadesDelTurno,
  perfilDelVigilador,
  rondasDelTurno,
  tareasDeHoy,
} from "../util/sesion";

const TARJETAS = [
  {
    titulo: "Asignaciones",
    detalle: "Pendientes del turno",
    estado: "3 pendientes",
    color: "#7C5CE6",
    icono: "lista",
  },
  {
    titulo: "Rondas",
    detalle: "Hacer plan del turno",
    estado: "1 activa",
    color: "#3B82F6",
    icono: "persona",
  },
  {
    titulo: "Accesos",
    detalle: "Ingresos y egresos",
    estado: "1 hoy",
    color: "#F59E0B",
    icono: "llave",
  },
  {
    titulo: "Novedades",
    detalle: "Libro de guardia",
    estado: "Sin novedades",
    color: "#7C5CE6",
    icono: "doc",
  },
  {
    titulo: "Hombre vivo",
    detalle: "Confirmá el puesto",
    estado: "Sin marcas",
    color: "#EF4444",
    icono: "pulso",
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
  return null;
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

export function MenuInferior({ activo, onHome, onConfiguracion }) {
  const home = activo === "home";
  return (
    <View style={styles.barra}>
      <Pressable style={styles.tab} onPress={onHome} hitSlop={6}>
        <Icono nombre="casa" color={home ? "#2F6BFF" : "#9AA3B2"} />
        <Text style={[styles.tabTexto, home && styles.tabActivo]} numberOfLines={1}>
          Home
        </Text>
      </Pressable>
      <Pressable style={styles.tab} onPress={onConfiguracion} hitSlop={6}>
        <Icono nombre="ajuste" color={home ? "#9AA3B2" : "#2F6BFF"} />
        <Text style={[styles.tabTexto, !home && styles.tabActivo]} numberOfLines={1}>
          Configuración
        </Text>
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

  useEffect(() => {
    const token = usuario?.token;
    if (!token) return undefined;
    let vivo = true;
    flushRondaQueue()
      .catch(() => {})
      .then(() => rondasDelTurno(token))
      .then((data) => {
        if (!vivo || !data) return;
        const abiertas = (data.rondas || []).filter((item) => item?.estado !== "cerrada").length;
        setRondasActivas(abiertas);
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
    perfilDelVigilador(token)
      .then((data) => {
        if (!vivo || !data) return;
        const url = String(data?.perfil?.foto || data?.vigilador?.foto || "").trim();
        setFoto(url);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [usuario?.token]);

  const estadoDe = (item) => {
    if (item.titulo === "Rondas") {
      if (rondasActivas == null) return "…";
      if (rondasActivas === 1) return "1 activa";
      if (rondasActivas > 1) return `${rondasActivas} activas`;
      return "Sin activas";
    }
    if (item.titulo === "Asignaciones") {
      if (tareasCount == null) return "…";
      if (tareasCount === 1) return "1 pendiente";
      if (tareasCount > 1) return `${tareasCount} pendientes`;
      return "Sin pendientes";
    }
    if (item.titulo === "Accesos") {
      if (accesosHoy == null) return "…";
      if (accesosHoy === 1) return "1 hoy";
      if (accesosHoy > 1) return `${accesosHoy} hoy`;
      return "0 hoy";
    }
    if (item.titulo === "Novedades") {
      if (novedadesCount == null) return "…";
      if (novedadesCount === 1) return "1 en el turno";
      if (novedadesCount > 1) return `${novedadesCount} en el turno`;
      return "Sin novedades";
    }
    return item.estado;
  };

  const abrirDe = (titulo) => {
    if (titulo === "Rondas") return onAbrirRondas;
    if (titulo === "Asignaciones") return onAbrirAsignaciones;
    if (titulo === "Accesos") return onAbrirAccesos;
    if (titulo === "Novedades") return onAbrirNovedades;
    return null;
  };
  return (
    <View style={styles.fondo}>
      <Text style={styles.titulo}>Vigilantes</Text>

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
          <View style={styles.perfilAcciones}>
            <View style={styles.on}>
              <View style={styles.onPunto} />
              <Text style={styles.onTexto}>ON</Text>
            </View>
            <Pressable onPress={onSalir} disabled={saliendo} style={styles.salir} hitSlop={6}>
              <Text style={styles.salirTexto}>{saliendo ? "..." : "Salir"}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.objetivo}>
          <Icono nombre="escudo" color="#1FA971" />
          <View style={styles.objetivoTexto}>
            <Text style={styles.objetivoNombre}>Farmacia Central</Text>
            <Text style={styles.objetivoHora}>06:00-14:00</Text>
          </View>
          <View style={styles.programado}>
            <Text style={styles.programadoTexto}>PROGRAMADO</Text>
          </View>
        </View>

        <Text style={styles.seccion}>Mi escritorio</Text>
        <View style={styles.grilla}>
          {TARJETAS.map((item) => {
            const cuerpo = (
              <>
                <Icono nombre={item.icono} color={item.color} />
                <Text style={styles.tarjetaTitulo}>{item.titulo}</Text>
                <Text style={styles.tarjetaDetalle}>{item.detalle}</Text>
                <Text style={[styles.tarjetaEstado, { color: item.color }]}>{estadoDe(item)}</Text>
              </>
            );
            const abrir = abrirDe(item.titulo);
            if (!abrir) {
              return (
                <View key={item.titulo} style={styles.tarjeta}>
                  {cuerpo}
                </View>
              );
            }
            return (
              <Pressable key={item.titulo} style={styles.tarjeta} onPress={abrir}>
                {cuerpo}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.emergencia}>
          <Text style={styles.emergenciaTexto}>ENVIAR EMERGENCIA</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: "#F5F6F8",
  },
  titulo: {
    textAlign: "center",
    color: "#1A1D2E",
    fontSize: 20,
    fontWeight: "800",
    paddingBottom: 6,
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
    backgroundColor: "#2E3A66",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#C4A484",
    overflow: "hidden",
    alignItems: "center",
  },
  avatarCabeza: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#8C6239",
    marginTop: 10,
  },
  avatarCuerpo: {
    width: 32,
    height: 22,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: "#8C6239",
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
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  documento: {
    marginTop: 2,
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "500",
  },
  perfilAcciones: {
    alignItems: "flex-end",
    gap: 8,
  },
  on: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#243056",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  onPunto: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#3DDC97",
  },
  onTexto: {
    color: "#3DDC97",
    fontSize: 11,
    fontWeight: "800",
  },
  salir: {
    backgroundColor: "#EEF1F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  salirTexto: {
    color: "#2A3148",
    fontSize: 13,
    fontWeight: "700",
  },
  objetivo: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#1A2744",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  objetivoTexto: {
    flex: 1,
  },
  objetivoNombre: {
    color: "#1C2434",
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
    backgroundColor: "#E7F8EE",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  programadoTexto: {
    color: "#1F9D55",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  seccion: {
    marginTop: 10,
    marginBottom: 6,
    color: "#1C2434",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    shadowColor: "#1A2744",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  tarjetaTitulo: {
    marginTop: 6,
    color: "#1C2434",
    fontSize: 14,
    fontWeight: "800",
  },
  tarjetaDetalle: {
    marginTop: 2,
    color: "#8B93A7",
    fontSize: 12,
  },
  tarjetaEstado: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
  },
  emergencia: {
    marginTop: 10,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#F04438",
    alignItems: "center",
    justifyContent: "center",
  },
  emergenciaTexto: {
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
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEF0F4",
    paddingTop: 8,
    paddingBottom: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
  },
  tabTexto: {
    color: "#9AA3B2",
    fontSize: 11,
    fontWeight: "600",
  },
  tabActivo: {
    color: "#2F6BFF",
    fontWeight: "700",
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
  ajustePunto: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
  },
});
