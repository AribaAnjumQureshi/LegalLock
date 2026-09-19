# LegalLock — implementation and run steps

## 1. Backend
```bash
cd backend
cp .env.example .env
```
Set `DATABASE_URL`, `JWT_SECRET`, and `BOOTSTRAP_ADMIN_EMAIL` in `.env`.

Install and initialize:
```bash
npm install
npm run db:init
npm run dev
```

The first account registered with the exact `BOOTSTRAP_ADMIN_EMAIL` becomes `admin`. Other new accounts are `officer` by default.

## 2. Frontend
From the project root:
```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Open the Next.js URL shown by the terminal.

## 3. Authentication
Login requires all three:
- Username
- Email
- Password

The API returns a JWT and the actual user. The frontend stores the session and displays the logged-in username everywhere.

## 4. Document access
A user who does not own a document and does not already have permission can request:
- `read`
- `write`

An administrator reviews requests from **Activity Log**.

The backend, not the UI, enforces permissions:
- owner: read/write
- admin: read/write
- approved read: read
- approved write: read/write
- everyone else: denied

## 5. Version control
Uploading creates version 1. A user with write permission can create later versions with:
```http
PUT /api/documents/:id
```
Version history:
```http
GET /api/documents/:id/versions
```

Old version files are not overwritten.

## 6. Main API
```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

GET  /api/dashboard

GET  /api/documents
POST /api/documents
GET  /api/documents/:id
GET  /api/documents/:id/download
GET  /api/documents/:id/verify
POST /api/documents/:id/access-request
GET  /api/documents/:id/versions
PUT  /api/documents/:id

GET  /api/access-requests          # admin
PATCH /api/access-requests/:id     # admin
GET  /api/my-access-requests

GET  /api/activity                 # admin sees all; other users see their own
```

## 7. Dashboard values
Dashboard statistics are now calculated from PostgreSQL. They are not hardcoded demo values. Therefore, if the database contains 7 documents and the corresponding statuses/classifications, the dashboard will show 7 and the matching counts. A fresh database starts at zero.

## 8. Important security note
Do not reintroduce `req.user?.id || 1`, fixed demo users, `currentUser`, or plaintext passwords. The authenticated JWT identity is the source of truth.
