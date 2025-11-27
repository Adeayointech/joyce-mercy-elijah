# Portfolio App (MVP Backend)

This folder contains a minimal Node/Express backend scaffold for the e-portfolio app MVP.

Quick start (Windows PowerShell):

```powershell
cd "c:\Users\user\AppData\Local\Android\Sdk\extras\portfolio-app"
npm install
npm run dev
```

Environment:
- `PORT` (optional)
- `JWT_SECRET` (set a secure value in production)

Notes:
- Uses SQLite (`data.db`) for quick local development.
- Uploads are stored in `uploads/assignments` and `uploads/resources`.
- Endpoints include registration, login, file upload/download, approval, feedback, and resource management.
