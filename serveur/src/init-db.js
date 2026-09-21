// Recrée la base à partir de schema.sql : node src/init-db.js
// ATTENTION : supprime la base existante.

import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const ici = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(ici, '..', 'data.db');

if (existsSync(DB_PATH)) {
  unlinkSync(DB_PATH);
  console.log('Ancienne base supprimée.');
}

const db = new Database(DB_PATH);
db.exec(readFileSync(join(ici, '..', 'schema.sql'), 'utf8'));

const n = db.prepare('SELECT COUNT(*) AS n FROM utilisateurs').get().n;
console.log(`Base créée : ${DB_PATH} (${n} utilisateurs de démo)`);
db.close();
