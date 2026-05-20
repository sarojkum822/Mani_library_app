'use strict';

const fs = require('fs');
const path = require('path');
const {
  createRunOncePlugin,
  withDangerousMod,
  withMainActivity,
} = require('@expo/config-plugins');

const SPLASH_SRC = 'assets/images/splash.png';

const IC_LAUNCHER_BACKGROUND = `<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item>
    <bitmap android:gravity="fill" android:src="@drawable/splashscreen_full"/>
  </item>
</layer-list>
`;

const APP_THEME_WINDOW_BG = `    <item name="android:windowBackground">@color/splashscreen_background</item>
`;

const TRANSPARENT_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <size android:width="1dp" android:height="1dp"/>
  <solid android:color="@android:color/transparent"/>
</shape>
`;

const STYLES_SPLASH = `  <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">
    <item name="android:windowBackground">@drawable/ic_launcher_background</item>
    <item name="windowSplashScreenBackground">@color/splashscreen_background</item>
    <item name="windowSplashScreenAnimatedIcon">@drawable/splashscreen_transparent_icon</item>
    <item name="windowSplashScreenIconBackgroundColor">@color/splashscreen_background</item>
    <item name="postSplashScreenTheme">@style/AppTheme</item>
  </style>
`;

const MAIN_ACTIVITY_SPLASH = `    SplashScreenManager.registerOnActivity(this)
`;

function patchAppThemeWindowBackground(styles) {
  let next = styles.replace(
    /<item name="android:windowBackground">@drawable\/ic_launcher_background<\/item>\s*/g,
    '',
  );
  if (!/name="AppTheme"[\s\S]*?android:windowBackground/.test(next)) {
    next = next.replace(
      /(<style name="AppTheme"[^>]*>[\s\S]*?)(<\/style>)/,
      `$1${APP_THEME_WINDOW_BG}$2`,
    );
  }
  return next;
}

function removeCircularSplashIcons(androidRoot) {
  const resRoot = path.join(androidRoot, 'app/src/main/res');
  if (!fs.existsSync(resRoot)) return;
  for (const ent of fs.readdirSync(resRoot)) {
    if (!ent.startsWith('drawable')) continue;
    const p = path.join(resRoot, ent, 'splashscreen_logo.png');
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

/** Full-screen splash; Android 12 system circle uses transparent animated icon. */
function withAndroidFullscreenSplash(config) {
  config = withMainActivity(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (!contents.includes('import expo.modules.splashscreen.SplashScreenManager')) {
      contents = contents.replace(
        /(import expo\.modules\.ReactActivityDelegateWrapper\n)/,
        '$1import expo.modules.splashscreen.SplashScreenManager\n',
      );
    }
    contents = contents.replace(
      / *\/\/ @generated begin expo-splashscreen[\s\S]*?\/\/ @generated end expo-splashscreen\n/,
      '',
    );
    if (!contents.includes('SplashScreenManager.registerOnActivity')) {
      contents = contents.replace(
        /super\.onCreate\(null\)/,
        `${MAIN_ACTIVITY_SPLASH}    super.onCreate(null)`,
      );
    }
    return { ...cfg, modResults: { ...cfg.modResults, contents } };
  });

  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const androidRoot = cfg.modRequest.platformProjectRoot;
      const projectRoot = cfg.modRequest.projectRoot;
      const splashSrc = path.join(projectRoot, SPLASH_SRC);
      if (!fs.existsSync(splashSrc)) return cfg;

      removeCircularSplashIcons(androidRoot);

      const nodpiDir = path.join(androidRoot, 'app/src/main/res/drawable-nodpi');
      fs.mkdirSync(nodpiDir, { recursive: true });
      fs.copyFileSync(splashSrc, path.join(nodpiDir, 'splashscreen_full.png'));

      const drawableDir = path.join(androidRoot, 'app/src/main/res/drawable');
      fs.mkdirSync(drawableDir, { recursive: true });
      fs.writeFileSync(path.join(drawableDir, 'ic_launcher_background.xml'), IC_LAUNCHER_BACKGROUND);
      fs.writeFileSync(
        path.join(drawableDir, 'splashscreen_transparent_icon.xml'),
        TRANSPARENT_ICON_XML,
      );

      const stylesPath = path.join(androidRoot, 'app/src/main/res/values/styles.xml');
      if (fs.existsSync(stylesPath)) {
        let styles = fs.readFileSync(stylesPath, 'utf8');
        styles = styles.replace(
          /<style name="Theme\.App\.SplashScreen"[\s\S]*?<\/style>/,
          STYLES_SPLASH,
        );
        styles = patchAppThemeWindowBackground(styles);
        fs.writeFileSync(stylesPath, styles);
      }

      return cfg;
    },
  ]);
}

module.exports = createRunOncePlugin(
  withAndroidFullscreenSplash,
  'with-android-fullscreen-splash',
  '1.3.0',
);
