PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS restaurants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    country_code TEXT DEFAULT '+51',
    avg_wait_per_party INTEGER DEFAULT 4
);

INSERT OR IGNORE INTO restaurants (id, name, slug, country_code, avg_wait_per_party) VALUES
('rest_1', 'La Terraza Azul', 'terraza-azul', '+51', 4),
('rest_2', 'Cuatro Vientos', 'cuatro-vientos', '+51', 5),
('rest_3', 'Casa Mediterránea', 'casa-mediterranea', '+56', 4);

CREATE TABLE IF NOT EXISTS waitlist_entries (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    party_size INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting', -- waiting -> called -> on_the_way -> seated; cancelled exits the queue
    position INTEGER NOT NULL,
    is_frequent INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    called_at TEXT,
    resolved_at TEXT,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entries_active ON waitlist_entries(restaurant_id, status);