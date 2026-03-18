# Database Schema (MongoDB Migration)

The system has been migrated from PostgreSQL to MongoDB for improved scalability and flexibility. Prisma ORM is used to interface with MongoDB.

### Collections

#### 1. Users (`User`)
- `_id`: ObjectId (Primary Key)
- `email`: String (Unique)
- `password`: String (Hashed)
- `name`: String
- `role`: Enum (STUDENT, ORGANIZER, ADMIN)
- `createdAt`: DateTime
- `updatedAt`: DateTime

#### 2. Events (`Event`)
- `_id`: ObjectId (Primary Key)
- `title`: String
- `description`: String
- `date`: DateTime
- `location`: String
- `capacity`: Number
- `status`: Enum (DRAFT, PUBLISHED, CANCELLED, COMPLETED)
- `organizerId`: ObjectId (Reference to User)
- `createdAt`: DateTime
- `updatedAt`: DateTime

#### 3. Ticket Types (`TicketType`)
- `_id`: ObjectId (Primary Key)
- `eventId`: ObjectId (Reference to Event)
- `name`: String
- `description`: String?
- `price`: Number
- `limit`: Number
- `sold`: Number

#### 4. Orders (`Order`)
- `_id`: ObjectId (Primary Key)
- `userId`: ObjectId (Reference to User)
- `eventId`: ObjectId (Reference to Event)
- `totalAmount`: Number
- `paymentRef`: String?
- `status`: Enum (PENDING, COMPLETED, FAILED, REFUNDED)
- `createdAt`: DateTime

#### 5. Tickets (`Ticket`)
- `_id`: ObjectId (Primary Key)
- `qrCodeValue`: String (Unique)
- `userId`: ObjectId (Reference to User)
- `eventId`: ObjectId (Reference to Event)
- `ticketTypeId`: ObjectId (Reference to TicketType)
- `orderId`: ObjectId (Reference to Order)
- `isCheckedIn`: Boolean
- `checkInTime`: DateTime?

#### 6. Check-in Logs (`CheckInLog`)
- `_id`: ObjectId (Primary Key)
- `ticketId`: ObjectId (Reference to Ticket)
- `scannedAt`: DateTime
- `scannedBy`: String (User ID or Name)
- `status`: String

### Relationships
- **User ↔ Event**: One-to-Many (Organizer)
- **Event ↔ TicketType**: One-to-Many
- **User ↔ Order**: One-to-Many
- **Order ↔ Ticket**: One-to-Many (One order can contain multiple tickets)
- **Ticket ↔ CheckInLog**: One-to-Many