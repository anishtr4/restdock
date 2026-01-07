import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || 'artifacts';
const VERSION = process.env.VERSION || '1.0.0'; // Should be passed from workflow
const PUBLISH_DATE = new Date().toISOString();

// Platform mapping: Updater platform key -> folder pattern and extension
// Tauri v2 updater uses specific bundle formats:
// - macOS: .app.tar.gz (compressed app bundle)
// - Linux: .AppImage.tar.gz (compressed AppImage)
// - Windows: .nsis.zip (compressed NSIS installer)
const PLATFORMS = {
    'darwin-aarch64': { ext: '.app.tar.gz', folder: 'macOS-arm64' },
    'darwin-x86_64': { ext: '.app.tar.gz', folder: 'macOS-x64' },
    'linux-x86_64': { ext: '.AppImage.tar.gz', folder: 'Linux-x64' },
    'windows-x86_64': { ext: '.nsis.zip', folder: 'Windows-x64' }
};

// Base URL where assets are hosted (GitHub Releases)
const REPO = process.env.GITHUB_REPOSITORY || 'anishtr4/restdock_release'; // Env var from action? No, release repo.
const RELEASE_REPO = process.env.RELEASE_REPO || 'anishtr4/restdock_release';
// VERSION already contains 'v' prefix (e.g., 'v1.0.7')
const BASE_URL = `https://github.com/${RELEASE_REPO}/releases/download/${VERSION}`;

const latest = {
    version: VERSION,
    notes: `Update to version ${VERSION}`,
    pub_date: PUBLISH_DATE,
    platforms: {}
};

// Scan artifacts
// artifacts folder structure from download-artifact action might be:
// artifacts/restdock-macOS-arm64/src-tauri/target/.../bundle/dmg/RestDock...dmg
// OR flattened if we adjusted the path.
// Let's assume we can traverse and find matching files.

function findFile(dir, ext) {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            const found = findFile(fullPath, ext);
            if (found) return found;
        } else if (file.endsWith(ext)) {
            return fullPath;
        }
    }
    return null;
}

function getSignature(filePath) {
    // Signature file is usually same path + .sig
    const sigPath = filePath + '.sig';
    if (fs.existsSync(sigPath)) {
        return fs.readFileSync(sigPath, 'utf8').trim();
    }
    return null;
}

console.log(`Generating latest.json for version ${VERSION}...`);

for (const [platformKey, config] of Object.entries(PLATFORMS)) {
    // We need to look for specific extensions
    // In our workflow, we upload artifacts named 'restdock-macOS-arm64', etc.
    // We can search the whole artifacts directory for the specific file extension AND checks if it matches expected target name logic roughly or just trust extension if unique per platform loop?
    // Better: search specifically.

    // Actually, we can just search recursively for the extension.
    // But wait, macos has x64 and arm64 dmg. We need to distinguish.
    // The artifact download will group them if we kept names.

    // Let's assume we find *any* file matching extension, but we need to know which one is which.
    // In `release.yml`, we uploaded:
    // restdock-macOS-arm64 -> .../aarch64-apple-darwin/...
    // restdock-macOS-x64 -> .../x86_64-apple-darwin/...

    // So we can look for folder names.
    let searchDir = ARTIFACTS_DIR;

    // Heuristic: look for target name in path
    const target = config.target;

    // Traverse and find file that contains target in path OR is in a folder named after platform
    // Let's just walk the whole tree and map.
}

// Simpler approach:
// Walk all files, categorize by target/platform.
const files = [];
function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) walk(fullPath);
        else files.push(fullPath);
    });
}
walk(ARTIFACTS_DIR);

for (const [platformKey, config] of Object.entries(PLATFORMS)) {
    const ext = config.ext;
    const folder = config.folder;

    // Find file that has extension AND contains folder name in path
    const match = files.find(f => f.endsWith(ext) && f.includes(folder));

    if (match) {
        const sig = getSignature(match);
        const filename = path.basename(match);
        latest.platforms[platformKey] = {
            signature: sig || '',
            url: `${BASE_URL}/${filename}`
        };
        if (sig) {
            console.log(`✅ ${platformKey}: Found ${filename} with signature`);
        } else {
            console.log(`⚠️ ${platformKey}: Found ${filename} (no signature - updater won't verify)`);
        }
    } else {
        console.warn(`❌ ${platformKey}: No matching artifact found.`);
    }
}

fs.writeFileSync('latest.json', JSON.stringify(latest, null, 2));
console.log('latest.json generated successfully.');
