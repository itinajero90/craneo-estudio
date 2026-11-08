#!/usr/bin/env node
// Publica una versión nueva de la app en Vercel (web + actualizador).
//
// Uso:  npm run publish-update -- "notas de la version"
//
// Pasos que hace:
//   1. compila y firma el .exe con Tauri (versión de src-tauri/tauri.conf.json)
//   2. sube el instalador a Vercel Blob (almacén de archivos FUERA del repo)
//   3. genera public/latest.json con la firma (lo que lee el actualizador)
//   4. commitea y hace push -> Vercel redespliega solo
//
// El .exe NUNCA se guarda en el repo: si viviera en public/, Vite lo metería
// en dist/ y Tauri lo empaquetaría dentro del propio instalador (crecería
// +15 MB en cada release).
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { put } from '@vercel/blob';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, opts = {}) => execSync(cmd, { cwd: root, stdio: 'inherit', ...opts });

const FILE_NAME = 'craneo-studio-setup.exe';
const DOWNLOAD_URL = `https://craneo-studio.vercel.app/${FILE_NAME}`;

// Token de Vercel Blob: vive en .env.local (ignorado por git) o en el entorno.
function readToken() {
  const envPath = join(root, '.env.local');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*BLOB_READ_WRITE_TOKEN\s*=\s*(.+?)\s*$/);
      if (match) return match[1].replace(/^["']|["']$/g, '');
    }
  }
  return process.env.BLOB_READ_WRITE_TOKEN;
}

const conf = JSON.parse(readFileSync(join(root, 'src-tauri', 'tauri.conf.json'), 'utf8'));
const version = conf.version;

console.log(`\n=== Publicando craneo-studio v${version} ===\n`);

// 1) Build firmado (la clave privada NUNCA se sube a git)
console.log('-> Compilando y firmando con Tauri...');
run('npx tauri build', {
  env: {
    ...process.env,
    TAURI_SIGNING_PRIVATE_KEY: join(homedir(), '.tauri', 'craneo-studio.key'),
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: '',
  },
});

const bundleDir = join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
const setupPath = join(bundleDir, `craneo-studio_${version}_x64-setup.exe`);
const sigPath = `${setupPath}.sig`;
if (!existsSync(setupPath) || !existsSync(sigPath)) {
  throw new Error(`No se encontró el instalador firmado: ${setupPath}`);
}

// 2) Subir el instalador a Vercel Blob (queda fuera del repo)
const token = readToken();
if (!token) {
  console.error('\nFalta BLOB_READ_WRITE_TOKEN.');
  console.error('Crea el Blob Store en vercel.com y pega el token en .env.local:');
  console.error('  BLOB_READ_WRITE_TOKEN=tu_token\n');
  process.exit(1);
}

console.log('-> Subiendo el instalador a Vercel Blob...');
const blob = await put(FILE_NAME, readFileSync(setupPath), {
  access: 'public',
  token,
  allowOverwrite: true,
  addRandomSuffix: false,
  contentType: 'application/x-msdownload',
});
console.log(`-> ${blob.url}`);

// 2b) vercel.json redirige el enlace estable de descarga hacia el Blob.
//     Solo se toca si la URL del Blob cambió (así no ensucia el historial).
const vercelPath = join(root, 'vercel.json');
const vercelConf = JSON.parse(readFileSync(vercelPath, 'utf8'));
const redirect = vercelConf.redirects?.find((r) => r.source === `/${FILE_NAME}`);
if (!redirect || redirect.destination !== blob.url) {
  vercelConf.redirects = [
    { source: `/${FILE_NAME}`, destination: blob.url, permanent: false },
    ...(vercelConf.redirects || []).filter((r) => r.source !== `/${FILE_NAME}`),
  ];
  writeFileSync(vercelPath, `${JSON.stringify(vercelConf, null, 2)}\n`);
  console.log(`-> vercel.json ahora redirige /${FILE_NAME} al Blob`);
}

// 3) Menú de actualización que lee el banner de la app
const signature = readFileSync(sigPath, 'utf8').trim();
const latest = {
  version,
  notes: process.argv[2] || `Versión ${version} de OSSO · Craneo Studio.`,
  pub_date: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  platforms: { 'windows-x86_64': { signature, url: DOWNLOAD_URL } },
};
writeFileSync(join(root, 'public', 'latest.json'), `${JSON.stringify(latest, null, 2)}\n`);
console.log(`-> public/latest.json apunta a ${DOWNLOAD_URL}`);

// 4) Subir todo -> Vercel redespliega automáticamente
console.log('-> Subiendo a GitHub...');
run('git add public/latest.json package.json src-tauri/tauri.conf.json');
if (execSync('git status --porcelain vercel.json', { cwd: root }).toString().trim()) {
  run('git add vercel.json');
}
run(`git commit -m "release: v${version}"`);
run('git push');

console.log(`\n✓ Publicado v${version}:`);
console.log('  web + descarga: https://craneo-studio.vercel.app');
console.log('  actualizador:   https://craneo-studio.vercel.app/latest.json\n');
