#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const androidRoot = path.join(__dirname, '../android');
const splashSrc = path.join(__dirname, '../assets/images/splash.png');
if (!fs.existsSync(androidRoot) || !fs.existsSync(splashSrc)) process.exit(0);

const resRoot = path.join(androidRoot, 'app/src/main/res');
for (const ent of fs.readdirSync(resRoot)) {
  if (!ent.startsWith('drawable')) continue;
  const p = path.join(resRoot, ent, 'splashscreen_logo.png');
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

const nodpiDir = path.join(resRoot, 'drawable-nodpi');
fs.mkdirSync(nodpiDir, { recursive: true });
fs.copyFileSync(splashSrc, path.join(nodpiDir, 'splashscreen_full.png'));

const drawableDir = path.join(resRoot, 'drawable');
fs.mkdirSync(drawableDir, { recursive: true });

fs.writeFileSync(
  path.join(drawableDir, 'ic_launcher_background.xml'),
  `<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item>
    <bitmap android:gravity="fill" android:src="@drawable/splashscreen_full"/>
  </item>
</layer-list>
`,
);

fs.writeFileSync(
  path.join(drawableDir, 'splashscreen_transparent_icon.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <size android:width="1dp" android:height="1dp"/>
  <solid android:color="@android:color/transparent"/>
</shape>
`,
);

const stylesPath = path.join(resRoot, 'values/styles.xml');
if (fs.existsSync(stylesPath)) {
  let styles = fs.readFileSync(stylesPath, 'utf8');
  styles = styles.replace(
    /<style name="Theme\.App\.SplashScreen"[\s\S]*?<\/style>/,
    `  <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">
    <item name="android:windowBackground">@drawable/ic_launcher_background</item>
    <item name="windowSplashScreenBackground">@color/splashscreen_background</item>
    <item name="windowSplashScreenAnimatedIcon">@drawable/splashscreen_transparent_icon</item>
    <item name="windowSplashScreenIconBackgroundColor">@color/splashscreen_background</item>
    <item name="postSplashScreenTheme">@style/AppTheme</item>
  </style>`,
  );
  styles = styles.replace(
    /<item name="android:windowBackground">@drawable\/ic_launcher_background<\/item>\s*/g,
    '',
  );
  if (!/name="AppTheme"[\s\S]*?android:windowBackground/.test(styles)) {
    styles = styles.replace(
      /(<style name="AppTheme"[^>]*>[\s\S]*?)(<\/style>)/,
      '$1    <item name="android:windowBackground">@color/splashscreen_background</item>\n$2',
    );
  }
  fs.writeFileSync(stylesPath, styles);
}

const mainActivity = path.join(
  androidRoot,
  'app/src/main/java/com/anonymous/studentapp/MainActivity.kt',
);
if (fs.existsSync(mainActivity)) {
  let kt = fs.readFileSync(mainActivity, 'utf8');
  kt = kt.replace(
    / *\/\/ @generated begin expo-splashscreen[\s\S]*?\/\/ @generated end expo-splashscreen\n/,
    '',
  );
  if (!kt.includes('import expo.modules.splashscreen.SplashScreenManager')) {
    kt = kt.replace(
      /(import expo\.modules\.ReactActivityDelegateWrapper\n)/,
      '$1import expo.modules.splashscreen.SplashScreenManager\n',
    );
  }
  if (!kt.includes('SplashScreenManager.registerOnActivity')) {
    kt = kt.replace(/super\.onCreate\(null\)/, '    SplashScreenManager.registerOnActivity(this)\n    super.onCreate(null)');
  }
  fs.writeFileSync(mainActivity, kt);
}

console.log('Android splash: no system circle icon, fullscreen only');
