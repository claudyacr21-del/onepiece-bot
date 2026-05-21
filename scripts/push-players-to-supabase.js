const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const DATA_DIR =
  process.env.PLAYER_DATA_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  "/data";

const PLAYER_FILE = process.env.PLAYER_FILE || path.join(DATA_DIR, "players.json");
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL belum ada. Set DATABASE_URL Supabase dulu.");
  process.exit(1);
}

if (!fs.existsSync(PLAYER_FILE)) {
  console.error(`❌ File player tidak ketemu: ${PLAYER_FILE}`);
  process.exit(1);
}

function safeReadJson(file) {
  const raw = fs.readFileSync(file, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("players.json format harus object, bukan array/null.");
  }
  return parsed;
}

async function main() {
  const players = safeReadJson(PLAYER_FILE);
  const entries = Object.entries(players);
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });

  console.log(`📦 Source file: ${PLAYER_FILE}`);
  console.log(`👥 Total players from file: ${entries.length}`);

  const client = await pool.connect();

  try {
    await client.query("begin");

    await client.query(`
      create table if not exists players (
        user_id text primary key,
        username text,
        data jsonb not null default '{}'::jsonb,
        updated_at timestamptz not null default now()
      );
    `);

    await client.query(`
      create index if not exists players_username_idx on players (username);
    `);

    await client.query(`
      create index if not exists players_updated_at_idx on players (updated_at);
    `);

    for (const [userId, data] of entries) {
      await client.query(
        `
        insert into players (user_id, username, data, updated_at)
        values ($1, $2, $3::jsonb, now())
        on conflict (user_id)
        do update set
          username = excluded.username,
          data = excluded.data,
          updated_at = now()
        `,
        [
          String(userId),
          data?.username || "Unknown",
          JSON.stringify(data || {}),
        ]
      );
    }

    const countResult = await client.query("select count(*)::int as total from players");

    await client.query("commit");

    console.log("✅ Migration selesai.");
    console.log(`✅ Supabase players total sekarang: ${countResult.rows[0].total}`);
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.error("❌ Migration gagal:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();