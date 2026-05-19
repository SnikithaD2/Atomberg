# ⚛ AtomQuest — Goal Setting & Tracking Portal

A full-stack goal management system with role-based access for **Employees**, **Managers**, and **Admins**. Built with React + Vite (frontend) and Node.js + Express + MongoDB Atlas (backend).

---

## 📁 Folder Structure

```
atomquest/
├── backend/
│   ├── middleware/
│   │   └── auth.js           # JWT auth + role guard middleware
│   ├── models/
│   │   ├── User.js           # User schema (employee/manager/admin)
│   │   ├── Goal.js           # Goal schema with achievements & check-ins
│   │   └── AuditLog.js       # Audit trail schema
│   ├── routes/
│   │   ├── auth.js           # Login, register, /me, list users
│   │   ├── goals.js          # All goal CRUD + approve/rework/checkin
│   │   └── audit.js          # Audit log endpoints
│   ├── .env                  # ← YOU MUST FILL THIS IN
│   ├── .env.example
│   ├── package.json
│   ├── seed.js               # Seeds DB with demo users + goals
│   └── server.js             # Express app entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx    # App shell (topbar + outlet)
│   │   │   ├── Sidebar.jsx   # Role-aware sidebar nav
│   │   │   └── UI.jsx        # Shared: Avatar, Toast, Modal, Badge, etc.
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Auth state, login/logout
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── MyGoalsPage.jsx
│   │   │   ├── AchievementsPage.jsx
│   │   │   ├── ApprovalsPage.jsx
│   │   │   ├── ManagerAdminPages.jsx  # TeamGoals, CheckIns, AllGoals
│   │   │   └── AdminPages.jsx         # SharedGoals, Reports, Audit, Cycles
│   │   ├── utils/
│   │   │   ├── api.js        # Axios instance with JWT interceptor
│   │   │   └── helpers.js    # computeScore(), constants
│   │   ├── styles/
│   │   │   └── global.css    # All CSS (design tokens + components)
│   │   ├── App.jsx           # React Router setup + role guards
│   │   └── main.jsx          # ReactDOM entry point
│   ├── .env                  # VITE_API_URL
│   ├── .env.example
│   ├── index.html
│   └── package.json
│
├── .gitignore
├── package.json              # Root scripts to run both together
└── README.md
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd atomquest
npm run install:all
```

Or manually:
```bash
cd backend && npm install
cd ../frontend && npm install
```

---

### 2. Configure MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com) → Create a free cluster
2. Click **Connect** → **Drivers** → copy the connection string
3. Open `backend/.env` and replace the `MONGO_URI` value:

```env
MONGO_URI=mongodb+srv://youruser:yourpassword@yourcluster.mongodb.net/atomquest?retryWrites=true&w=majority
JWT_SECRET=pick_any_long_random_string_here
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

> ⚠️ Make sure your IP is whitelisted in Atlas → Network Access (or use 0.0.0.0/0 for dev)

---

### 3. Seed the Database

```bash
npm run seed
```

This creates demo users:

| Role     | Email                      | Password      |
|----------|----------------------------|---------------|
| Admin    | admin@atomquest.com        | Admin@123     |
| Manager  | manager@atomquest.com      | Manager@123   |
| Employee | priya@atomquest.com        | Employee@123  |
| Employee | rahul@atomquest.com        | Employee@123  |
| Employee | sneha@atomquest.com        | Employee@123  |

---

### 4. Run in Development

```bash
# From root — runs both backend (5000) and frontend (5173)
npm run dev
```

Or separately:
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🔑 Role Capabilities

| Feature                     | Employee | Manager | Admin |
|-----------------------------|----------|---------|-------|
| Create / edit goals         | ✅        | ❌       | ❌     |
| Submit goals for approval   | ✅        | ❌       | ❌     |
| Update quarterly achievements | ✅      | ❌       | ❌     |
| Approve / return goals      | ❌        | ✅       | ✅     |
| Add check-in comments       | ❌        | ✅       | ✅     |
| View team goals             | ❌        | ✅       | ✅     |
| Unlock approved goals       | ❌        | ❌       | ✅     |
| Push shared goals           | ❌        | ❌       | ✅     |
| View audit trail            | ❌        | ✅       | ✅     |
| Export CSV reports          | ❌        | ✅       | ✅     |
| Manage cycle windows        | ❌        | ❌       | ✅     |

---

## 🌐 Deployment

### Backend → Render

1. Push code to GitHub
2. New Web Service on [render.com](https://render.com)
3. **Root directory:** `backend`
4. **Build command:** `npm install`
5. **Start command:** `node server.js`
6. Add environment variables (same as `.env`)
7. Set `CLIENT_URL` to your deployed frontend URL

### Frontend → Vercel

1. New project on [vercel.com](https://vercel.com)
2. **Root directory:** `frontend`
3. **Build command:** `npm run build`
4. **Output directory:** `dist`
5. Add environment variable:
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   ```

---

## 🛠 API Endpoints

### Auth
| Method | Endpoint         | Access  | Description          |
|--------|------------------|---------|----------------------|
| POST   | /api/auth/login  | Public  | Login, returns JWT   |
| POST   | /api/auth/register | Public | Register new user  |
| GET    | /api/auth/me     | Auth    | Get current user     |
| GET    | /api/auth/users  | Auth    | List all users       |

### Goals
| Method | Endpoint                        | Access            |
|--------|---------------------------------|-------------------|
| GET    | /api/goals                      | Auth (role-aware) |
| POST   | /api/goals                      | Employee          |
| PUT    | /api/goals/:id                  | Employee/Admin    |
| DELETE | /api/goals/:id                  | Employee/Admin    |
| PATCH  | /api/goals/:id/achievement      | Employee          |
| PATCH  | /api/goals/:id/checkin          | Manager/Admin     |
| PATCH  | /api/goals/:id/approve          | Manager/Admin     |
| PATCH  | /api/goals/:id/rework           | Manager/Admin     |
| PATCH  | /api/goals/:id/unlock           | Admin             |
| POST   | /api/goals/shared               | Admin             |

### Audit
| Method | Endpoint              | Access         |
|--------|-----------------------|----------------|
| GET    | /api/audit            | Manager/Admin  |
| GET    | /api/audit/goal/:id   | Auth           |
