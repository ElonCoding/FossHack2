# Event Registration and Ticketing Platform

The goal is to build a highly scalable, production-ready full-stack application for college tech fests and hackathons. Since the local [.md](file:///d:/Fosshack%202/UI.md) files (`Database Schema.md`, [PRD.md](file:///d:/Fosshack%202/PRD.md)) were empty, creating a proposed structure and database schema based on the provided core features.

## User Review Required
> [!IMPORTANT]
> The markdown files in your root directory (`Database Schema.md`, [PRD.md](file:///d:/Fosshack%202/PRD.md), etc.) are empty. I have formulated a comprehensive database schema and architecture plan directly from your prompt. Please review the **Database Schema** and **Project Architecture** below. If it looks good, I can proceed with creating the monorepo and writing the code.

## Proposed Architecture

We will set up a monorepo structure containing both the frontend and backend, orchestrated by Docker Compose.

```
/fosshack-platform
  /apps
    /frontend        # Next.js (App Router), Tailwind, Shadcn UI
    /backend         # Node.js, Express, Prisma
  /packages          # Shared types/configs (optional)
  /infrastructure    # Nginx config, Dockerfiles
  docker-compose.yml
  README.md
```

### Tech Stack Details
- **Frontend**: Next.js 14+ (App Router), TailwindCSS, Shadcn UI, Framer Motion, QR Scanner library, PDF generation library (`jspdf` or similar).
- **Backend**: Express.js (keeps it lightweight but robust), Prisma ORM, JSON Web Tokens (JWT) for authentication.
- **Database**: PostgreSQL
- **Infrastructure**: Docker for containerization, Redis for caching (event listings) and background jobs (BullMQ for email notifications), Nginx.
- **Payments**: Stripe (or Razorpay). We will set up the skeleton and service logic for payments.

## Database Schema (Prisma)

Here is the proposed Prisma Schema to fulfill the core features:



enum Role {
  STUDENT
  ORGANIZER
  ADMIN
}

enum EventStatus {
  DRAFT
  PUBLISHED
  CANCELLED
  COMPLETED
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(STUDENT)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  events    Event[]  @relation("EventOrganizer")
  tickets   Ticket[]
  orders    Order[]
}

model Event {
  id          String      @id @default(uuid())
  title       String
  description String
  date        DateTime
  location    String
  capacity    Int
  status      EventStatus @default(DRAFT)
  organizerId String
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  organizer   User         @relation("EventOrganizer", fields: [organizerId], references: [id])
  ticketTypes TicketType[]
  tickets     Ticket[]
  orders      Order[]
}

model TicketType {
  id          String   @id @default(uuid())
  eventId     String
  name        String   // e.g., "Early Bird", "VIP"
  description String?
  price       Float
  limit       Int      // Available quantity
  sold        Int      @default(0)
  
  event       Event    @relation(fields: [eventId], references: [id])
  tickets     Ticket[]
}

model Order {
  id            String        @id @default(uuid())
  userId        String
  eventId       String
  totalAmount   Float
  paymentRef    String?       // Stripe/Razorpay Payment ID
  status        PaymentStatus @default(PENDING)
  createdAt     DateTime      @default(now())
  
  user          User     @relation(fields: [userId], references: [id])
  event         Event    @relation(fields: [eventId], references: [id])
  tickets       Ticket[]
}

model Ticket {
  id           String   @id @default(uuid())
  qrCodeValue  String   @unique // Unique string for QR generation
  userId       String
  eventId      String
  ticketTypeId String
  orderId      String
  isCheckedIn  Boolean  @default(false)
  checkInTime  DateTime?
  
  user         User       @relation(fields: [userId], references: [id])
  event        Event      @relation(fields: [eventId], references: [id])
  ticketType   TicketType @relation(fields: [ticketTypeId], references: [id])
  order        Order      @relation(fields: [orderId], references: [id])
  checkInLogs  CheckInLog[]
}

model CheckInLog {
  id         String   @id @default(uuid())
  ticketId   String
  scannedAt  DateTime @default(now())
  scannedBy  String   // Organizer/Volunteer ID who scanned
  status     String   // "SUCCESS", "DUPLICATE", "INVALID"

  ticket     Ticket   @relation(fields: [ticketId], references: [id])
}
```

## Verification Plan
1. **Automated Endpoints Testing**: I will run requests against the backend APIs (using cURL or a test runner) to ensure auth and CRUD operations work correctly.
2. **Database Integrity**: Verify Prisma studio or run queries via Docker to ensure schema models relate correctly.
3. **Frontend Review**: Provide browser views of the generated UI for events, dashboards, and authentication forms.
