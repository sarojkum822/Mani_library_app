'use strict';

const fs = require('fs');
const path = require('path');
const { createRunOncePlugin, withDangerousMod } = require('@expo/config-plugins');

/**
 * Roots with spaces or parentheses break Expo/RN Xcode phases that invoke paths via
 * unquoted `bash -l -c` or backticks. After prebuild, rewrite those snippets in project.pbxproj.
 */

const BACKTICK = '`';
const BUNDLE_OLD =
  BACKTICK +
  '\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'\\"' +
  BACKTICK;

const BUNDLE_FIX =
  'RN_XCODE_SH=$(\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'\\")\\n/bin/sh \\"$RN_XCODE_SH\\"\\n\\n';

function patchShellScripts(raw) {
  let s = raw;
  if (s.includes(BUNDLE_OLD) && !s.includes('RN_XCODE_SH=$(')) {
    s = s.split(BUNDLE_OLD).join(BUNDLE_FIX);
  }

  return s;
}

function withIosSpacesInProjectPath(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot;
      try {
        const entries = fs.readdirSync(iosRoot, { withFileTypes: true });
        for (const ent of entries) {
          if (!ent.isDirectory() || !ent.name.endsWith('.xcodeproj')) continue;
          const pbxproj = path.join(iosRoot, ent.name, 'project.pbxproj');
          if (!fs.existsSync(pbxproj)) continue;
          const before = fs.readFileSync(pbxproj, 'utf8');
          const after = patchShellScripts(before);
          if (after !== before) fs.writeFileSync(pbxproj, after, 'utf8');
        }
      } catch (_) {}
      return cfg;
    },
  ]);
}

module.exports = createRunOncePlugin(
  withIosSpacesInProjectPath,
  'with-ios-spaces-in-project-path',
  '1.0.0'
);
