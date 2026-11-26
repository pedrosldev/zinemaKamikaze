#!/usr/bin/env node
/**
 * Copia de seguridad de la base de datos de TiDB Cloud a un .sql local.
 *
 * Lee la conexión de `TIDB_DATABASE_URL` (entorno o `.env`; se acepta la
 * línea aunque esté comentada) y vuelca esquema + datos de todas las tablas
 * en `backups/zinemakamikaze-<marca-de-tiempo>.sql`, en formato MySQL.
 *
 * Uso:
 *   pnpm backup
 *   pnpm backup -- backups/mi-copia.sql
 *
 * El archivo contiene datos reales (nombres y comentarios de usuarios), así
 * que va a `backups/`, que está ignorado por git.
 */
import "dotenv/config";
import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { connect } from "@tidbcloud/serverless";

/** Filas por sentencia INSERT (compromiso entre tamaño y legibilidad). */
const ROWS_PER_INSERT = 50;
/** Filas por página al leer (evita respuestas enormes del gateway). */
const PAGE_SIZE = 500;

function readUrlFromEnvFile() {
  const path = resolve(".env");
  if (!existsSync(path)) return null;
  const line = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .find((l) => /^\s*#?\s*TIDB_DATABASE_URL\s*=/.test(l));
  if (!line) return null;
  return line.replace(/^\s*#?\s*TIDB_DATABASE_URL\s*=\s*/, "").trim().replace(/^["']|["']$/g, "");
}

const databaseUrl = process.env.TIDB_DATABASE_URL || readUrlFromEnvFile();
if (!databaseUrl) {
  console.error("Falta TIDB_DATABASE_URL: defínela en el entorno o en .env");
  process.exit(1);
}

const target = resolve(process.argv[2] || `backups/zinemakamikaze-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`);
mkdirSync(dirname(target), { recursive: true });

const conn = connect({ url: databaseUrl, fullResult: true });
const execute = async (sql, params = []) => {
  const result = await conn.execute(sql, params);
  return result.rows ?? [];
};

const { db, server } = (
  await execute("SELECT DATABASE() AS db, VERSION() AS server")
)[0];

console.log(`Origen: ${server} · base ${db}`);
console.log(`Destino: ${target}\n`);

/** Escapa un valor para un INSERT de MySQL (comillas simples y backslash). */
function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace("T", " ")}'`;
  if (Buffer.isBuffer(value)) return `X'${value.toString("hex")}'`;

  const escaped = String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\0/g, "\\0")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\x1a/g, "\\Z");

  return `'${escaped}'`;
}

const out = createWriteStream(target, { encoding: "utf8" });
const write = (chunk) => {
  if (!out.write(chunk)) {
    return new Promise((done) => out.once("drain", done));
  }
};

const tables = (
  await execute(
    `SELECT table_name AS name
       FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
  )
).map((row) => row.name);

if (tables.length === 0) {
  console.error("No hay tablas que volcar");
  process.exit(1);
}

await write(
  `-- Backup ZinemaKamikaze ${new Date().toISOString()}\n` +
    `-- Origen: ${server} · base ${db}\n` +
    `-- Restaurar: mysql -u root -p <base> < este-archivo.sql\n` +
    `SET NAMES utf8mb4;\n` +
    `SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n` +
    `SET FOREIGN_KEY_CHECKS=0;\n\n`,
);

const summary = [];
let failed = false;

for (const table of tables) {
  const [definition] = await execute(`SHOW CREATE TABLE \`${table}\``);
  const createSql = Object.values(definition).find(
    (value) => typeof value === "string" && /^CREATE TABLE/i.test(value),
  );

  const [{ total }] = await execute(`SELECT COUNT(*) AS total FROM \`${table}\``);
  const rowCount = Number(total);

  const primaryKey = (
    await execute(
      `SELECT column_name AS name
         FROM information_schema.key_column_usage
        WHERE table_schema = DATABASE()
          AND table_name = ?
          AND constraint_name = 'PRIMARY'
        ORDER BY ordinal_position`,
      [table],
    )
  ).map((row) => row.name);

  const orderBy = primaryKey.length
    ? ` ORDER BY ${primaryKey.map((c) => `\`${c}\``).join(", ")}`
    : "";

  await write(`-- ----------------------------------------------------------------\n`);
  await write(`-- Tabla \`${table}\` (${rowCount} fila${rowCount === 1 ? "" : "s"})\n`);
  await write(`-- ----------------------------------------------------------------\n`);
  await write(`DROP TABLE IF EXISTS \`${table}\`;\n`);
  if (createSql) {
    await write(`/*!40101 SET @saved_cs_client = @@character_set_client */;\n`);
    await write(`${createSql};\n`);
  }

  const columns = (
    await execute(
      `SELECT column_name AS name
         FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = ?
        ORDER BY ordinal_position`,
      [table],
    )
  ).map((row) => row.name);

  let read = 0;
  let buffer = [];
  const flush = async () => {
    if (buffer.length === 0) return;
    await write(
      `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES\n` +
        buffer.join(",\n") +
        ";\n",
    );
    buffer = [];
  };

  try {
    while (read < rowCount) {
      const rows = await execute(
        `SELECT * FROM \`${table}\`${orderBy} LIMIT ${PAGE_SIZE} OFFSET ${read}`,
      );
      if (rows.length === 0) break;

      for (const row of rows) {
        buffer.push(`(${columns.map((c) => sqlValue(row[c])).join(", ")})`);
        if (buffer.length >= ROWS_PER_INSERT) await flush();
      }

      read += rows.length;
    }

    await flush();

    if (read !== rowCount) {
      failed = true;
      await write(`-- AVISO: se esperaban ${rowCount} filas y se volcaron ${read}\n`);
    }
  } catch (error) {
    failed = true;
    console.error(`  ✗ ${table}: ${error?.message}`);
    await write(`-- ERROR al volcar ${table}: ${error?.message}\n`);
  }

  await write("\n");
  summary.push({ table, rows: read, expected: rowCount });
  const mark = read === rowCount ? "✓" : "✗";
  console.log(`  ${mark} ${table.padEnd(22)} ${String(read).padStart(5)} / ${rowCount}`);
}

await write(`SET FOREIGN_KEY_CHECKS=1;\n`);
await new Promise((done) => out.end(done));

const size = statSync(target).size;
console.log(
  `\n${failed ? "Backup INCOMPLETO" : "Backup correcto"}: ${summary.length} tablas · ` +
    `${summary.reduce((sum, t) => sum + t.rows, 0)} filas · ` +
    `${(size / 1024).toFixed(1)} KB`,
);

process.exit(failed ? 1 : 0);
