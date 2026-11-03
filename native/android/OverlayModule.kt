package com.pedrodarrigo.x5_DoctaControl

import android.app.NotificationManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class OverlayModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = NAME

  companion object {
    const val NAME = "DoctaOverlay"
  }

  @ReactMethod
  fun puede(promise: Promise) {
    promise.resolve(Settings.canDrawOverlays(reactApplicationContext))
  }

  @ReactMethod
  fun puedePantallaCompleta(promise: Promise) {
    if (Build.VERSION.SDK_INT < 34) {
      promise.resolve(true)
      return
    }
    val manager = reactApplicationContext.getSystemService(NotificationManager::class.java)
    promise.resolve(manager?.canUseFullScreenIntent() == true)
  }

  /**
   * Alarma continua nativa (WakeLock + MediaPlayer).
   * No usa Foreground Service: en targetSdk 36 tumba la app sin el permiso instalado.
   */
  @ReactMethod
  fun sonar() {
    try {
      AlarmaSonora.sonar(reactApplicationContext)
    } catch (_: Exception) {
      /* no tumbar la app */
    }
  }

  @ReactMethod
  fun probarAlarma() {
    try {
      AlarmaSonora.probar(reactApplicationContext)
    } catch (_: Exception) {
      /* ignore */
    }
  }

  @ReactMethod
  fun callar() {
    try {
      AlarmaSonora.callar(reactApplicationContext)
    } catch (_: Exception) {
      /* ignore */
    }
  }

  @ReactMethod
  fun cancelarAviso() {
    try {
      val manager = reactApplicationContext.getSystemService(NotificationManager::class.java)
      manager?.cancel(AvisoFirebaseService.AVISO_ID)
    } catch (_: Exception) {
      /* ignore */
    }
  }

  @ReactMethod
  fun guardarAlarmaConfig(volumen: Int, tipo: String, topeMs: Double, vibra: String, promise: Promise) {
    try {
      AlarmaSonora.guardarConfig(
        reactApplicationContext,
        volumen,
        tipo,
        topeMs.toLong(),
        vibra,
      )
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("alarma", e.message, e)
    }
  }

  @ReactMethod
  fun leerAlarmaConfig(promise: Promise) {
    try {
      val c = AlarmaSonora.leerConfig(reactApplicationContext)
      val map = Arguments.createMap()
      map.putInt("volumen", c.volumen)
      map.putString("tipo", c.tipo)
      map.putDouble("topeMs", c.topeMs.toDouble())
      map.putString("vibra", c.vibra)
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("alarma", e.message, e)
    }
  }

  @ReactMethod
  fun abrirAjustes() {
    try {
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${reactApplicationContext.packageName}"),
      ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactApplicationContext.startActivity(intent)
    } catch (_: Exception) {
      /* ignore */
    }
  }

  @ReactMethod
  fun pedirPantallaCompleta() {
    if (Build.VERSION.SDK_INT < 34) return
    try {
      val intent = Intent(
        Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
        Uri.parse("package:${reactApplicationContext.packageName}"),
      ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactApplicationContext.startActivity(intent)
    } catch (_: Exception) {
      /* ignore */
    }
  }
}
