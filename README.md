# Cardpro - Professional Event Management & Smart Invitation Platform

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas or local MongoDB
- Cloudinary account
- Twilio account (WhatsApp)
- Beem Africa account (SMS)

### Server Setup
```bash
cd server
cp .env.example .env
# Fill in all environment variables
npm install
npm run dev
```

### Client Setup
```bash
cd client
cp .env.example .env
# Set REACT_APP_API_URL to your server URL
npm install
npm start
```

### Default Admin Login
- Username: `cardpro`
- Password: `tmj2026`

### Render Deployment
1. Create a Web Service for the server (`cd server && npm install` / `cd server && npm start`)
2. Create a Static Site for the client (`cd client && npm install && npm run build`)
3. Set all environment variables in Render dashboard

## Architecture

```
Cardpro/
├── server/          # Express.js API
│   └── src/
│       ├── models/       # MongoDB schemas
│       ├── controllers/  # Route handlers
│       ├── routes/       # Express routes
│       ├── middleware/   # Auth, upload, error
│       └── utils/        # Helpers
└── client/          # React.js frontend
    └── src/
        ├── pages/        # Page components
        ├── components/   # Reusable UI
        ├── layouts/      # Layout wrappers
        ├── api/          # API calls
        └── context/      # Auth context
```
