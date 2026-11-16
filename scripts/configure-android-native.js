const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = process.cwd();
const androidRoot = path.join(root, 'android');
const resources = path.join(androidRoot, 'app', 'src', 'main', 'res');
const sourceIcon = path.join(root, 'dist', 'bunny-app-icon-512.png');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

async function configureStatusBar() {
  const javaFiles = walk(path.join(androidRoot, 'app', 'src', 'main')).filter(file => /MainActivity\.java$/.test(file));
  const kotlinFiles = walk(path.join(androidRoot, 'app', 'src', 'main')).filter(file => /MainActivity\.kt$/.test(file));
  const activity = javaFiles[0] || kotlinFiles[0];
  if (!activity) throw new Error('Could not locate generated Capacitor MainActivity.java or MainActivity.kt.');

  if (activity.endsWith('.java')) {
    let source = fs.readFileSync(activity, 'utf8');
    const imports = [
      'import android.graphics.Color;',
      'import android.os.Bundle;',
      'import androidx.core.view.WindowCompat;',
      'import androidx.core.view.WindowInsetsControllerCompat;'
    ];
    for (const item of imports) {
      if (!source.includes(item)) {
        const packageLine = source.match(/^package [^;]+;\s*/m);
        if (!packageLine) throw new Error('MainActivity.java has no package declaration.');
        source = source.replace(packageLine[0], packageLine[0] + '\n' + item + '\n');
      }
    }
    const body = `
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep the WebView below Android system bars. This lets the existing
        // Cute Bunny header sit directly beneath the status bar without overlap.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().setStatusBarColor(Color.parseColor("#FCF7F2"));
        getWindow().setNavigationBarColor(Color.parseColor("#FCF7F2"));

        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(
            getWindow(), getWindow().getDecorView()
        );
        bars.setAppearanceLightStatusBars(true);
        bars.setAppearanceLightNavigationBars(true);
    }
`;
    if (!source.includes('setDecorFitsSystemWindows')) {
      source = source.replace(/\n\s*}\s*$/, '\n' + body + '\n}\n');
    }
    fs.writeFileSync(activity, source);
  } else {
    let source = fs.readFileSync(activity, 'utf8');
    if (!source.includes('setDecorFitsSystemWindows')) {
      const imports = [
        'import android.graphics.Color',
        'import androidx.core.view.WindowCompat',
        'import androidx.core.view.WindowInsetsControllerCompat'
      ];
      const lastImport = [...source.matchAll(/^import .*$/gm)].at(-1);
      if (!lastImport) throw new Error('MainActivity.kt has no imports.');
      source = source.slice(0, lastImport.index + lastImport[0].length) + '\n' + imports.join('\n') + source.slice(lastImport.index + lastImport[0].length);
      source = source.replace(/class MainActivity : BridgeActivity\(\)\s*\{\s*\}/, `class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, true)
        window.statusBarColor = Color.parseColor("#FCF7F2")
        window.navigationBarColor = Color.parseColor("#FCF7F2")
        val bars = WindowCompat.getInsetsController(window, window.decorView)
        bars.isAppearanceLightStatusBars = true
        bars.isAppearanceLightNavigationBars = true
    }
}`);
    }
    fs.writeFileSync(activity, source);
  }
}

async function configureAdaptiveIcons() {
  if (!fs.existsSync(sourceIcon)) throw new Error('Missing source launcher icon: ' + sourceIcon);
  const meta = await sharp(sourceIcon).metadata();
  if (meta.width !== 512 || meta.height !== 512) {
    throw new Error('Expected a 512x512 source icon; received ' + meta.width + 'x' + meta.height + '.');
  }

  const pixel = await sharp(sourceIcon).extract({ left: 0, top: 0, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  const background = '#' + [...pixel].map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase();

  const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [density, size] of Object.entries(sizes)) {
    const dir = path.join(resources, 'mipmap-' + density);
    fs.mkdirSync(dir, { recursive: true });
    await sharp(sourceIcon).resize(size, size, { fit: 'contain' }).png().toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(sourceIcon).resize(size, size, { fit: 'contain' }).png().toFile(path.join(dir, 'ic_launcher_round.png'));
  }

  const foregroundDir = path.join(resources, 'drawable-nodpi');
  fs.mkdirSync(foregroundDir, { recursive: true });
  await sharp(sourceIcon).png().toFile(path.join(foregroundDir, 'ic_launcher_foreground.png'));

  const valuesDir = path.join(resources, 'values');
  fs.mkdirSync(valuesDir, { recursive: true });
  const colorsPath = path.join(valuesDir, 'cute_bunny_launcher_colors.xml');
  fs.writeFileSync(colorsPath, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="cute_bunny_launcher_background">${background}</color>
</resources>
`);

  const adaptiveDir = path.join(resources, 'mipmap-anydpi-v26');
  fs.mkdirSync(adaptiveDir, { recursive: true });
  const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/cute_bunny_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`;
  fs.writeFileSync(path.join(adaptiveDir, 'ic_launcher.xml'), adaptive);
  fs.writeFileSync(path.join(adaptiveDir, 'ic_launcher_round.xml'), adaptive);

  const themedDir = path.join(resources, 'drawable');
  fs.mkdirSync(themedDir, { recursive: true });
  fs.writeFileSync(path.join(themedDir, 'ic_launcher_monochrome.xml'), `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="512"
    android:viewportHeight="512">
    <path
        android:fillColor="#FF000000"
        android:pathData="M256,64 C205,64 180,118 177,178 C129,143 77,151 67,201 C57,249 91,285 130,302 C89,355 112,425 174,445 C213,458 240,443 256,420 C272,443 299,458 338,445 C400,425 423,355 382,302 C421,285 455,249 445,201 C435,151 383,143 335,178 C332,118 307,64 256,64 Z" />
</vector>
`);
  console.log('Configured Android status/navigation bars and adaptive launcher icons. Launcher background: ' + background);
}

(async () => {
  await configureStatusBar();
  await configureAdaptiveIcons();
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
