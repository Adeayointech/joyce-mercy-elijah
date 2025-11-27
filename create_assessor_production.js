// API endpoint to create assessor - Add this temporarily to server.js
// Copy and paste this route into your server.js, redeploy, then call it once

/*
// TEMPORARY: Create assessor endpoint (remove after use for security!)
app.post('/admin/create-assessor-temp', async (req, res) => {
  try {
    const { secret, name, email, password } = req.body;
    
    // Simple security - use your JWT_SECRET
    if (secret !== JWT_SECRET) {
      return res.status(403).json({ error: 'Invalid secret' });
    }
    
    const hash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    
    await run(
      `INSERT INTO users (name, email, password_hash, role, approved, active, created_at) VALUES (?,?,?,?,1,1,?)`,
      [name, email, hash, 'assessor', now]
    );
    
    return res.json({ success: true, message: 'Assessor created!' });
  } catch(err) {
    if(err && err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});
*/

// Then call it with this script:
const https = require('https');

const data = JSON.stringify({
  secret: '19cd4de302da26f430ea6c1923cf7cd90946b72edb2edeca4e43cff17175d95d',
  name: 'Joyce Mercy Project Team',
  email: 'joycemercyprojectteam@gmail.com',
  password: 'joyce-mercy'
});

const options = {
  hostname: 'joyce-mercy-elijah-2.onrender.com',
  port: 443,
  path: '/admin/create-assessor-temp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Creating assessor on production server...\n');

const req = https.request(options, (res) => {
  let body = '';
  
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(body);
      if (response.success) {
        console.log('✅ Assessor created successfully!');
        console.log('\n📧 Email:', 'joycemercyprojectteam@gmail.com');
        console.log('🔑 Password:', 'joyce-mercy');
        console.log('\n⚠️  IMPORTANT: Remove the temporary endpoint from server.js and redeploy!');
      } else {
        console.log('❌ Error:', response.error);
      }
    } catch (e) {
      console.log('Response:', body);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(data);
req.end();
