# Deployment Guide

## 🎯 Quick Start (Recommended Path)

### Step 0: Setup Cloudinary (FREE - 5 minutes)
**This gives you PERMANENT file storage on free tier!**

1. Go to [cloudinary.com](https://cloudinary.com) → Sign up (free)
2. After signup, go to Dashboard
3. Copy these 3 values:
   - **Cloud Name**
   - **API Key** 
   - **API Secret**
4. Keep these handy for Step 1 below

---

## Quick Deploy on Render.com (Free)

### Prerequisites
1. Push code to GitHub
2. Create account at [render.com](https://render.com)

### Step 1: Deploy Backend
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name:** `portfolio-backend`
   - **Root Directory:** Leave empty
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment Variables:**
     - `JWT_SECRET`: Generate secure string (e.g., use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
     - `PORT`: 4000
     - `CLOUDINARY_CLOUD_NAME`: (paste from Step 0)
     - `CLOUDINARY_API_KEY`: (paste from Step 0)
     - `CLOUDINARY_API_SECRET`: (paste from Step 0)

4. Click "Create Web Service"
5. **Copy the URL** (e.g., `https://portfolio-backend-xyz.onrender.com`)
6. ✅ Your files are now stored permanently in Cloudinary!

### Step 2: Deploy Frontend
1. Click "New +" → "Static Site"
2. Connect same GitHub repository
3. Configure:
   - **Name:** `portfolio-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `.next`
   - **Environment Variables:**
     - `NEXT_PUBLIC_API_BASE`: (paste backend URL from Step 1)

4. Click "Create Static Site"
5. **Copy the frontend URL** - this is what you share with your employer!

### Step 3: Create Initial Assessor Account
Once deployed, run this locally to create an assessor:
```powershell
$env:DATABASE_URL="your_backend_url"; node create_assessor.js
```

Or SSH into Render backend and run:
```bash
node create_assessor.js
```

---

## Alternative: Railway.app (Free)

### Backend:
1. Go to [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add service → Select root directory
5. Add environment variables:
   - `JWT_SECRET`: (secure random string)
   - `CLOUDINARY_CLOUD_NAME`: (from cloudinary.com)
   - `CLOUDINARY_API_KEY`: (from cloudinary.com)
   - `CLOUDINARY_API_SECRET`: (from cloudinary.com)
6. Deploy and copy URL

### Frontend:
1. Add service → Same repo → Select `frontend` directory
2. Add environment variable:
   - `NEXT_PUBLIC_API_BASE`: (backend URL)
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Deploy and copy URL

---

## Alternative: Vercel (Frontend) + Render (Backend)

### Backend on Render:
- Follow Step 1 from Render instructions above

### Frontend on Vercel:
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set **Root Directory:** `frontend`
4. Add Environment Variable:
   - `NEXT_PUBLIC_API_BASE`: (your backend URL)
5. Deploy
6. Copy the Vercel URL

---

## Important Notes

### ✅ File Uploads (SOLVED!)
- **This app now uses Cloudinary for file storage**
- All uploaded files are stored permanently in the cloud (even on free tier!)
- Free Cloudinary tier includes:
  - 25GB storage
  - 25GB bandwidth per month
  - More than enough for most use cases
- If you don't configure Cloudinary, files will be stored locally (and lost on restart)

### Database Persistence
- **Render/Railway free tier:** Database (SQLite) resets on inactivity
- **For production use:** Upgrade to paid tier OR use external database:
  - Add PostgreSQL add-on on Render/Railway
  - Or use [Neon.tech](https://neon.tech/) (free PostgreSQL with persistence)
  - Or use [PlanetScale](https://planetscale.com/) (free MySQL tier)

### CORS Configuration
The backend already has CORS enabled for all origins. For production, consider restricting to your frontend domain only.

---

## Testing Deployment

After deployment:
1. Visit frontend URL
2. Try registering as a learner
3. Use create_assessor.js to create an assessor account
4. Test login for both roles
5. Test file upload/download
6. Verify feedback system works

---

## Troubleshooting

**"Cannot connect to backend"**
- Check NEXT_PUBLIC_API_BASE is correct
- Verify backend is running (check Render/Railway logs)
- Check CORS settings

**"Database errors"**
- Backend creates data.db automatically on first run
- Check backend has write permissions

**"Upload fails"**
- Verify uploads/ directory exists
- Check file size limits (default: unlimited in multer)
- Check disk space on hosting platform

---

## Sharing with Employer

Once deployed, share:
1. **Frontend URL** (e.g., `https://your-portfolio.vercel.app`)
2. **Demo credentials:**
   - Learner: (create test account)
   - Assessor: (use create_assessor.js to create)

3. **Brief overview:**
   - Full-stack e-portfolio system
   - Next.js frontend + Node.js/Express backend
   - Features: user management, file uploads, feedback system, resource library
   - Role-based access (learner/assessor)
