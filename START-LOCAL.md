# Cardpro — Kuendesha Locally (kwenye PC)

## Mahitaji
- Node.js imewekwa (angalia: `node -v`)
- Internet connection (kwa MongoDB Atlas + Cloudinary)

---

## Kuanzisha (Terminal 2 — Windows)

### Terminal 1 — Backend (Server)
```
cd C:\xampp\htdocs\Cardpro\server
npm run dev
```
Server itaanza kwenye: http://localhost:5000

### Terminal 2 — Frontend (Client)
```
cd C:\xampp\htdocs\Cardpro\client
npm run dev
```
App itafunguka kwenye: http://localhost:3000

---

## Kuingia
- URL: http://localhost:3000
- Username: **Cardpro**
- Password: **tmj2026**

## Scanner URL (local)
- http://localhost:3000/scanner

## Event Website (local)
- http://localhost:3000/event/{slug}?code={verificationCode}

---

## Kama MongoDB haitaconnect
Nenda: https://cloud.mongodb.com → Network Access → Add IP → Allow from Anywhere (0.0.0.0/0)

---

## Kurudi Render (production) baadaye
Badilisha client/.env:
```
REACT_APP_API_URL=https://cardpro-s7lk.onrender.com/api
```
Badilisha server/.env:
```
CLIENT_URL=https://cardpro-app.onrender.com
SERVER_URL=https://cardpro-s7lk.onrender.com
```
Kisha: `git add -A && git commit -m "deploy: restore production URLs" && git push`
