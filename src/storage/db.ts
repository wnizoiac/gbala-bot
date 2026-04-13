import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';
import type { Logger } from 'pino';

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'src/storage/migrations');

export interface DatabaseContext {
  db: Database.Database;
  close(): void;
}

function ensureParentDirectory(dbPath: string): void {
  if (dbPath === ':memory:') {
    return;
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

function runMigrations(db: Database.Database, logger: Logger): void {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));

  for (const file of files) {
    const migrationPath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    db.exec(sql);
    logger.debug({ migration: file }, 'Migration aplicada');
  }
}

export function createDatabase(dbPath: string, logger: Logger): DatabaseContext {
  ensureParentDirectory(dbPath);

  const db = new Database(dbPath);

  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }

  runMigrations(db, logger);

  return {
    db,
    close(): void {
      db.close();
    }
  };
}
