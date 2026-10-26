import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CLAVE = "@docta5_terminos";

const SECCIONES = [
  {
    titulo: "Términos y condiciones de uso",
    texto:
      "Es necesario, para la configuración y uso de esta aplicación, que lea y acepte los términos y condiciones que a continuación se detallan. Al marcar la casilla de aceptación usted presta su consentimiento libre, expreso e informado para el tratamiento de sus datos personales, en particular su ubicación geográfica, en los términos descriptos en este documento (Ley 25.326, art. 5°).",
  },
  {
    titulo: "Docta",
    texto:
      "Es una aplicación destinada al trabajo del vigilador en campo. Mientras la sesión está abierta envía la ubicación del teléfono hacia la central de monitoreo de Desit SA, con la única finalidad de verificar y registrar el servicio de vigilancia, para el control y la seguridad de ese servicio.",
  },
  {
    titulo: "Condiciones previas para el correcto funcionamiento",
    texto:
      "Para usar Docta usted deberá contar con el permiso del organismo que opera el sistema de monitoreo de Desit SA. La aplicación funciona en conjunto con ese sistema y requiere un usuario autorizado.",
  },
  {
    titulo: "Configuración inicial",
    texto:
      "En el primer uso deberá ingresar usuario y clave del panel. La aplicación puede solicitar permisos de ubicación (también con la pantalla apagada), notificaciones, cámara, micrófono y biometría. Si no acepta la ubicación, el seguimiento del servicio no funcionará.",
  },
  {
    titulo: "Uso y cuidados",
    texto:
      "Con la sesión abierta, Docta envía periódicamente su posición, hora de captura y datos del dispositivo a la central, incluso con la pantalla apagada. Debe contar con GPS encendido y servicio de internet o datos. El uso es exclusivo del personal autorizado durante su jornada. Al cerrar sesión, la aplicación deja de enviar su ubicación.",
  },
  {
    titulo: "Formas de envío",
    texto:
      "La ubicación, las rondas, los accesos, las novedades y las alertas se envían vía Internet hacia los servidores de Desit SA.",
  },
  {
    titulo: "Costos",
    texto:
      "El uso de datos corre por el servicio de telefonía o paquete que usted tenga contratado, según la tarifa vigente de su proveedor.",
  },
  {
    titulo: "Responsabilidades",
    texto:
      "Desit SA no se hace responsable por fallas ocasionadas por causas ajenas al funcionamiento de la APP, incluyendo falta de señal, GPS apagado, batería agotada o interrupciones del proveedor de datos.",
  },
  {
    titulo: "Política de privacidad",
    texto:
      "La presente Política de Privacidad establece los términos en que Desit SA usa y protege la información que se genera al utilizar Docta, en cumplimiento de la Ley 25.326 de Protección de Datos Personales y las guías de la Agencia de Acceso a la Información Pública (AAIP), órgano de control de dicha ley. Esta política puede cambiar; le recomendamos revisarla después de cada actualización.",
  },
  {
    titulo: "Información recogida",
    texto:
      "Con la sesión abierta se registran ubicación, fecha y hora, usuario y datos técnicos del teléfono necesarios para el monitoreo. Solo se recolectan los datos adecuados, pertinentes y no excesivos para la finalidad indicada en esta política.",
  },
  {
    titulo: "Uso de la información recogida",
    texto:
      "La información se usa exclusivamente para el seguimiento del servicio, las rondas, las alertas operativas y los informes al organismo de control, tal como fue informado. No se utiliza para ninguna finalidad distinta a la aquí descripta.",
  },
  {
    titulo: "Conservación y eliminación de los datos",
    texto:
      "Los datos de ubicación se conservan únicamente durante el tiempo necesario para cumplir la finalidad para la que fueron recolectados y para las obligaciones legales o contractuales del servicio de vigilancia. Vencido ese plazo, o cuando dejen de ser necesarios, los datos serán eliminados o anonimizados.",
  },
  {
    titulo: "Divulgación a terceros",
    texto:
      "Desit SA no comparte la información del servicio con terceros ajenos al organismo que opera el sistema, salvo obligación legal.",
  },
  {
    titulo: "Seguridad de la información",
    texto:
      "Desit SA adopta medidas técnicas y organizativas para proteger los datos contra acceso no autorizado, pérdida o alteración. El acceso está restringido al personal y organismos autorizados; no existen vías de consulta abiertas al público.",
  },
  {
    titulo: "Derechos del titular de los datos",
    texto:
      "De acuerdo con la Ley 25.326, usted tiene derecho a acceder, rectificar, actualizar y, cuando corresponda, solicitar la supresión de sus datos personales. Para ejercer estos derechos puede contactarse con Desit SA. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan en relación al incumplimiento de las normas sobre protección de datos personales.",
  },
  {
    titulo: "Control de su información personal",
    texto:
      "El usuario presta su consentimiento a estas condiciones al marcar la casilla y continuar. Los datos del servicio se resguardan en el servidor de Desit con el fin de operar y auditar el servicio, dentro de los plazos indicados más arriba.",
  },
  {
    titulo:
      "Desit SA se reserva el derecho de cambiar los términos de la presente Política de Privacidad en cualquier momento",
    texto: "",
  },
];

