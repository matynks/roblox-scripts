/**
 * Expo config plugin: sign release builds with your own upload key.
 *
 * The keystore path and passwords are read from ENVIRONMENT VARIABLES at build
 * time and are never written to the repository:
 *   BLOXYBOX_UPLOAD_STORE_FILE      absolute path to the .jks/.keystore file
 *   BLOXYBOX_UPLOAD_STORE_PASSWORD
 *   BLOXYBOX_UPLOAD_KEY_ALIAS
 *   BLOXYBOX_UPLOAD_KEY_PASSWORD
 *
 * If BLOXYBOX_UPLOAD_STORE_FILE is not set, release builds fall back to the
 * debug key (fine for local testing, NOT for distribution). EAS Build manages
 * its own keystore and does not need this.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// bloxybox-release-signing';

function addReleaseSigning(contents) {
  if (contents.includes(MARKER)) return contents;

  const signingBlock = `
        release { ${MARKER}
            def storePath = System.getenv('BLOXYBOX_UPLOAD_STORE_FILE')
            if (storePath) {
                storeFile file(storePath)
                storePassword System.getenv('BLOXYBOX_UPLOAD_STORE_PASSWORD')
                keyAlias System.getenv('BLOXYBOX_UPLOAD_KEY_ALIAS')
                keyPassword System.getenv('BLOXYBOX_UPLOAD_KEY_PASSWORD')
            }
        }`;

  const debugSigning = /(signingConfigs\s*\{\s*debug\s*\{[^}]*\})/m;
  if (!debugSigning.test(contents)) {
    throw new Error('withReleaseSigning: could not find signingConfigs.debug in app/build.gradle');
  }
  let next = contents.replace(debugSigning, `$1${signingBlock}`);

  const releaseUsesDebug = /(release\s*\{[^{}]*?)signingConfig signingConfigs\.debug/m;
  if (!releaseUsesDebug.test(next)) {
    throw new Error('withReleaseSigning: could not find the release buildType signingConfig');
  }
  next = next.replace(
    releaseUsesDebug,
    "$1signingConfig System.getenv('BLOXYBOX_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
  );
  return next;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withReleaseSigning: only Groovy build.gradle is supported');
    }
    cfg.modResults.contents = addReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};

module.exports.addReleaseSigning = addReleaseSigning;
