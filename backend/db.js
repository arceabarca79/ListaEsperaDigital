const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('waitlist.db');

// Optimización para alta concurrencia
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');

// Inicializar tablas
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

module.exports = db;