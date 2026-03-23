<p align="center">
  <h1 align="center">🎪 OpenEvent</h1>
  <p align="center"><strong>Open Source Event Registration & Ticketing Platform</strong></p>
  <p align="center">
    A production-ready, self-hosted platform for managing college tech fests, hackathons, and workshops — with automated ticketing, QR check-ins, and a real-time organizer dashboard.
  </p>
</p>

---

## 📌 What is OpenEvent?

OpenEvent is a **privacy-focused, self-hosted alternative** to commercial event platforms like Eventbrite or Luma. It gives colleges, student clubs, hackathon organizers, and conference committees **full control** over their event management, data ownership, and attendee experience — all in one unified platform.

### 🧩 Problems It Solves

| Problem | OpenEvent Solution |
|---|---|
| Scattered registrations (Google Forms, Sheets) | Centralized event management platform |
| Manual ticket generation | Automated digital tickets with unique QR codes |
| Chaotic venue entry management | QR-based check-in scanner with duplicate prevention |
| No attendee analytics | Real-time organizer dashboard with stats |
| Data privacy concerns with third-party tools | Self-hosted, open-source — you own your data |

---

## 🚀 Tech Stack


| Layer | Technology |
|---|---|
| **Frontend** | Next.js (App Router), React 19, TypeScript, TailwindCSS, Shadcn UI (Base UI), Zustand, Framer Motion |
| **Backend** | Node.js, Express.js, Prisma ORM, JWT Authentication, Zod Validation |
| **Database** | MongoDB (Atlas cloud or local instance) |
| **QR System** | `react-qr-code` (generation), `html5-qrcode` (scanning) |
| **Payments** | Stripe integration ready (`@stripe/stripe-js`) |

---

## ✨ Features

### 🔐 Authentication & Authorization
- Email/password registration and login with **JWT tokens**
- **Role-based access control**: `STUDENT`, `ORGANIZER`, `ADMIN`
- Protected routes — only organizers/admins can create and manage events
- Persistent auth state via Zustand store

### 📅 Event Management
- Organizers can **create**, **edit**, and **publish** events
- Events include title, description, date/time, venue, and capacity
- Event status lifecycle: `DRAFT → PUBLISHED → COMPLETED / CANCELLED`
- Public event listing with search and discovery

### 🎟️ Ticketing System
- Create **multiple ticket types** per event (Free, Paid, VIP, Early Bird)
- Each ticket type has a **price**, **quantity limit**, and **description**
- Real-time sold/remaining count tracking
- Instant **order processing** with payment status tracking

### 🎫 Digital Tickets & QR Codes
- Every purchased ticket generates a **unique QR code**
- Personalized digital ticket card with event details
- **Print to PDF** support for physical copies
- QR code viewable from the user dashboard

### 📷 QR Check-in Scanner
- Built-in **mobile-friendly camera scanner** for event entry
- Real-time ticket validation against the backend
- **Duplicate entry prevention** — each ticket can only be scanned once
- Instant success/failure feedback with attendee details

### 📊 Organizer Dashboard
- **Real-time statistics**: total events, tickets sold, revenue
- Attendee registration table with name, email, ticket type, and check-in status
- Manage ticket types for each event
- Link to the QR check-in scanner per event

### 👤 Student Dashboard
- View all purchased tickets with event details
- QR code popup for quick access at venue entry
- Ticket status tracking (Active / Checked In)

---

## 📄 Pages Overview (Static vs Dynamic)

