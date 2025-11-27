const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(DB_PATH);

function run(sql, params=[]) { return new Promise((res, rej) => db.run(sql, params, function(err){ if(err) rej(err); else res(this); })); }
function get(sql, params=[]) { return new Promise((res, rej) => db.get(sql, params, (err, row) => err ? rej(err) : res(row))); }

async function setPassword(){
  try{
    const email = 'assessor@example.com';
    const newPass = '12345678';
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if(!user){
      console.error('User not found:', email);
      process.exit(1);
    }
    const hash = await bcrypt.hash(newPass, 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
    console.log('Password updated for', email);
    console.log('New password is:', newPass);
    process.exit(0);
  }catch(err){
    console.error('Error:', err);
    process.exit(1);
  }
}

setPassword();
