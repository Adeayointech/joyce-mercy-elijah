# ⚡ Quick Deployment Checklist

Follow this step-by-step to deploy in ~15 minutes:

## ☑️ Pre-Deployment (5 min)

### 1. Setup Cloudinary (FREE permanent storage)
- [ ] Go to [cloudinary.com](https://cloudinary.com) → Create free account
- [ ] Go to Dashboard → Copy these 3 values:
  - Cloud Name: ________________
  - API Key: ________________
  - API Secret: ________________

### 2. Push to GitHub
```powershell
cd "c:\Users\user\AppData\Local\Android\Sdk\extras\portfolio-app"
git init
git add .
git commit -m "Initial commit"
git branch -M main
# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## ☑️ Backend Deployment (5 min)

### Using Render.com:
- [ ] Go to [render.com](https://render.com) → Sign up
- [ ] Click "New +" → "Web Service"
- [ ] Connect GitHub → Select your repo
- [ ] Configure:
  - Build Command: `npm install`
  - Start Command: `node server.js`
- [ ] Add Environment Variables:
  - `JWT_SECRET`: Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - `PORT`: `4000`
  - `CLOUDINARY_CLOUD_NAME`: (paste from Step 1)
  - `CLOUDINARY_API_KEY`: (paste from Step 1)
  - `CLOUDINARY_API_SECRET`: (paste from Step 1)
- [ ] Click "Create Web Service"
- [ ] Copy backend URL: ________________________________

---

## ☑️ Frontend Deployment (5 min)

### Using Render.com:
- [ ] Click "New +" → "Static Site"
- [ ] Connect GitHub → Same repo
- [ ] Configure:
  - Root Directory: `frontend`
  - Build Command: `npm install && npm run build`
  - Publish Directory: `.next`
- [ ] Add Environment Variable:
  - `NEXT_PUBLIC_API_BASE`: (paste backend URL from above)
- [ ] Click "Create Static Site"
- [ ] Copy frontend URL: ________________________________

**✅ This is the link to share with your employer!**

---

## ☑️ Post-Deployment (2 min)

### Create Assessor Account:
Option A - Via Render Shell:
1. Go to Render dashboard → Your backend service
2. Click "Shell" tab
3. Run: `node create_assessor.js`
4. Follow prompts

Option B - Locally (if database accessible):
```powershell
cd "c:\Users\user\AppData\Local\Android\Sdk\extras\portfolio-app"
node create_assessor.js
```

### Test Your Deployment:
- [ ] Visit frontend URL
- [ ] Register as a learner
- [ ] Login as assessor (created above)
- [ ] Test file upload (check Cloudinary dashboard to confirm)
- [ ] Test feedback system

---

## 📧 Share with Employer

Send them:
1. **Frontend URL:** ________________________________
2. **Demo Credentials:**
   - Learner email: ________________
   - Learner password: ________________
   - Assessor email: ________________
   - Assessor password: ________________

3. **Brief Description:**
```
Hi [Employer Name],

I've deployed the e-portfolio system. Here's the live demo:

🔗 Application URL: [your-frontend-url]

Demo Accounts:
- Learner: [email] / [password]
- Assessor: [email] / [password]

Features:
✅ User registration & approval workflow
✅ Assignment upload & feedback system
✅ Resource library with access control
✅ Cloud storage (Cloudinary) - files stored permanently
✅ Role-based dashboards (Learner & Assessor)

Technical Stack:
- Frontend: Next.js/React
- Backend: Node.js/Express
- Database: SQLite (can migrate to PostgreSQL)
- File Storage: Cloudinary (25GB free tier)
- Hosting: Render.com (free tier)

Let me know if you'd like any changes or have questions!
```

---

## 🚨 Troubleshooting

**Backend not starting?**
- Check logs in Render dashboard
- Verify all environment variables are set
- Ensure JWT_SECRET is set

**Frontend can't connect to backend?**
- Check NEXT_PUBLIC_API_BASE matches backend URL
- Verify backend is running (visit backend-url in browser)
- Check for CORS errors in browser console

**File upload fails?**
- Check Cloudinary credentials are correct
- Check backend logs for Cloudinary errors
- Verify you're within free tier limits (25GB)

**"Account not approved" error?**
- Run create_assessor.js to create assessor
- Login as assessor and approve pending users

---

## 💰 Free Tier Limits

**Render.com (Free):**
- ✅ 750 hours/month (enough for 1 service)
- ⚠️ Sleeps after 15 min inactivity (wakes in ~30 sec)
- ✅ No credit card required

**Cloudinary (Free):**
- ✅ 25GB storage
- ✅ 25GB bandwidth/month
- ✅ Unlimited transformations
- ✅ No credit card required

**To Upgrade Later:**
- Render: $7/month for always-on + persistent disk
- Railway: $5-10/month with $5 free credit monthly
- Consider PostgreSQL for production database
