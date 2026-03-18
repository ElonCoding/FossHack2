# Open Source Event Registration & Ticketing Platform

A production-ready full-stack platform for college tech fests, hackathons, and workshops. Built with speed, security, and developer experience in mind.

## 🚀 Tech Stack

- **Frontend**: Next.js 15 (App Router), TailwindCSS, Shadcn UI (Base UI), Zustand, Framer Motion
- **Backend**: Node.js, Express, Prisma ORM, JWT Auth, Zod
- **Database**: PostgreSQL
- **Infrastructure**: Docker, Redis (Jobs/Caching)

## ✨ Core Features

- **🔐 Multi-Role Authentication**: STUDENT, ORGANIZER, and ADMIN roles with JWT protection.
- **📅 Event Management**: Organizers can create, edit, and publish events.
- **🎟️ Ticketing System**: Multiple ticket types (Paid/Free), capacity limits, and instant order processing.
- **🔍 Event Discovery**: Public listing and detailed view for upcoming tech fests.
- **📊 Organizer Dashboard**: Real-time sales analytics, registration lists, and event tracking.
- **📷 QR Check-in**: Integrated mobile-friendly QR scanner for organizers to validate attendee tickets.
- **🎫 Digital Tickets**: Personalized tickets with unique QR codes and print-to-PDF support.

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- Docker & Docker Compose
- PostgreSQL (or use Docker)

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

4. **Infrastructure (optional)**
   ```bash
   docker-compose up -d
   ```

## 🏗️ Project Structure

```bash
root/
├── apps/
│   ├── frontend/        # Next.js Application
│   └── backend/         # Express + Prisma API
├── docker-compose.yml   # Infrastructure setup
└── README.md
```

## 🤝 Contributing

This is an open-source project. Contributions are welcome! 
1. Fork the repo.
2. Create your feature branch.
3. Commit your changes.
4. Push to the branch.
5. Create a Pull Request.

## 📜 License

MIT License.
