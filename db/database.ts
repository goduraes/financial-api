const sqlite3 = require('sqlite3').verbose();
import path from 'path';

const dbPath = path.resolve(__dirname, '', 'database.db');

const db = new sqlite3.Database(dbPath, (err: Error | null) => {
  if (err) {
    console.error('Connection error:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

export default db;
