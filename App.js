import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Dimensions, Keyboard, Platform, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useMarco } from "./util/medida";
import AvisoPush from "./screen/AvisoPush";
import Configuracion from "./screen/Configuracion";
import Login from "./screen/Login";
import Accesos from "./screen/Accesos";
import Asignaciones from "./screen/Asignaciones";
import Novedades from "./screen/Novedades";
import Principal, { MenuInferior } from "./screen/Principal";
import RondaRecorrido from "./screen/RondaRecorrido";
import Rondas from "./screen/Rondas";
import { iniciarConexion, pararConexion, suscribirDiagnostico } from "./util/fondo";
import { activarPush, cerrarAviso, olvidarPush, revisarAvisoAlVolver } from "./util/push";
import {
  restaurarSesion,
  salirVigilador,
  verificarSesion,
} from "./util/sesion";

function altoDelTeclado(evento) {
  const alto = Number(evento?.endCoordinates?.height);
  const techo = Number(evento?.endCoordinates?.screenY);
  const pantalla = Dimensions.get("screen").height;
  const porTecho = Number.isFinite(techo) ? pantalla - techo : 0;
  const porAlto = Number.isFinite(alto) ? alto : 0;
  return Math.max(0, Math.round(Math.max(porAlto, porTecho)));
}

export default function App() {
  const { arriba, abajo } = useMarco();
  const [teclado, setTeclado] = useState(0);
  const [usuario, setUsuario] = useState(null);
  const [lista, setLista] = useState(true);
  const [saliendo, setSaliendo] = useState(false);
  const [enFondo, setEnFondo] = useState(false);
  const [diag, setDiag] = useState(null);
  const [pagina, setPagina] = useState("principal");
  const [rondaId, setRondaId] = useState(null);
  const sesionViva = useRef(false);

  useEffect(() => {
    let vivo = true;
    restaurarSesion().then(async (data) => {
      if (!vivo) return;
      if (!data?.token) {
        setLista(false);
        return;
      }
      try {
        const perfil = await verificarSesion(data.token);
        if (!vivo) return;
        if (String(perfil?.role || "").toLowerCase() !== "vigilador") {
          await salirVigilador(data.token);
          setUsuario(null);
        } else {
          setUsuario({ ...data, ...perfil, token: data.token });
        }
      } catch {
        setUsuario(data);
      } finally {
        if (vivo) setLista(false);
      }
    });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    const mostrar = (evento) => setTeclado(altoDelTeclado(evento));
    const ocultar = () => setTeclado(0);
    const alAbrir = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", mostrar);
    const alCerrar = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", ocultar);
    return () => {
      alAbrir.remove();
      alCerrar.remove();
    };
  }, []);

  useEffect(() => {
    const token = usuario?.token;
    if (!token) return undefined;
    sesionViva.current = true;
    let vivo = true;
    iniciarConexion(token)
      .then((ok) => {
        if (vivo) setEnFondo(Boolean(ok));
      })
      .catch(() => {
        if (vivo) setEnFondo(false);
      });
    activarPush(token).catch(() => {});
    const off = suscribirDiagnostico((dato) => {
      if (!vivo) return;
      setDiag(dato);
      setEnFondo(dato.servicio === "activo");
    });
    const estado = AppState.addEventListener("change", (siguiente) => {
      if (siguiente === "active" && sesionViva.current) {
        iniciarConexion(token).catch(() => {});
        revisarAvisoAlVolver().catch(() => {});
      }
    });
    return () => {
      vivo = false;
      sesionViva.current = false;
      off();
      estado.remove();
    };
  }, [usuario?.token]);

  const salir = async () => {
    if (saliendo) return;
    setSaliendo(true);
    sesionViva.current = false;
    setPagina("principal");
    setRondaId(null);
    cerrarAviso();
    olvidarPush();
    const token = usuario?.token;
    await pararConexion();
    setUsuario(null);
    await salirVigilador(token);
    setSaliendo(false);
  };

  return (
    <View
      style={{
        flex: 1,
        overflow: "hidden",
        backgroundColor: usuario ? "#F5F6F8" : "#F4FBFE",
        paddingTop: arriba,
        paddingBottom: teclado > 0 ? teclado : abajo,
      }}
    >
      <StatusBar style="dark" />
      {lista ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#0F76C4" />
        </View>
      ) : usuario ? (
        <View style={{ flex: 1 }}>
          {pagina === "configuracion" ? (
            <Configuracion
              usuario={usuario}
              onSalir={salir}
              saliendo={saliendo}
              enFondo={enFondo}
              diag={diag}
              onVolver={() => setPagina("principal")}
            />
          ) : pagina === "asignaciones" ? (
            <Asignaciones token={usuario.token} onVolver={() => setPagina("principal")} />
          ) : pagina === "accesos" ? (
            <Accesos token={usuario.token} onVolver={() => setPagina("principal")} />
          ) : pagina === "novedades" ? (
            <Novedades token={usuario.token} onVolver={() => setPagina("principal")} />
          ) : pagina === "rondas" && rondaId ? (
            <RondaRecorrido
              token={usuario.token}
              rondaId={rondaId}
              onVolver={() => setRondaId(null)}
            />
          ) : pagina === "rondas" ? (
            <Rondas
              token={usuario.token}
              onVolver={() => setPagina("principal")}
              onAbrir={(id) => setRondaId(id)}
            />
          ) : (
            <Principal
              usuario={usuario}
              onSalir={salir}
              saliendo={saliendo}
              onAbrirRondas={() => {
                setRondaId(null);
                setPagina("rondas");
              }}
              onAbrirAsignaciones={() => setPagina("asignaciones")}
              onAbrirAccesos={() => setPagina("accesos")}
              onAbrirNovedades={() => setPagina("novedades")}
            />
          )}
          {pagina === "principal" || pagina === "configuracion" ? (
            <MenuInferior
              activo={pagina === "configuracion" ? "configuracion" : "home"}
              onHome={() => {
                setRondaId(null);
                setPagina("principal");
              }}
              onConfiguracion={() => setPagina("configuracion")}
            />
          ) : null}
          <AvisoPush />
        </View>
      ) : (
        <Login onIngresar={setUsuario} />
      )}
    </View>
  );
}
