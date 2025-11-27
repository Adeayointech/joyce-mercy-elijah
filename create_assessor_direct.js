// Create assessor via API for deployed app
const https = require('https');

const API_BASE = 'https://joyce-mercy-elijah-2.onrender.com';

// Assessor details
const assessor = {
  name: 'Joyce Mercy Project Team',
  email: 'joycemercyprojectteam@gmail.com',
  password: 'joyce-mercy',
  role: 'assessor'
};

// We'll need to directly insert into database since registration doesn't allow role selection
// Let's use the set_password script approach but modified for creating assessor

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

console.log('\n🔧 Creating assessor account locally...\n');
console.log('⚠️  NOTE: This creates the account in LOCAL database.');
console.log('For PRODUCTION, we need to create it on the deployed server.\n');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(DB_PATH);

async function createAssessor() {
  return new Promise(async (resolve, reject) => {
    try {
      const hash = await bcrypt.hash(assessor.password, 10);
      const now = new Date().toISOString();
      
      db.run(
        `INSERT INTO users (name, email, password_hash, role, approved, active, created_at) VALUES (?,?,?,?,1,1,?)`,
        [assessor.name, assessor.email, hash, 'assessor', now],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE')) {
              console.log('❌ Email already exists!');
              console.log('\n💡 Use set_password.js to update the password instead.');
            } else {
              console.error('❌ Error:', err.message);
            }
            reject(err);
          } else {
            console.log('✅ Assessor created successfully!');
            console.log('\n📧 Email:', assessor.email);
            console.log('🔑 Password:', assessor.password);
            console.log('👤 Role: Assessor');
            console.log('✓ Pre-approved and active');
            resolve();
          }
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}

createAssessor()
  .then(() => {
    db.close();
    console.log('\n⚠️  IMPORTANT: This account was created in your LOCAL database.');
    console.log('To create it on the deployed server, you need to:');
    console.log('1. Download the database from Render (if possible)');
    console.log('2. Or use a database management tool');
    console.log('3. Or upgrade to paid tier for Shell access\n');
  })
  .catch(() => {
    db.close();
    process.exit(1);
  });
