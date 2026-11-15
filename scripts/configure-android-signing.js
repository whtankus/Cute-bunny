const fs = require('node:fs');
const path = require('node:path');

const gradlePath = path.join(process.cwd(), 'android', 'app', 'build.gradle');
if (!fs.existsSync(gradlePath)) {
  throw new Error('Android app Gradle file was not generated at android/app/build.gradle.');
}

const versionCode = Number(process.env.ANDROID_VERSION_CODE);
const versionName = process.env.ANDROID_VERSION_NAME;
const requiredEnv = [
  'ANDROID_KEYSTORE_PATH',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD'
];

for (const name of requiredEnv) {
  if (!process.env[name]) throw new Error('Missing required environment variable: ' + name);
}
if (!Number.isSafeInteger(versionCode) || versionCode < 1) {
  throw new Error('ANDROID_VERSION_CODE must be a positive integer.');
}
if (!versionName) throw new Error('ANDROID_VERSION_NAME is required.');

let gradle = fs.readFileSync(gradlePath, 'utf8');

function findBlock(source, name, fromIndex = 0) {
  const match = new RegExp('\\b' + name + '\\s*\\{').exec(source.slice(fromIndex));
  if (!match) return null;
  const open = fromIndex + match.index + match[0].lastIndexOf('{');
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) return { open, close: i };
    }
  }
  throw new Error('Unclosed Gradle block: ' + name);
}

const defaultConfig = findBlock(gradle, 'defaultConfig');
if (!defaultConfig) throw new Error('Could not locate defaultConfig in app/build.gradle.');
let defaults = gradle.slice(defaultConfig.open + 1, defaultConfig.close);
if (/\bversionCode\s+\d+/.test(defaults)) {
  defaults = defaults.replace(/\bversionCode\s+\d+/, 'versionCode ' + versionCode);
} else {
  defaults = '\n        versionCode ' + versionCode + defaults;
}
if (/\bversionName\s+["'][^"']*["']/.test(defaults)) {
  defaults = defaults.replace(/\bversionName\s+["'][^"']*["']/, 'versionName "' + versionName + '"');
} else {
  defaults += '\n        versionName "' + versionName + '"\n    ';
}
gradle = gradle.slice(0, defaultConfig.open + 1) + defaults + gradle.slice(defaultConfig.close);

if (!/\bsigningConfigs\s*\{/.test(gradle)) {
  const android = findBlock(gradle, 'android');
  if (!android) throw new Error('Could not locate android block in app/build.gradle.');
  const signing = [
    '',
    '    signingConfigs {',
    '        release {',
    '            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))',
    '            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")',
    '            keyAlias System.getenv("ANDROID_KEY_ALIAS")',
    '            keyPassword System.getenv("ANDROID_KEY_PASSWORD")',
    '        }',
    '    }',
    ''
  ].join('\n');
  gradle = gradle.slice(0, android.open + 1) + signing + gradle.slice(android.open + 1);
}

const buildTypes = findBlock(gradle, 'buildTypes');
if (!buildTypes) throw new Error('Could not locate buildTypes in app/build.gradle.');
const release = findBlock(gradle, 'release', buildTypes.open + 1);
if (release && release.close < buildTypes.close) {
  const body = gradle.slice(release.open + 1, release.close);
  if (!/signingConfig\s+signingConfigs\.release/.test(body)) {
    gradle = gradle.slice(0, release.open + 1) +
      '\n            signingConfig signingConfigs.release' +
      gradle.slice(release.open + 1);
  }
} else {
  gradle = gradle.slice(0, buildTypes.close) +
    '\n        release {\n            signingConfig signingConfigs.release\n        }\n    ' +
    gradle.slice(buildTypes.close);
}

fs.writeFileSync(gradlePath, gradle, 'utf8');
console.log('Configured persistent release signing and version ' + versionName + ' (' + versionCode + ').');
