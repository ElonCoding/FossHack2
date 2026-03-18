Complete Database Schema

Recommended DB: PostgreSQL

Core Entities
USERS
-----
id (UUID) PK
name
email
password_hash
role (student / organizer / admin)
college
phone
created_at
updated_at
EVENTS
------
id (UUID) PK
title
description
category
location
start_date
end_date
banner_url
organizer_id (FK -> USERS.id)
max_participants
status (draft / published / closed)
created_at
TICKETS
-------
id (UUID) PK
event_id (FK -> EVENTS.id)
ticket_type
price
max_quantity
sold_quantity
sale_start
sale_end
created_at
REGISTRATIONS
-------------
id (UUID) PK
user_id (FK -> USERS.id)
event_id (FK -> EVENTS.id)
ticket_id (FK -> TICKETS.id)
status (registered / cancelled)
created_at
PAYMENTS
--------
id (UUID) PK
user_id
event_id
amount
payment_gateway
payment_status
transaction_id
created_at
TICKET_CODES
------------
id (UUID) PK
registration_id
qr_code
ticket_status (valid / used)
checked_in_at
created_at
CHECK_INS
---------
id (UUID) PK
ticket_code_id
event_id
checked_in_by
check_in_time
device_id
NOTIFICATIONS
-------------
id (UUID) PK
user_id
title
message
type (email / sms / in_app)
is_read
created_at
Relationships
User → many Events
Event → many Tickets
Event → many Registrations
Registration → one Ticket
Registration → one QR Ticket
Ticket → many Check-ins