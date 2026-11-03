const {
  withDangerousMod,
  withMainApplication,
  withAndroidManifest,
  AndroidConfig,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PKG_PATH = "com/pedrodarrigo/x5_DoctaControl";
const NATIVE_FILES = [
  "AlarmaSonora.kt",
  "OverlayModule.kt",
  "OverlayPackage.kt",
  "AvisoFirebaseService.kt",
];

function copyNativeSources(projectRoot, platformRoot) {
  const srcDir = path.join(projectRoot, "native", "android");
  const destDir = path.join(platformRoot, "app", "src", "main", "java", PKG_PATH);
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of NATIVE_FILES) {
    const from = path.join(srcDir, file);
    if (!fs.existsSync(from)) continue;
    fs.copyFileSync(from, path.join(destDir, file));
  }
}

function withDoctaSources(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      copyNativeSources(cfg.modRequest.projectRoot, cfg.modRequest.platformProjectRoot);
      return cfg;
    },
  ]);
}

function withOverlayPackage(config) {
  return withMainApplication(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (!contents.includes("OverlayPackage()")) {
      if (/PackageList\(this\)\.packages\.apply\s*\{/.test(contents)) {
        contents = contents.replace(
          /PackageList\(this\)\.packages\.apply\s*\{/,
          "PackageList(this).packages.apply {\n          add(OverlayPackage())",
        );
      } else if (/PackageList\(this\)\.packages/.test(contents)) {
        contents = contents.replace(
          /PackageList\(this\)\.packages/,
          "PackageList(this).packages.apply { add(OverlayPackage()) }",
        );
      }
    }
    cfg.modResults.contents = contents;
    return cfg;
  });
}

function withAlarmaManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    const services = app.service || [];

    const upsert = (name, attrs, extra = {}) => {
      const idx = services.findIndex((s) => s.$?.["android:name"] === name);
      const entry = { $: { "android:name": name, ...attrs }, ...extra };
      if (idx >= 0) services[idx] = { ...services[idx], ...entry, $: { ...services[idx].$, ...attrs, "android:name": name } };
      else services.push(entry);
    };

    upsert(
      ".AvisoFirebaseService",
      { "android:exported": "false" },
      {
        "intent-filter": [
          { action: [{ $: { "android:name": "com.google.firebase.MESSAGING_EVENT" } }] },
        ],
      },
    );
    upsert("expo.modules.notifications.service.ExpoFirebaseMessagingService", {
      "tools:node": "remove",
    });

    app.service = services;

    const activity = (app.activity || []).find((a) => a.$?.["android:name"] === ".MainActivity");
    if (activity?.$) {
      activity.$["android:showWhenLocked"] = "true";
      activity.$["android:turnScreenOn"] = "true";
    }
    return cfg;
  });
}

/**
 * DoctaOverlay + AlarmaSonora versionados en native/android
 * (porque /android está en .gitignore).
 */
function withDoctaOverlay(config) {
  config = AndroidConfig.Permissions.withPermissions(config, [
    "android.permission.WAKE_LOCK",
    "android.permission.VIBRATE",
    "android.permission.USE_FULL_SCREEN_INTENT",
    "android.permission.SYSTEM_ALERT_WINDOW",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
  ]);
  config = withDoctaSources(config);
  config = withOverlayPackage(config);
  config = withAlarmaManifest(config);
  return config;
}

module.exports = withDoctaOverlay;
