const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const USE_POSTGRES =
  String(process.env.PLAYER_STORE_MODE || "").toLowerCase() === "postgres" &&
  Boolean(process.env.DATABASE_URL);

let pool = null;

function getPool() {
  if (!USE_POSTGRES) return null;

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: Number(process.env.PLAYER_DB_POOL_MAX || 5),
      idleTimeoutMillis: Number(process.env.PLAYER_DB_IDLE_TIMEOUT_MS || 10000),
      connectionTimeoutMillis: Number(process.env.PLAYER_DB_CONNECT_TIMEOUT_MS || 15000),
      query_timeout: Number(process.env.PLAYER_DB_QUERY_TIMEOUT_MS || 30000),
      statement_timeout: Number(process.env.PLAYER_DB_STATEMENT_TIMEOUT_MS || 30000),
    });

    pool.on("error", (error) => {
      console.error("[JSON STATE DB POOL ERROR]", error);
    });
  }

  return pool;
}

async function ensureJsonStateTable() {
  const db = getPool();
  if (!db) return false;

  await db.query(`
    create table if not exists bot_json_state (
      state_key text primary key,
      data jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    );
  `);

  await db.query(`
    create index if not exists bot_json_state_updated_at_idx
    on bot_json_state (updated_at);
  `);

  return true;
}

async function loadJsonStateFromDb(stateKey) {
  const db = getPool();
  if (!db) return null;

  await ensureJsonStateTable();

  const result = await db.query(
    "select data from bot_json_state where state_key = $1 limit 1",
    [String(stateKey)]
  );

  return result.rows?.[0]?.data || null;
}

async function saveJsonStateToDb(stateKey, data) {
  const db = getPool();
  if (!db) return false;

  await ensureJsonStateTable();

  await db.query(
    `
    insert into bot_json_state (state_key, data, updated_at)
    values ($1, $2::jsonb, now())
    on conflict (state_key)
    do update set data = excluded.data, updated_at = now()
    `,
    [String(stateKey), JSON.stringify(data || {})]
  );

  return true;
}

function safeParseJson(raw) {
  if (!raw || !String(raw).trim()) return {};
  return JSON.parse(raw);
}

function readJsonFile(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return safeParseJson(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error("[JSON STATE FILE READ ERROR]", filePath, error);
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data || {}, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}

module.exports = {
  USE_POSTGRES,
  ensureJsonStateTable,
  loadJsonStateFromDb,
  saveJsonStateToDb,
  readJsonFile,
  writeJsonFile,
};