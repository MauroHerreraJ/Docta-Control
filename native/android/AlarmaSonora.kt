package com.pedrodarrigo.x5_DoctaControl

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/**
 * Alarma nativa continua: no depende de setInterval de JS.
 * WakeLock + MediaPlayer en loop + vibración hasta callar().
 */
object AlarmaSonora {
  private const val PREFS = "docta5_alarma"
  private const val KEY_VOLUMEN = "volumen"
  private const val KEY_TIPO = "tipo"
  private const val KEY_TOPE = "tope_ms"
  private const val KEY_VIBRA = "vibra"
  /** Tope de seguridad si nadie toca Acá estoy (5 min). */
  private const val SEGURIDAD_MS = 5 * 60 * 1000L

  private val main = Handler(Looper.getMainLooper())
  private var player: MediaPlayer? = null
  private var volumenPrevio: Int? = null
  private var appContext: Context? = null
  private var activo = false
  private var wakeLock: PowerManager.WakeLock? = null

  private val corteSeguridad: Runnable = Runnable {
    val ctx = appContext ?: return@Runnable
    cortar(ctx)
  }

  /** Reinicia el player si Android lo corta con la pantalla apagada. */
  private val vigilante: Runnable = object : Runnable {
    override fun run() {
      if (!activo) return
      val ctx = appContext ?: return
      val p = player
      if (p == null || !p.isPlaying) {
        arrancarPlayer(ctx, leerConfig(ctx))
      }
      if (activo) main.postDelayed(this, 2_000L)
    }
  }

  data class Config(
    val volumen: Int = 100,
    val tipo: String = "alarm",
    val topeMs: Long = 12_000L,
    val vibra: String = "alta",
  )

  fun leerConfig(context: Context): Config {
    val p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    return Config(
      volumen = p.getInt(KEY_VOLUMEN, 100).coerceIn(0, 100),
      tipo = p.getString(KEY_TIPO, "alarm") ?: "alarm",
      topeMs = p.getLong(KEY_TOPE, 12_000L).coerceIn(3_000L, 60_000L),
      vibra = p.getString(KEY_VIBRA, "alta") ?: "alta",
    )
  }

  fun guardarConfig(context: Context, volumen: Int, tipo: String, topeMs: Long, vibra: String) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putInt(KEY_VOLUMEN, volumen.coerceIn(0, 100))
      .putString(KEY_TIPO, tipo)
      .putLong(KEY_TOPE, topeMs.coerceIn(3_000L, 60_000L))
      .putString(KEY_VIBRA, vibra)
      .apply()
  }

  fun sonar(context: Context) {
    val app = context.applicationContext
    main.post { empezar(app, prueba = false) }
  }

  fun probar(context: Context) {
    val app = context.applicationContext
    main.post { empezar(app, prueba = true) }
  }

  fun callar(context: Context) {
    val app = context.applicationContext
    main.post { cortar(app) }
  }

  fun estaActiva(): Boolean = activo

  private fun empezar(context: Context, prueba: Boolean) {
    try {
      val config = leerConfig(context)
      activo = true
      appContext = context
      main.removeCallbacks(corteSeguridad)
      main.removeCallbacks(vigilante)
      tomarWakeLock(context)

      val tope = if (prueba) 3_000L else SEGURIDAD_MS
      main.postDelayed(corteSeguridad, tope)

      if (config.tipo != "none" && config.volumen > 0) {
        aplicarVolumen(context, config.volumen)
        arrancarPlayer(context, config)
        main.postDelayed(vigilante, 2_000L)
      }

      vibrar(context, config.vibra)
    } catch (_: Exception) {
      activo = false
      soltarWakeLock()
    }
  }

  private fun tomarWakeLock(context: Context) {
    if (wakeLock?.isHeld == true) return
    val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    @Suppress("DEPRECATION")
    val wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Docta:Alarma")
    wl.setReferenceCounted(false)
    wl.acquire(SEGURIDAD_MS + 5_000L)
    wakeLock = wl
  }

  private fun soltarWakeLock() {
    runCatching {
      if (wakeLock?.isHeld == true) wakeLock?.release()
    }
    wakeLock = null
  }

  private fun arrancarPlayer(context: Context, config: Config) {
    detenerPlayer()
    val uri = uriDe(config.tipo) ?: return
    try {
      val mp = MediaPlayer().apply {
        setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build(),
        )
        setDataSource(context, uri)
        isLooping = true
        setVolume(1f, 1f)
        prepare()
        start()
      }
      player = mp
    } catch (_: Exception) {
      player = null
    }
  }

  private fun detenerPlayer() {
    runCatching {
      player?.stop()
      player?.release()
    }
    player = null
  }

  private fun uriDe(tipo: String): Uri? = when (tipo) {
    "ringtone" -> RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
    "notification" -> RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
    else -> RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
  }

  private fun aplicarVolumen(context: Context, pct: Int) {
    val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    if (volumenPrevio == null) volumenPrevio = audio.getStreamVolume(AudioManager.STREAM_ALARM)
    val maximo = audio.getStreamMaxVolume(AudioManager.STREAM_ALARM)
    val nivel = ((maximo * pct) / 100).coerceIn(0, maximo)
    runCatching { audio.setStreamVolume(AudioManager.STREAM_ALARM, nivel, 0) }
  }

  private fun vibrar(context: Context, nivel: String) {
    if (nivel == "off") return
    val motor = vibrador(context)
    val (patron, amplitudes) = when (nivel) {
      "baja" -> longArrayOf(0, 220, 420, 220) to intArrayOf(0, 60, 0, 60)
      "media" -> longArrayOf(0, 450, 220, 450, 220, 700) to intArrayOf(0, 140, 0, 140, 0, 160)
      else -> longArrayOf(0, 700, 180, 700, 180, 1100) to intArrayOf(0, 255, 0, 255, 0, 255)
    }
    if (Build.VERSION.SDK_INT >= 26) {
      motor.vibrate(VibrationEffect.createWaveform(patron, amplitudes, 0))
    } else {
      @Suppress("DEPRECATION")
      motor.vibrate(patron, 0)
    }
  }

  private fun vibrador(context: Context): Vibrator {
    return if (Build.VERSION.SDK_INT >= 31) {
      val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
      manager.defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }
  }

  private fun cortar(context: Context) {
    activo = false
    main.removeCallbacks(vigilante)
    main.removeCallbacks(corteSeguridad)
    detenerPlayer()
    vibrador(context).cancel()
    soltarWakeLock()
    val previo = volumenPrevio
    volumenPrevio = null
    if (previo != null) {
      val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      runCatching { audio.setStreamVolume(AudioManager.STREAM_ALARM, previo, 0) }
    }
  }
}
