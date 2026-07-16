const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const localDir = process.env.REDEEM_CODE_DATA_DIR || path.join(__dirname, "../data");
const filePath = path.join(localDir, "redeemCodes.json");

const USE_POSTGRES = Boolean(process.env.DATABASE_URL);
let pool = null;
let dbReady = false;
let dbInitStarted = false;

function getPool() {
  if (!USE_POSTGRES) return null;

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: Number(process.env.REDEEM_CODE_DB_POOL_MAX || 2),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on("error", (error) => {
      console.error("[REDEEM CODE DB POOL ERROR]", error);
    });
  }

  return pool;
}

async function ensureRedeemCodeTable() {
  if (dbReady) return true;
  if (dbInitStarted) return false;

  const db = getPool();
  if (!db) return false;

  dbInitStarted = true;

  try {
    await db.query(`
      create table if not exists redeem_codes (
        code text primary key,
        data jsonb not null default '{}'::jsonb,
        active boolean not null default true,
        expires_at bigint not null default 0,
        updated_at timestamptz not null default now()
      );
    `);

    await db.query(`
      create index if not exists redeem_codes_active_idx
      on redeem_codes (active);
    `);

    await db.query(`
      create index if not exists redeem_codes_updated_at_idx
      on redeem_codes (updated_at);
    `);

    dbReady = true;
    return true;
  } catch (error) {
    console.error("[REDEEM CODE DB INIT ERROR]", error);
    dbReady = false;
    return false;
  } finally {
    dbInitStarted = false;
  }
}

function ensureFile() {
  fs.mkdirSync(localDir, { recursive: true });

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          codes: {},
        },
        null,
        2
      ),
      "utf8"
    );
  }
}

function readRedeemCodesFromFile() {
  ensureFile();

  try {
    const raw = fs.readFileSync(filePath, "utf8").trim();
    if (!raw) return { codes: {} };

    const parsed = JSON.parse(raw);

    return {
      codes: parsed.codes && typeof parsed.codes === "object" ? parsed.codes : {},
    };
  } catch (error) {
    console.error("redeemCodes.json is invalid. Creating backup and resetting file.", error);

    try {
      const brokenRaw = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
      fs.writeFileSync(`${filePath}.broken.${Date.now()}.bak`, brokenRaw, "utf8");
    } catch (backupError) {
      console.error("Failed to back up broken redeemCodes.json", backupError);
    }

    const fresh = { codes: {} };
    writeRedeemCodesToFile(fresh);
    return fresh;
  }
}

function writeRedeemCodesToFile(data) {
  ensureFile();

  const payload = {
    codes: data.codes && typeof data.codes === "object" ? data.codes : {},
  };

  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}

async function readRedeemCodesFromDb() {
  const db = getPool();

  if (!db) return null;

  if (!dbReady) {
    await ensureRedeemCodeTable();
  }

  if (!dbReady) return null;

  const result = await db.query("select code, data from redeem_codes order by updated_at asc");
  const codes = {};

  for (const row of result.rows || []) {
    const entry = row.data && typeof row.data === "object" ? row.data : {};
    const code = String(row.code || entry.code || "").toUpperCase();

    if (!code) continue;

    codes[code] = {
      ...entry,
      code,
      active: entry.active !== false,
      expiresAt: Number(entry.expiresAt || 0),
      usedBy: Array.isArray(entry.usedBy) ? entry.usedBy : [],
    };
  }

  return { codes };
}

async function writeRedeemCodesToDb(data) {
  const db = getPool();

  if (!db) return false;

  if (!dbReady) {
    await ensureRedeemCodeTable();
  }

  if (!dbReady) return false;

  const payload = data && typeof data === "object" ? data : { codes: {} };
  const codes = payload.codes && typeof payload.codes === "object" ? payload.codes : {};

  const client = await db.connect();

  try {
    await client.query("begin");

    for (const [rawCode, rawEntry] of Object.entries(codes)) {
      const code = String(rawCode || rawEntry?.code || "").toUpperCase();
      if (!code) continue;

      const entry = {
        ...rawEntry,
        code,
        active: rawEntry?.active !== false,
        expiresAt: Number(rawEntry?.expiresAt || 0),
        usedBy: Array.isArray(rawEntry?.usedBy) ? rawEntry.usedBy.map(String) : [],
        updatedAt: Number(rawEntry?.updatedAt || Date.now()),
      };

      await client.query(
        `
        insert into redeem_codes (code, data, active, expires_at, updated_at)
        values ($1, $2::jsonb, $3, $4, now())
        on conflict (code)
        do update set
          data = excluded.data,
          active = excluded.active,
          expires_at = excluded.expires_at,
          updated_at = now()
        `,
        [
          code,
          JSON.stringify(entry),
          entry.active !== false,
          Number(entry.expiresAt || 0),
        ]
      );
    }

    const activeCodes = Object.keys(codes)
      .map((code) => String(code || "").toUpperCase().trim())
      .filter(Boolean);

    /*
      Remove database rows that no longer exist in the
      current redeem code store.

      Without this cleanup, deleted codes remain in Postgres
      and return after the bot reloads.
    */
    if (activeCodes.length > 0) {
      await client.query(
        `
        delete from redeem_codes
        where not (code = any($1::text[]))
        `,
        [activeCodes]
      );
    } else {
      await client.query(
        `
        delete from redeem_codes
        `
      );
    }

    await client.query("commit");
    return true;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.error("[REDEEM CODE DB WRITE ERROR]", error);
    return false;
  } finally {
    client.release();
  }
}

function readRedeemCodes() {
  if (!USE_POSTGRES) {
    return readRedeemCodesFromFile();
  }

  /*
    This command file is synchronous, so we keep a safe fallback.
    DB migration/read can be handled by the async helpers below.
  */
  return readRedeemCodesFromFile();
}

function writeRedeemCodes(data) {
  writeRedeemCodesToFile(data);

  if (USE_POSTGRES) {
    writeRedeemCodesToDb(data).catch((error) => {
      console.error("[REDEEM CODE DB ASYNC WRITE ERROR]", error);
    });
  }
}

async function initRedeemCodeStore() {
  if (!USE_POSTGRES) {
    readRedeemCodesFromFile();
    console.log("[REDEEM CODE STORE] File mode active.");
    return;
  }

  try {
    await ensureRedeemCodeTable();

    const dbData = await readRedeemCodesFromDb();
    const dbCount = Object.keys(dbData?.codes || {}).length;

    if (dbCount > 0) {
      writeRedeemCodesToFile(dbData);
      console.log(`[REDEEM CODE STORE] Postgres mode active. Loaded ${dbCount} codes.`);
      return;
    }

    const fileData = readRedeemCodesFromFile();
    const fileCount = Object.keys(fileData?.codes || {}).length;

    if (fileCount > 0) {
      await writeRedeemCodesToDb(fileData);
      console.log(`[REDEEM CODE STORE] Postgres mode active. Seeded ${fileCount} codes from file.`);
      return;
    }

    console.log("[REDEEM CODE STORE] Postgres mode active. No codes found yet.");
  } catch (error) {
    console.error("[REDEEM CODE STORE] Failed to initialize Postgres mode. Using file fallback.", error);
    readRedeemCodesFromFile();
  }
}

module.exports = {
  readRedeemCodes,
  writeRedeemCodes,
  initRedeemCodeStore,
  filePath,
};