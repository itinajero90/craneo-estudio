#!/usr/bin/env node
// Comprueba que el token de Vercel Blob guardado en .env.local funciona.
// Uso:  node scripts/check-blob.mjs
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { list } from '@vercel/blob';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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

const token = readToken();
if (!token) {
  console.log('FALTA: no se encontró BLOB_READ_WRITE_TOKEN en .env.local');
  process.exit(1);
}
console.log(`Token leído (${token.length} caracteres). Probando contra Vercel Blob...`);

try {
  const { blobs } = await list({ token });
  console.log(`OK -> conexión correcta. Archivos en el almacén: ${blobs.length}`);
} catch (error) {
  console.log(`ERROR -> ${error.message}`);
  process.exit(1);
}