| # | Page | Route | Type | Description |
|---|---|---|---|---|
| 1 | **Landing Page** | `/` | 🟢 Static | Hero section, features grid, and tech stack banner. No API calls. |
| 2 | **Event Listing** | `/events` | 🔵 Dynamic | Fetches all published events from the API and renders cards. |
| 3 | **Event Details** | `/events/[id]` | 🔵 Dynamic | Fetches event by ID, shows description, ticket types, and purchase dialog. |
| 4 | **Create Event** | `/events/create` | 🔵 Dynamic | Form to create a new event. Requires ORGANIZER/ADMIN role. Submits to API. |
| 5 | **Manage Event** | `/events/[id]/manage` | 🔵 Dynamic | Tabbed view with registrations table and ticket type management. Organizer-only. |
| 6 | **Check-in Scanner** | `/events/[id]/checkin` | 🔵 Dynamic | Camera-based QR scanner that validates tickets via API in real-time. |
| 7 | **Login** | `/login` | 🔵 Dynamic | Login form with email/password. Authenticates via API and stores JWT. |
| 8 | **Register** | `/register` | 🔵 Dynamic | Sign-up form for new users. Sends data to the registration API. |
| 9 | **Dashboard** | `/dashboard` | 🔵 Dynamic | Role-based dashboard. Students see tickets; Organizers see stats + tickets. |
| 10 | **Ticket View** | `/ticket/[registrationId]` | 🔵 Dynamic | Digital ticket with QR code, event info, and print-to-PDF support. |
=======
- **Frontend**: Next.js 15 (App Router), TailwindCSS, Shadcn UI (Base UI), Zustand, Framer Motion
- **Backend**: Node.js, Express, Prisma ORM, JWT Auth, Zod
- **Database**: MongoDB (Atlas or Local)
- **Infrastructure**: Redis (Upstash or Local)


> **Legend**: 🟢 Static = Content is hardcoded, no backend dependency. 🔵 Dynamic = Content is fetched from the backend API at runtime.

---

## 🗄️ Database Schema (MongoDB)

| Collection | Key Fields | Purpose |
|---|---|---|
| **Users** | email, password (hashed), name, role | Auth & role management |
| **Events** | title, description, date, location, capacity, status, organizerId | Event catalog |
| **TicketTypes** | eventId, name, price, limit, sold | Ticket categories per event |
| **Orders** | userId, eventId, totalAmount, paymentRef, status | Purchase tracking |
| **Tickets** | qrCodeValue, userId, eventId, ticketTypeId, orderId, isCheckedIn | Issued tickets |
| **CheckInLogs** | ticketId, scannedAt, scannedBy, status | Entry audit trail |

---

## 🔌 API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Create a new user account |
| POST | `/login` | Public | Login and receive JWT token |

### Events (`/api/events`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Public | List all published events |
| GET | `/:id` | Public | Get event details by ID |
| POST | `/` | Organizer/Admin | Create a new event |
| PUT | `/:id` | Organizer/Admin | Update event details |
| PATCH | `/:id/status` | Organizer/Admin | Update event status |

### Tickets (`/api/tickets`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/types/:eventId` | Public | Get ticket types for an event |
| POST | `/types/:eventId` | Organizer/Admin | Create a ticket type |
| POST | `/order` | Authenticated | Purchase a ticket |
| GET | `/my-tickets` | Authenticated | Get user's tickets |
| GET | `/my-registrations` | Authenticated | Get user's registrations |

### Check-in (`/api/checkin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Organizer/Admin | Validate and check-in a ticket |

### Dashboard (`/api/dashboard`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/stats` | Organizer/Admin | Get organizer stats (events, revenue, tickets sold) |
| GET | `/events/:id/registrations` | Organizer/Admin | Get attendee list for an event |

---

## 🛠️ Getting Started

### Prerequisites

<<<<<<< main
- **Node.js** v18 or higher
- **MongoDB** — Atlas (free tier) or a local MongoDB installation
- **npm** (comes with Node.js)

### 1. Clone the Repository

```bash
git clone <repo-url>
cd <repo-name>
```

### 2. Backend Setup
- Node.js (v18+)
- MongoDB Atlas cluster (free tier) or Local MongoDB installed
- Upstash Redis database (free tier) or Local Redis

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd <repo-name>
   ```

2. **Backend Setup**
   ```bash
   cd apps/backend
   npm install
   cp .env.example .env
   # Update .env with your DATABASE_URL and JWT_SECRET
   npx prisma generate
   npx prisma migrate dev
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd apps/frontend
   npm install
   cp .env.example .env.local
   # Update NEXT_PUBLIC_API_URL (default: http://localhost:5000/api)
   npm run dev
   ```

## 🏗️ Project Structure


```bash
cd apps/backend
npm install

