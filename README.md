# Smart Poultry Decisions — Web App

Full-stack Next.js 14 application with Neon.tech PostgreSQL database, admin-approval user registration, and Netlify deployment.

---

## 🚀 Quick Setup (5 steps)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Neon Database

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project (e.g. "spd-app")
3. In your project dashboard, copy the **Connection String** (it looks like `postgresql://...`)
4. The app will **auto-create the `users` table** on first API call — no manual SQL needed

### 3. Configure Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# From your Neon.tech dashboard
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Generate a strong random secret (e.g. run: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-change-this

# Admin login credentials (you choose these)
ADMIN_EMAIL=admin@smartpoultry.pro
ADMIN_PASSWORD=your-strong-admin-password
```

### 4. Run Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Netlify

**Option A — Netlify UI (recommended):**
1. Push this project to a GitHub repo
2. Go to [app.netlify.com](https://app.netlify.com) → "Add new site" → "Import from Git"
3. Select your repo, set build command to `npm run build`, publish dir to `.next`
4. Go to **Site settings → Environment variables** and add all variables from `.env.local`
5. Click Deploy

**Option B — Netlify CLI:**
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

---

## 🗂️ Project Structure

```
spd-app/
├── app/
│   ├── page.tsx              # Landing page + Login + Signup (all in one)
│   ├── dashboard/page.tsx    # Approved user dashboard
│   ├── pending/page.tsx      # Pending approval waiting screen
│   ├── admin/page.tsx        # Admin panel (approve/reject users)
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts    # POST /api/auth/login
│   │   │   ├── signup/route.ts   # POST /api/auth/signup
│   │   │   └── logout/route.ts   # POST /api/auth/logout
│   │   └── admin/
│   │       └── users/route.ts    # GET/PATCH /api/admin/users
│   ├── globals.css
│   └── layout.tsx
├── lib/
│   ├── db.ts                 # Neon database connection + queries
│   └── auth.ts               # JWT token helpers
├── .env.local.example
├── netlify.toml
├── next.config.js
└── package.json
```

---

## 🔐 How Authentication Works

### User Flow
1. User visits landing page → clicks **"Apply for Access"**
2. Fills out signup form (name, email, password, farm details)
3. Account is created with status: `pending`
4. User sees **"Application Pending"** screen
5. Admin reviews and **approves** the account
6. User can now log in and access the **Dashboard**

### Admin Flow
1. Admin logs in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env.local`
2. Redirected to **Admin Panel** at `/admin`
3. Can view all signups filtered by status (pending / approved / rejected)
4. Click **Approve** or **Reject** with optional notes
5. Can change status at any time (e.g. re-approve a rejected user)

### Security
- Passwords hashed with **bcrypt** (12 rounds)
- Sessions managed via **HttpOnly JWT cookies** (7-day expiry)
- Admin routes protected server-side via cookie verification
- Database uses **SSL** (Neon enforces this by default)

---

## 🗄️ Database Schema

The `users` table is auto-created on first request:

| Column       | Type        | Description                          |
|-------------|-------------|--------------------------------------|
| id           | SERIAL PK   | Auto-increment                       |
| name         | VARCHAR     | Full name                            |
| email        | VARCHAR     | Unique email                         |
| password_hash| VARCHAR     | bcrypt hash                          |
| farm_name    | VARCHAR     | Optional farm name                   |
| farm_size    | VARCHAR     | Bird count range                     |
| phone        | VARCHAR     | Optional phone                       |
| status       | VARCHAR     | `pending` / `approved` / `rejected`  |
| role         | VARCHAR     | `user` / `admin`                     |
| created_at   | TIMESTAMP   | Registration date                    |
| approved_at  | TIMESTAMP   | When approved                        |
| notes        | TEXT        | Admin notes                          |

---

## 🎨 Design

- **Color scheme:** Deep crimson red (#dc2626) on dark backgrounds (#0a0a0a)
- **Fonts:** Bebas Neue (display) + DM Sans (body) via Google Fonts
- **Theme:** Industrial/editorial — bold typography, red accents, dark panels

---

## ⚙️ Netlify Environment Variables to Set

In Netlify dashboard → Site settings → Environment variables:

| Key              | Value                          |
|-----------------|--------------------------------|
| `DATABASE_URL`   | Your Neon connection string    |
| `JWT_SECRET`     | Random 32+ char secret         |
| `ADMIN_EMAIL`    | Your admin login email         |
| `ADMIN_PASSWORD` | Your admin login password      |

---

## 📞 Support

Smart Poultry Decisions — Maseru, Lesotho  
info@smartpoultry.pro | www.smartpoultry.pro
