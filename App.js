import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Platform, StatusBar as RNStatusBar, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Configuracion from "./screen/Configuracion";
import Login from "./screen/Login";
import Principal from "./screen/Principal";
import { iniciarConexion, pararConexion, suscribirDiagnostico } from "./util/fondo";
import { activarPush } from "./util/push";
import {
  restaurarSesion,
  salirVigilador,
  verificarSesion,
} from "./util/sesion";

const ARRIBA = Platform.OS === "android" ? RNStatusBar.currentHeight || 24 : 54;

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [lista, setLista] = useState(true);
  const [saliendo, setSaliendo] = useState(false);
  const [enFondo, setEnFondo] = useState(false);
  const [diag, setDiag] = useState(null);
  const [pagina, setPagina] = useState("principal");
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
      if (siguiente === "active" && sesionViva.current) iniciarConexion(token).catch(() => {});
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
    const token = usuario?.token;
    await pararConexion();
    setUsuario(null);
    await salirVigilador(token);
    setSaliendo(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F4FBFE", paddingTop: ARRIBA }}>
      <StatusBar style="dark" />
      {lista ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#0F76C4" />
        </View>
      ) : usuario ? (
        pagina === "configuracion" ? (
          <Configuracion
            usuario={usuario}
            onSalir={salir}
            saliendo={saliendo}
            enFondo={enFondo}
            diag={diag}
            onVolver={() => setPagina("principal")}
          />
        ) : (
          <Principal
            onSalir={salir}
            saliendo={saliendo}
            onConfiguracion={() => setPagina("configuracion")}
          />
        )
      ) : (
        <Login onIngresar={setUsuario} />
      )}
    </View>
  );
}