# Create your environment file
cp .env.example .env
```

Edit `.env` with your values:
```env
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db-name>"
JWT_SECRET="your-secure-secret-key"
PORT=5000
```

Then run:
```bash
npx prisma generate    # Generate Prisma client
npx prisma db push     # Push schema to MongoDB
npm run dev             # Start backend on http://localhost:5000
```

### 3. Frontend Setup

```bash
cd apps/frontend
npm install

# Create your environment file
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
```

Then run:
```bash
npm run dev    # Start frontend on http://localhost:3000
```

### 4. Open in Browser

Navigate to `http://localhost:3000`. You're ready to go! 🎉

---

## 🏗️ Project Structure

```
root/
├── apps/
<<<<<<< main
│   ├── frontend/                  # Next.js Application
│   │   ├── src/
│   │   │   ├── app/               # Pages (App Router)
│   │   │   │   ├── page.tsx            # Landing page
│   │   │   │   ├── login/              # Login page
│   │   │   │   ├── register/           # Registration page
│   │   │   │   ├── dashboard/          # User dashboard
│   │   │   │   ├── events/             # Event listing
│   │   │   │   │   ├── [id]/           # Event details
│   │   │   │   │   │   ├── manage/     # Organizer management
│   │   │   │   │   │   └── checkin/    # QR scanner
│   │   │   │   │   └── create/         # Create event form
│   │   │   │   └── ticket/[id]/        # Digital ticket view
│   │   │   ├── components/        # Reusable UI components
│   │   │   ├── lib/               # API client, utilities
│   │   │   └── store/             # Zustand auth store
│   │   └── package.json
│   │
│   └── backend/                   # Express + Prisma API
│       ├── src/
│       │   ├── controllers/       # Route handlers
│       │   ├── routes/            # API route definitions
│       │   ├── middlewares/       # Auth & error middleware
│       │   ├── lib/               # Prisma client
│       │   └── index.ts           # Server entry point
│       ├── prisma/
│       │   └── schema.prisma      # Database schema
│       └── package.json
│
├── PRD.md                         # Product Requirements Document
├── Database Schema.md             # Database design reference
├── UI.md                          # Page/UI specification
├── techstack.md                   # Technology decisions
└── README.md                      # This file
│   ├── frontend/        # Next.js Application
│   └── backend/         # Express + Prisma API
└── README.md

```

---

## 🔑 User Roles

| Role | Capabilities |
|---|---|
| **STUDENT** | Browse events, register, purchase tickets, view QR tickets, access dashboard |
| **ORGANIZER** | All student capabilities + create events, manage ticket types, view registrations, use QR scanner |
| **ADMIN** | All organizer capabilities + platform-wide access and management |

---

## 🚧 Future Roadmap

- [ ] **Team registration** for hackathons (multi-member sign-ups)
- [ ] **Payment gateway** integration (Stripe / Razorpay checkout flow)
- [ ] **Email notifications** (registration confirmation, event reminders)
- [ ] **Admin panel** for platform-wide user and event management
- [ ] **CSV export** of attendee lists
- [ ] **Event schedule planner** with session tracks
- [ ] **Mobile app** (React Native)
- [ ] **AI event recommendations**

---

## 🤝 Contributing

This is an open-source project — contributions are welcome!

1. **Fork** the repository
2. **Create** your feature branch: `git checkout -b feature/awesome-feature`
3. **Commit** your changes: `git commit -m "Add awesome feature"`
4. **Push** to the branch: `git push origin feature/awesome-feature`
5. **Open** a Pull Request

---

## 📜 License

This project is licensed under the **MIT License** — free to use, modify, and distribute.
