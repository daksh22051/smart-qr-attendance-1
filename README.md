# Smart Clinic Queue Manager

Full-stack queue management system for small clinics with real-time updates, token-based queues, and analytics dashboards.

## Project Structure

- `client/` → Next.js frontend
- `server/` → Express + Socket.io backend + Mongoose models

## Requirements

- Node.js 18+
- MongoDB (local or Atlas)

## Setup

### 1) Backend

```bash
cd server
npm install
```

Create `.env` in `server/`:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/smart-clinic
CLIENT_ORIGIN=http://localhost:3000
```

Run the server:

```bash
npm run dev
```

### 2) Frontend

```bash
cd client
npm install
```

Create `.env.local` in `client/`:

```
NEXT_PUBLIC_API_BASE=http://localhost:5000
```

Run the client:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Features

- Patient registration with token numbers
- Reception dashboard queue management
- Doctor dashboard with call-next
- Live public queue display
- Analytics cards
- Real-time updates via Socket.io

## API Endpoints

- `POST /api/patient/register`
- `GET /api/queue`
- `POST /api/queue/next`
- `DELETE /api/patient/:id`
