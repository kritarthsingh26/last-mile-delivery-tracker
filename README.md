# Last-Mile Delivery Tracker

A full-stack, responsive logistics operations and delivery management platform. It features role-based experiences for Customers, Delivery Agents, and Operations Admins. It solves complex shipping pricing rules, dynamic geographic zone detection, intelligent agent auto-assignments using the Haversine formula, and failed-delivery rescheduling flows.

---

## 🚀 Key Features

*   **Role-based Authentication**: Customized dashboards for `ADMIN`, `CUSTOMER`, and `AGENT` accounts.
*   **Volumetric Tariff Engine**: Automates cargo calculations using package dimensions and actual weights (billing on the higher metric) mapped against admin-configured rate cards.
*   **Geographic Zone Detection**: Maps addresses/pincodes to logistics zones to determine local (Intra-zone) vs. regional (Inter-zone) transport tariffs.
*   **Intelligent Auto-Assignment**: Uses the Haversine distance formula to identify and assign the nearest available courier agent.
*   **Fulfillment State Machine**: Standardizes shipment life cycles with immutable, audited timestamp tracking histories.
*   **Exception Rescheduling Flow**: Flags failed deliveries, alerts the customer, captures new schedules, frees the old agent, and triggers reassignment threads.
*   **Simulated Notifications Feed**: Evaluator-friendly in-app panel that displays SMS & email dispatches in real-time as state transitions occur.

---

## 🛠️ Tech Stack

*   **Frontend & Backend**: Next.js 14+ (App Router, React, TypeScript).
*   **Styling**: Pure modern Vanilla CSS with dark glassmorphism effects.
*   **Database ORM**: Prisma ORM with SQLite database (zero configuration local setup).
*   **Session Auth**: stateless JWT token stored in HttpOnly cookies.

---

## 📋 Pre-configured Test Accounts

You can log in with these seeded accounts (seeded automatically via the seed script):

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@lastmile.com` | `admin123` | Can configure zones, rate cards, view all orders, override status, manual assign. |
| **Customer** | `customer@lastmile.com` | `customer123` | Can book shipments with dynamic preview, view shipment timeline, reschedule failed items. |
| **Agent** | `agent1@lastmile.com` | `agent123` | Available agent mapped to Zone A (Delhi). Can change availability and update order status. |
| **Agent** | `agent2@lastmile.com` | `agent123` | Available agent mapped to Zone B (Mumbai). |
| **Agent** | `agent3@lastmile.com` | `agent123` | Available agent mapped to Zone C (Bangalore). |

---

## 🏗️ Relational DB Schema

```prisma
// Users table
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  role         String   // "ADMIN", "CUSTOMER", "AGENT"
  ...
}

// Logistics Zones mapping area pincodes
model Zone {
  id        String   @id @default(uuid())
  name      String   @unique
  pincodes  String   // Comma-separated list (e.g. "110001,110002")
  ...
}

// Tariff rules configured dynamically by admins
model RateCard {
  id                  String @id @default(uuid())
  orderType           String // "B2B", "B2C"
  intraZoneRatePerKg  Float
  interZoneRatePerKg  Float
  codSurcharge        Float  // Flat surcharge for COD payment
}

// Active coordinates & availability state for delivery couriers
model AgentProfile {
  id          String @id @default(uuid())
  userId      String @unique
  status      String // "AVAILABLE", "BUSY", "OFFLINE"
  currentZone String?
  latitude    Float
  longitude   Float
}

// Shipment Orders
model Order {
  id                String   @id @default(uuid())
  orderNumber       String   @unique
  customerId        String
  pickupAddress     String
  pickupPincode     String
  pickupZoneId      String?
  dropAddress       String
  dropPincode       String
  dropZoneId        String?
  length, width, height Float
  actualWeight, volumetricWeight, chargeableWeight Float
  orderType, paymentType String
  baseCharge, codSurcharge, totalCharge Float
  status            String   // PENDING, ASSIGNED, PICKED_UP, DELIVERED, FAILED, RESCHEDULED
  agentId           String?
  scheduledDate     DateTime
}

// Immutable tracking audits
model OrderTrackingHistory {
  id        String   @id @default(uuid())
  orderId   String
  status    String
  timestamp DateTime @default(now())
  actorId   String
  remarks   String?
}
```

---

## ⚡ Setup & Installation

Follow these steps to run the project locally:

### 1. Extract and Install Dependencies
```bash
npm install
```

### 2. Setup SQLite Database Schema
Apply the Prisma models to create the local SQLite database file (`dev.db`):
```bash
npx prisma db push
```

### 3. Seed Mock Configurations & Users
Populate administrative rates, pincode zones, agent profiles, and test accounts:
```bash
node prisma/seed.js
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running Engine Test Suites

We have built a dedicated logistics integration testing script to verify billing formulas, zone detection, coordinates geo-mapping, and Haversine routing algorithms:
```bash
npx tsx tests/verify-logistics.ts
```

---

## ⚙️ Core Engines & Logistics Logic

### 1. Volumetric Weight Calculation
*   Standard logistics formula is applied: `Volumetric Weight = (Length * Width * Height) / 5000` (in cm).
*   Billing is calculated on the higher metric of `Actual Weight` vs `Volumetric Weight`.

### 2. Zone Routing & Tariffs
*   Pincodes map to Zones. If an order's `pickupZoneId === dropZoneId`, the Intra-zone rate card applies. If they differ, the Inter-zone rate card applies.
*   If payment mode is `COD`, the Segment Surcharge (B2B or B2C) is added to the total shipment cost.

### 3. Agent Auto-Assignment
*   When a shipment enters state `PENDING` or `RESCHEDULED`, the assignment engine filters for available agents (`status === "AVAILABLE"`).
*   It computes straight-line distance to the order's pickup pincode coordinates using the **Haversine formula**.
*   The closest agent in the same zone (or globally) is selected, assigned, and flagged as `BUSY`.
