// Comprobación temporal de la instancia TiDB Cloud (rama de pruebas).
// Lee TIDB_DATABASE_URL de .env; no contiene credenciales.
import "dotenv/config";
import { connect } from "@tidbcloud/serverless";

const url = process.env.TIDB_DATABASE_URL;
if (!url) {
  console.error("Falta TIDB_DATABASE_URL en .env");
  process.exit(1);
}

const conn = connect({ url, fullResult: true });
const time = async (label, sql, params) => {
  const t0 = Date.now();
  try {
    const r = await conn.execute(sql, params ?? []);
    const ms = Date.now() - t0;
    const rows = r.rows ?? [];
    const sample = rows[0] ? JSON.stringify(rows[0]).slice(0, 220) : "";
    console.log(
      `\n[${label}] ${ms} ms · ${rows.length} fila(s)` +
        (r.rowsAffected != null ? ` · rowsAffected=${r.rowsAffected}` : "") +
        (sample ? `\n   ${sample}` : ""),
    );
    return rows;
  } catch (e) {
    console.log(`\n[${label}] ERROR: ${e?.message}`);
    return [];
  }
};

console.log("Conectando a", url.replace(/:[^:@/]+@/, ":***@"));
await time("contexto", "select current_user() as u, database() as db, version() as v");
await time("bases", "show databases");
const tables = await time("tablas", "show tables");
console.log("\nTablas:", tables.map((t) => Object.values(t)[0]).join(", ") || "(ninguna)");

await time("reviews:count", "select count(*) as n from reviews");
await time("reviews:getAllVibes", "select distinct vibe from reviews where vibe is not null");
await time("reviews:nullReview", "select id, film_id, title, year, poster_url, youtube_id, vibe, expectation_mood from reviews where review is null limit 5");
await time("tokens:abierta", "select * from trigger_tokens order by created_at desc limit 1");
await time("comments:recientes", "select * from comments order by created_at desc limit 3");
await time("app_settings", "select * from app_settings");
await time(
  "write:upsert (rollback lógico)",
  "update app_settings set description = description where setting_key = 'selection_mode'",
);
await time("info_schema", "select table_name, table_rows from information_schema.tables where table_schema = database()");
