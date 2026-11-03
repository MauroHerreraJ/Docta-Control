package com.pedrodarrigo.x5_DoctaControl

import android.app.ActivityOptions
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.ExpoFirebaseMessagingService

/**
 * Nivel 2: con permiso de pantalla completa (o overlay) abre Acá estoy
 * sin que el vigilador navegue por la app.
 */
class AvisoFirebaseService : ExpoFirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    val tipo = remoteMessage.data["tipo"]
    val cartel = tipo == "aviso-panel" || tipo == "hombre_vivo"
    if (!cartel || MainActivity.enPantalla) {
      super.onMessageReceived(remoteMessage)
      return
    }
    try {
      AlarmaSonora.sonar(this)
    } catch (_: Exception) {
      /* ignore */
    }
    try {
      abrirPantalla(remoteMessage.data)
    } catch (_: Exception) {
      // Un aviso no puede cerrar la app.
    }
  }

  private fun puedePantallaCompleta(manager: NotificationManager): Boolean {
    return if (Build.VERSION.SDK_INT >= 34) {
      manager.canUseFullScreenIntent()
    } else {
      true
    }
  }

  private fun asegurarCanal(manager: NotificationManager) {
    if (Build.VERSION.SDK_INT < 26) return
    if (manager.getNotificationChannel(CANAL) != null) return
    val channel = NotificationChannel(
      CANAL,
      "Avisos críticos DoctaControl",
      NotificationManager.IMPORTANCE_MAX,
    ).apply {
      description = "Alertas de Hombre Vivo y avisos del panel"
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 700, 180, 700, 180, 1100)
      lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
      setSound(
        null,
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build(),
      )
    }
    manager.createNotificationChannel(channel)
  }

  private fun abrirPantalla(data: Map<String, String>) {
    val tipo = Uri.encode(data["tipo"] ?: "")
    val id = Uri.encode(data["id"] ?: "")
    val programa = Uri.encode(data["programaId"] ?: "")
    val intent = Intent(this, MainActivity::class.java).apply {
      action = Intent.ACTION_VIEW
      this.data = Uri.parse("docta5://aca-estoy?tipo=$tipo&id=$id&programaId=$programa")
      putExtra(MainActivity.EXTRA_TIPO, data["tipo"])
      putExtra(MainActivity.EXTRA_ID, data["id"])
      putExtra(MainActivity.EXTRA_PROGRAMA, data["programaId"])
      addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_SINGLE_TOP or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_REORDER_TO_FRONT,
      )
    }
    val opciones = if (Build.VERSION.SDK_INT >= 34) {
      ActivityOptions.makeBasic().apply {
        setPendingIntentCreatorBackgroundActivityStartMode(
          ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED,
        )
      }.toBundle()
    } else {
      null
    }
    val aviso = PendingIntent.getActivity(
      this,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      opciones,
    )
    val manager = getSystemService(NotificationManager::class.java) ?: return
    asegurarCanal(manager)
    val titulo = data["title"]?.takeIf { it.isNotBlank() } ?: "DoctaControl"
    val cuerpo = data["message"]?.takeIf { it.isNotBlank() } ?: "ACÁ ESTOY"
    val fsi = puedePantallaCompleta(manager)
    val notif = NotificationCompat.Builder(this, CANAL)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(titulo)
      .setContentText(cuerpo)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setContentIntent(aviso)
      .setFullScreenIntent(aviso, fsi)
      .build()

    // Siempre publica: en pantalla bloqueada Android usa fullScreenIntent si está permitido.
    if (NotificationManagerCompat.from(this).areNotificationsEnabled()) {
      manager.notify(AVISO_ID, notif)
    }

    val overlay = Settings.canDrawOverlays(this)
    if (overlay || fsi) {
      try {
        startActivity(intent)
      } catch (_: Exception) {
        // Queda la notificación de pantalla completa / heads-up.
      }
    }
  }

  companion object {
    const val AVISO_ID = 7041
    const val CANAL = "aviso-alarma-v2"
  }
}
