const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(DB_PATH);

function run(sql, params=[]) { return new Promise((res, rej) => db.run(sql, params, function(err){ if(err) rej(err); else res(this); })); }
function get(sql, params=[]) { return new Promise((res, rej) => db.get(sql, params, (err, row) => err ? rej(err) : res(row))); }

async function create(){
  try{
    const email = 'assessor@example.com';
    const existing = await get('SELECT * FROM users WHERE email = ?', [email]).catch(()=>null);
    if(existing){
      console.log('Assessor already exists:', email);
      process.exit(0);
    }
    const password = 'Assessor123!';
    const hash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 365*24*60*60*1000).toISOString();
    await run('INSERT INTO users (name, email, password_hash, role, approved, created_at, expires_at, active) VALUES (?,?,?,?,?,?,?,?)',
      ['Initial Assessor', email, hash, 'assessor', 1, now, expires, 1]);
    console.log('Created assessor user:');
    console.log('  email:', email);
    console.log('  password:', password);
    console.log('Please change the password after first login.');
    process.exit(0);
  }catch(err){
    console.error('Error creating assessor:', err);
    process.exit(1);
  }
}

create();
