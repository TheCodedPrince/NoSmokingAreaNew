CREATE TABLE IF NOT EXISTS users (
 telegram_id TEXT PRIMARY KEY,
 username TEXT,
 nickname TEXT NOT NULL,
 nicotine_type TEXT NOT NULL DEFAULT 'cigarettes',
 cigarettes_per_day REAL DEFAULT 0,
 pack_price REAL DEFAULT 0,
 liquid_price REAL,
 cartridge_price REAL,
 cartridge_days REAL,
 liquid_days REAL,
 start_at TEXT,
 registered_at TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1,
 last_daily_sent TEXT
);
CREATE TABLE IF NOT EXISTS attempts (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 telegram_id TEXT NOT NULL,
 started_at TEXT NOT NULL,
 ended_at TEXT
);
CREATE TABLE IF NOT EXISTS achievements (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 telegram_id TEXT NOT NULL,
 milestone INTEGER NOT NULL,
 earned_at TEXT,
 UNIQUE(telegram_id,milestone)
);
CREATE TABLE IF NOT EXISTS states (
 telegram_id TEXT PRIMARY KEY,
 state TEXT NOT NULL,
 data TEXT NOT NULL
);