export async function terminosYaAceptados() {
  return (await AsyncStorage.getItem(CLAVE).catch(() => null)) === "1";
}

export async function guardarTerminos() {
  await AsyncStorage.setItem(CLAVE, "1");
}

export default function Terminos({ onAceptar }) {
  const [marcado, setMarcado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const continuar = async () => {
    if (!marcado || guardando) return;
    setGuardando(true);
    try {
      await guardarTerminos();
      onAceptar();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.fondo}>
      <Text style={styles.marca}>Docta</Text>
      <Text style={styles.empresa}>Desit SA</Text>
      <ScrollView style={styles.lista} contentContainerStyle={styles.listaContenido}>
        {SECCIONES.map((seccion) => (
          <View key={seccion.titulo}>
            <Text style={styles.titulo}>{seccion.titulo}</Text>
            {seccion.texto ? <Text style={styles.texto}>{seccion.texto}</Text> : null}
          </View>
        ))}
      </ScrollView>
      <Pressable onPress={() => setMarcado((v) => !v)} style={styles.fila} hitSlop={8}>
        <View style={[styles.caja, marcado && styles.cajaOn]}>
          {marcado ? <Text style={styles.tilde}>✓</Text> : null}
        </View>
        <Text style={styles.leyenda}>Aceptar términos y condiciones</Text>
      </Pressable>
      <Pressable
        onPress={continuar}
        disabled={!marcado || guardando}
        style={[styles.boton, (!marcado || guardando) && styles.botonOff]}
      >
        <Text style={styles.botonTexto}>CONTINUAR</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
  },
  marca: {
    textAlign: "center",
    color: "#0F76C4",
    fontSize: 28,
    fontWeight: "800",
  },
  empresa: {
    textAlign: "center",
    color: "#138FEF",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  lista: {
    flex: 1,
  },
  listaContenido: {
    paddingBottom: 12,
  },
  titulo: {
    marginTop: 14,
    color: "#0F76C4",
    fontSize: 15,
    fontWeight: "800",
  },
  texto: {
    marginTop: 4,
    color: "#1A3E5C",
    fontSize: 14,
    lineHeight: 20,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  caja: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: "#138FEF",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#ffffff",
  },
  cajaOn: {
    backgroundColor: "#138FEF",
  },
  tilde: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  leyenda: {
    flex: 1,
    color: "#0F76C4",
    fontSize: 16,
    fontWeight: "700",
  },
  boton: {
    marginBottom: 8,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: "#0F76C4",
    alignItems: "center",
    justifyContent: "center",
  },
  botonOff: {
    backgroundColor: "#9FDFFC",
  },
  botonTexto: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
});
