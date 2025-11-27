const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const crypto = require('crypto');

// Cloudinary configuration (falls back to local storage if not configured)
const USE_CLOUDINARY = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
if(USE_CLOUDINARY){
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✓ Cloudinary enabled - files will be stored in cloud');
} else {
  console.log('⚠ Cloudinary not configured - files will be stored locally (not recommended for production)');
}

const app = express();
app.use(express.json());
app.use(cors());

// Ensure directories
const UPLOADS_ROOT = path.join(__dirname, 'uploads');
const ASSIGNMENTS_DIR = path.join(UPLOADS_ROOT, 'assignments');
const RESOURCES_DIR = path.join(UPLOADS_ROOT, 'resources');
[UPLOADS_ROOT, ASSIGNMENTS_DIR, RESOURCES_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// File storage with multer (memory storage for Cloudinary, disk storage as fallback)
const storage = USE_CLOUDINARY ? multer.memoryStorage() : multer.diskStorage({
  destination: (req, file, cb) => cb(null, ASSIGNMENTS_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});

const uploadAssignment = multer({ storage });
const uploadResource = multer({ storage });
const uploadFeedback = multer({ storage });

// Helper: Upload to Cloudinary from buffer
async function uploadToCloudinary(fileBuffer, filename, folder){
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, public_id: Date.now() + '-' + filename.replace(/\s+/g, '_'), resource_type: 'auto' },
      (error, result) => error ? reject(error) : resolve(result)
    );
    uploadStream.end(fileBuffer);
  });
}

// Helper: Delete from Cloudinary
async function deleteFromCloudinary(publicId){
  try{
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  }catch(e){
    console.warn('Failed to delete from Cloudinary:', publicId, e);
  }
}

// SQLite DB (data.db in same folder)
const DB_PATH = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(DB_PATH);

const run = (sql, params=[]) => new Promise((res, rej) => db.run(sql, params, function(err){ if(err) rej(err); else res(this); }));
const get = (sql, params=[]) => new Promise((res, rej) => db.get(sql, params, (err, row) => err ? rej(err) : res(row)));
const all = (sql, params=[]) => new Promise((res, rej) => db.all(sql, params, (err, rows) => err ? rej(err) : res(rows)));

