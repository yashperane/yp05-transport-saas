# Sherkar Fleet & Transport Management SaaS

A modern, scalable, multi-tenant Transport and Fleet Management SaaS platform built on the **MERN** stack (MongoDB, Express.js, React, Node.js).

Designed for transport operators like **Sherkar** operating pickup/tempo vehicles transporting laborers and goods across companies, contractors, and individuals.

---

## 🛠️ Technology Stack (Pure MERN)
- **Backend:** Node.js, Express.js (ES Modules), Socket.IO
- **Frontend:** React (Vite, JSX), Tailwind CSS, Lucide Icons
- **Database:** MongoDB & Mongoose
- **Real-Time:** Socket.IO
- **Maps (Planned):** Google Maps Platform (Routes, Directions, Live GPS)

---

## 📁 Project Directory Structure
```
transport-saas/
├── backend/
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── src/
│       ├── config/
│       │   ├── env.js
│       │   └── database.js
│       ├── routes/
│       │   └── health.js
│       └── server.js
├── frontend/
│   ├── .env.example
│   ├── .env
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       └── index.css
└── README.md
```

---

## 🚀 How to Run the Project

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
Backend will start on: **`http://localhost:5000`**
Health check endpoint: **`http://localhost:5000/api/health`**

### 2. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend will run on: **`http://localhost:5173`**

---

## 🔑 Environment Variables

### Backend (`backend/.env`)
- `PORT`: `5000`
- `NODE_ENV`: `development`
- `CLIENT_URL`: `http://localhost:5173`
- `MONGODB_URI`: `mongodb://127.0.0.1:27017/transport-saas`
- `JWT_SECRET`: `dev_jwt_secret_transport_saas_pilot_2026`

### Frontend (`frontend/.env`)
- `VITE_API_URL`: `http://localhost:5000`

---

## 🗺️ Roadmap
- **Chapter 1:** Project Foundation & Architecture (Completed)
- **Chapter 2:** Authentication, Roles & Company Management
- **Chapter 3:** Driver & Vehicle Fleet Management
- **Chapter 4:** Order Lifecycle & Duplicate Detection
- **Chapter 5:** Atomic Dispatch & Real-Time Socket.IO Driver Claiming
- **Chapter 6:** Google Maps, ETA & Controlled Live Tracking
- **Chapter 7:** Pricing Models & Customer Billing
