const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(DB_PATH);

db.all('SELECT id, name, email, awarding_body, level, approved, created_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
  if(err) { console.error('DB error', err); process.exit(1); }
  console.log('All users:');
  rows.forEach(r => console.log(r));
  console.log('\nPending users (approved = 0):');
  rows.filter(r => r.approved === 0).forEach(r => console.log(r));
  process.exit(0);
});
