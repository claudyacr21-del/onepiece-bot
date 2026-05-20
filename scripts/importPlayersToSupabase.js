const fs = require("fs");
const zlib = require("zlib");
const { Pool } = require("pg");

const filePath = process.argv[2];

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL env.");
  process.exit(1);
}

if (!filePath) {
  console.error("Usage: node scripts/importPlayersToSupabase.js <players.json or players.json.gz>");
  process.exit(1);
}

function readJsonOrGz(path) {
  const raw = fs.readFileSync(path);
  const isGzip = raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b;
  const jsonBuffer = isGzip ? zlib.gunzipSync(raw) : raw;
  return JSON.parse(jsonBuffer.toString("utf8"));
}

async function main() {
  const players = readJsonOrGz(filePath);
  const entries = Object.entries(players || {});

  if (!entries.length) {
    throw new Error("No players found in file.");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

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
      const username = data?.username || "Unknown";

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
        [String(userId), username, JSON.stringify(data || {})]
      );
    }

    await client.query("commit");

    console.log(`Imported ${entries.length} players to Supabase.`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});