async function initDb(){
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'learner',
    awarding_body TEXT,
    level INTEGER,
    approved INTEGER DEFAULT 0,
    approved_by INTEGER,
    approved_at TEXT,
    created_at TEXT,
    expires_at TEXT,
    active INTEGER DEFAULT 1
  )`);

  // Add password reset columns if they don't exist (safe to run on existing DB)
  try{
    await run('ALTER TABLE users ADD COLUMN reset_token TEXT');
  }catch(e){}
  try{
    await run('ALTER TABLE users ADD COLUMN reset_expires TEXT');
  }catch(e){}

  await run(`CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    description TEXT,
    filename TEXT,
    filepath TEXT,
    uploaded_at TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER,
    assessor_id INTEGER,
    comment TEXT,
    created_at TEXT
  )`);

  // add feedback file columns if missing
  try{ await run('ALTER TABLE feedback ADD COLUMN filename TEXT') }catch(e){}
  try{ await run('ALTER TABLE feedback ADD COLUMN filepath TEXT') }catch(e){}

  await run(`CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    type TEXT,
    awarding_body TEXT,
    level INTEGER,
    filename TEXT,
    filepath TEXT,
    uploaded_at TEXT
  )`);
}

initDb().catch(err => { console.error('DB init error', err); process.exit(1); });

// Auth helpers
function signToken(payload){ return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }); }

async function authMiddleware(req, res, next){
  const auth = req.headers.authorization;
  if(!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
  const token = auth.slice(7);
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await get('SELECT * FROM users WHERE id = ?', [payload.userId]);
    if(!user) return res.status(401).json({ error: 'invalid user' });
    if(!user.active) return res.status(403).json({ error: 'account inactive' });
    if(!user.approved) return res.status(403).json({ error: 'account not approved yet' });
    if(user.expires_at && new Date() > new Date(user.expires_at)) return res.status(403).json({ error: 'account expired, contact admin' });
    req.user = user;
    next();
  }catch(err){
    return res.status(401).json({ error: 'invalid token' });
  }
}

function requireRole(role){
  return (req, res, next) => {
    if(!req.user) return res.status(401).end();
    if(req.user.role !== role && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

// Routes
app.post('/auth/register', async (req, res) => {
  try{
    const { name, email, password, awarding_body, level } = req.body;
    if(!email || !password) return res.status(400).json({ error: 'email and password required' });
    const hash = await bcrypt.hash(password, 10);
    const now = new Date();
    const expires = new Date(now.getTime() + 30*24*60*60*1000); // 30 days
    await run(`INSERT INTO users (name, email, password_hash, awarding_body, level, created_at, expires_at) VALUES (?,?,?,?,?,?,?)`,
      [name||'', email, hash, awarding_body||'', level||null, now.toISOString(), expires.toISOString()]);
    return res.json({ success: true, message: 'Registered. Awaiting approval.' });
  }catch(err){
    if(err && err.message && err.message.includes('UNIQUE')) return res.status(400).json({ error: 'email already exists' });
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

app.post('/auth/login', async (req, res) => {
  try{
    const { email, password } = req.body;
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if(!user) return res.status(400).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if(!ok) return res.status(400).json({ error: 'invalid credentials' });
    if(!user.active) return res.status(403).json({ error: 'account inactive' });
    if(!user.approved) return res.status(403).json({ error: 'account not approved' });
    if(user.expires_at && new Date() > new Date(user.expires_at)) return res.status(403).json({ error: 'account expired' });
    const token = signToken({ userId: user.id, role: user.role });
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, awarding_body: user.awarding_body, level: user.level } });
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// Request password reset (provides a token in response for development/testing).
app.post('/auth/request-reset', async (req, res) => {
  try{
    const { email } = req.body;
    if(!email) return res.status(400).json({ error: 'email required' });
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if(!user) return res.json({ success: true, message: 'If that email exists you will receive instructions' });
    const token = crypto.randomBytes(20).toString('hex');
    const expires = new Date(Date.now() + 60*60*1000).toISOString(); // 1 hour
    await run('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?', [token, expires, user.id]);
    // In production: send token via email with a reset link. For dev, return token in response.
    return res.json({ success: true, resetToken: token, message: 'Use this token to reset password (dev only).' });
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// Reset password using token
app.post('/auth/reset-password', async (req, res) => {
  try{
    const { token, newPassword } = req.body;
    if(!token || !newPassword) return res.status(400).json({ error: 'token and newPassword required' });
    const now = new Date().toISOString();
    const user = await get('SELECT * FROM users WHERE reset_token = ? AND reset_expires > ?', [token, now]);
    if(!user) return res.status(400).json({ error: 'invalid or expired token' });
    const hash = await bcrypt.hash(newPassword, 10);
    await run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?', [hash, user.id]);
    return res.json({ success: true, message: 'Password updated' });
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// Approve user (assessor/admin)
app.post('/users/:id/approve', authMiddleware, requireRole('assessor'), async (req, res) => {
  const id = req.params.id;
  try{
    const now = new Date().toISOString();
    await run('UPDATE users SET approved = 1, approved_by = ?, approved_at = ? WHERE id = ?', [req.user.id, now, id]);
    return res.json({ success: true });
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// Decline user (assessor/admin) — mark inactive
app.post('/users/:id/decline', authMiddleware, requireRole('assessor'), async (req, res) => {
  const id = req.params.id;
  try{
    await run('UPDATE users SET approved = 0, active = 0 WHERE id = ?', [id]);
    return res.json({ success: true });
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// List pending users (assessor/admin)
app.get('/users/pending', authMiddleware, requireRole('assessor'), async (req, res) => {
  try{
    const rows = await all('SELECT id, name, email, awarding_body, level, created_at FROM users WHERE approved = 0 ORDER BY created_at DESC');
    return res.json(rows);
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// List all users (assessor/admin)
app.get('/users', authMiddleware, requireRole('assessor'), async (req, res) => {
  try{
    const rows = await all('SELECT id, name, email, role, awarding_body, level, approved, active, created_at FROM users ORDER BY created_at DESC');
    return res.json(rows);
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// Upload assignment
app.post('/assignments/upload', authMiddleware, uploadAssignment.single('file'), async (req, res) => {
  try{
    const { title, description } = req.body;
    if(!req.file) return res.status(400).json({ error: 'file required' });
    const now = new Date().toISOString();
    
    let filepath = req.file.path; // local path as fallback
    if(USE_CLOUDINARY){
      const result = await uploadToCloudinary(req.file.buffer, req.file.originalname, 'assignments');
      filepath = result.secure_url; // store Cloudinary URL
    }
    
    await run(`INSERT INTO assignments (user_id, title, description, filename, filepath, uploaded_at) VALUES (?,?,?,?,?,?)`,
      [req.user.id, title||'', description||'', req.file.originalname, filepath, now]);
    return res.json({ success: true });
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// List my assignments
app.get('/assignments/my', authMiddleware, async (req, res) => {
  try{
    const rows = await all('SELECT * FROM assignments WHERE user_id = ?', [req.user.id]);
    // attach feedback entries to each assignment
    const withFeedback = await Promise.all(rows.map(async a => {
      const fb = await all('SELECT f.*, u.name as assessor_name FROM feedback f LEFT JOIN users u ON u.id = f.assessor_id WHERE f.assignment_id = ? ORDER BY f.created_at DESC', [a.id]);
      return Object.assign({}, a, { feedback: fb });
    }));
    return res.json(withFeedback);
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// Assessor: list all assignments (simple)
app.get('/assignments', authMiddleware, requireRole('assessor'), async (req, res) => {
  try{
    const rows = await all('SELECT a.*, u.name as student_name, u.email as student_email, u.awarding_body as student_awarding_body, u.level as student_level FROM assignments a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.uploaded_at DESC');
    const withFeedback = await Promise.all(rows.map(async a => {
      const fb = await all('SELECT f.*, u.name as assessor_name FROM feedback f LEFT JOIN users u ON u.id = f.assessor_id WHERE f.assignment_id = ? ORDER BY f.created_at DESC', [a.id]);
      return Object.assign({}, a, { feedback: fb });
    }));
    return res.json(withFeedback);
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// Download assignment (assessor or owner)
app.get('/assignments/:id/download', authMiddleware, async (req, res) => {
  try{
    const id = req.params.id;
    const a = await get('SELECT * FROM assignments WHERE id = ?', [id]);
    if(!a) return res.status(404).json({ error: 'not found' });
    if(req.user.role !== 'assessor' && req.user.id !== a.user_id && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    
    // If using Cloudinary, redirect to the URL; otherwise serve local file
    if(USE_CLOUDINARY && a.filepath.startsWith('http')){
      return res.redirect(a.filepath);
    }
    return res.download(a.filepath, a.filename);
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// Feedback (accept optional file upload)
app.post('/assignments/:id/feedback', authMiddleware, requireRole('assessor'), uploadFeedback.single('file'), async (req, res) => {
  try{
    const assignment_id = req.params.id;
    const comment = req.body.comment || '';
    const now = new Date().toISOString();
    if(req.file){
      let filepath = req.file.path;
      if(USE_CLOUDINARY){
        const result = await uploadToCloudinary(req.file.buffer, req.file.originalname, 'feedback');
        filepath = result.secure_url;
      }
      await run('INSERT INTO feedback (assignment_id, assessor_id, comment, created_at, filename, filepath) VALUES (?,?,?,?,?,?)', [assignment_id, req.user.id, comment, now, req.file.originalname, filepath]);
    } else {
      await run('INSERT INTO feedback (assignment_id, assessor_id, comment, created_at) VALUES (?,?,?,?)', [assignment_id, req.user.id, comment, now]);
    }
    return res.json({ success: true });
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// Download feedback attached file
app.get('/feedback/:id/download', authMiddleware, async (req, res) => {
  try{
    const id = req.params.id;
    const fb = await get('SELECT f.*, a.user_id as owner_id FROM feedback f LEFT JOIN assignments a ON a.id = f.assignment_id WHERE f.id = ?', [id]);
    if(!fb) return res.status(404).json({ error: 'not found' });
    if(!fb.filepath) return res.status(404).json({ error: 'no file attached' });
    // allow assessor who created feedback, the assignment owner, or admin
    if(req.user.role !== 'admin' && req.user.id !== fb.assessor_id && req.user.id !== fb.owner_id) return res.status(403).json({ error: 'forbidden' });
    
    if(USE_CLOUDINARY && fb.filepath.startsWith('http')){
      return res.redirect(fb.filepath);
    }
    return res.download(fb.filepath, fb.filename);
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// Upload resource (assessor/admin)
app.post('/resources/upload', authMiddleware, requireRole('assessor'), uploadResource.single('file'), async (req, res) => {
  try{
    const { title, type, awarding_body, level } = req.body;
    if(!req.file) return res.status(400).json({ error: 'file required' });
    const now = new Date().toISOString();
    
    let filepath = req.file.path;
    if(USE_CLOUDINARY){
      const result = await uploadToCloudinary(req.file.buffer, req.file.originalname, 'resources');
      filepath = result.secure_url;
    }
    
    await run('INSERT INTO resources (title, type, awarding_body, level, filename, filepath, uploaded_at) VALUES (?,?,?,?,?,?,?)',
      [title||req.file.originalname, type||'', awarding_body||'', level||null, req.file.originalname, filepath, now]);
    return res.json({ success: true });
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// List resources filtered by awarding body & level
app.get('/resources', authMiddleware, async (req, res) => {
  try{
    // If user is learner, only show matching awarding_body/level
    const qb = [];
    const params = [];
    if(req.user.role === 'learner'){
      qb.push('awarding_body = ?'); params.push(req.user.awarding_body || '');
      qb.push('level = ?'); params.push(req.user.level || null);
    } else {
      if(req.query.awarding_body){ qb.push('awarding_body = ?'); params.push(req.query.awarding_body); }
      if(req.query.level){ qb.push('level = ?'); params.push(req.query.level); }
    }
    const where = qb.length ? ('WHERE ' + qb.join(' AND ')) : '';
    const rows = await all(`SELECT * FROM resources ${where} ORDER BY uploaded_at DESC`, params);
    return res.json(rows);
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// Download resource
app.get('/resources/:id/download', authMiddleware, async (req, res) => {
  try{
    const r = await get('SELECT * FROM resources WHERE id = ?', [req.params.id]);
    if(!r) return res.status(404).json({ error: 'not found' });
    // learners can only download matching levels (enforced in listing and here)
    if(req.user.role === 'learner'){
      if(req.user.awarding_body !== r.awarding_body || String(req.user.level) !== String(r.level)) return res.status(403).json({ error: 'forbidden' });
    }
    
    if(USE_CLOUDINARY && r.filepath.startsWith('http')){
      return res.redirect(r.filepath);
    }
    return res.download(r.filepath, r.filename);
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// Simple re-activate endpoint
app.post('/users/:id/reactivate', authMiddleware, requireRole('assessor'), async (req, res) => {
  try{
    await run('UPDATE users SET active = 1 WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// Assessor: list assignments for a specific user
app.get('/users/:id/assignments', authMiddleware, requireRole('assessor'), async (req, res) => {
  try{
    const userId = req.params.id;
    const rows = await all('SELECT a.*, u.name as student_name, u.email as student_email, u.awarding_body as student_awarding_body, u.level as student_level FROM assignments a LEFT JOIN users u ON u.id = a.user_id WHERE a.user_id = ? ORDER BY a.uploaded_at DESC', [userId]);
    const withFeedback = await Promise.all(rows.map(async a => {
      const fb = await all('SELECT f.*, u.name as assessor_name FROM feedback f LEFT JOIN users u ON u.id = f.assessor_id WHERE f.assignment_id = ? ORDER BY f.created_at DESC', [a.id]);
      return Object.assign({}, a, { feedback: fb });
    }));
    return res.json(withFeedback);
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// Delete an assignment (owner-only). Also remove any attached files and feedback rows/files.
app.delete('/assignments/:id', authMiddleware, async (req, res) => {
  try{
    const id = req.params.id;
    const a = await get('SELECT * FROM assignments WHERE id = ?', [id]);
    if(!a) return res.status(404).json({ error: 'not found' });
    // only owner (learner) or admin may delete; assessors should not delete learners' submissions directly
    if(req.user.role !== 'admin' && req.user.id !== a.user_id) return res.status(403).json({ error: 'forbidden' });

    // delete feedback files attached to this assignment
    const fbs = await all('SELECT * FROM feedback WHERE assignment_id = ?', [id]);
    for(const fb of fbs){
      if(fb.filepath && fs.existsSync(fb.filepath)){
        try{ fs.unlinkSync(fb.filepath) }catch(e){ console.warn('failed to delete feedback file', fb.filepath, e) }
      }
    }
    // delete feedback rows
    await run('DELETE FROM feedback WHERE assignment_id = ?', [id]);

    // delete assignment file
    if(a.filepath && fs.existsSync(a.filepath)){
      try{ fs.unlinkSync(a.filepath) }catch(e){ console.warn('failed to delete assignment file', a.filepath, e) }
    }
    // delete assignment row
    await run('DELETE FROM assignments WHERE id = ?', [id]);
    return res.json({ success: true });
  }catch(err){ console.error(err); return res.status(500).json({ error: 'server error' }); }
});

// TEMPORARY: Create assessor endpoint (REMOVE AFTER USE!)
app.post('/admin/create-assessor-temp', async (req, res) => {
  try {
    const { secret, name, email, password } = req.body;
    
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

app.get('/', (req, res) => res.json({ ok: true, message: 'Portfolio app API' }));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
