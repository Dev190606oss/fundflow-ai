# FundFlow AI
> **Your finances. One intelligent platform.**

[![Hackathon](https://img.shields.io/badge/PayPal%20AI%20Hackathon-2026-003087?style=for-the-badge&logo=paypal&logoColor=white)](https://developer.paypal.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React%2018-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Express](https://img.shields.io/badge/Node.js%20Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma%20ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 🌟 Executive Summary

**FundFlow AI** is a comprehensive, production-grade financial command center architected specifically for freelancers, independent contractors, creators, and digital studios. Built for the **PayPal AI Hackathon 2026**, FundFlow AI unifies client billings, automated invoice payments via **PayPal Orders API v2**, personal peer-to-peer lending and borrowing ledgers, and wealth preparation for anticipated market events such as the **Anthropic IPO Watch**.

At the core of the platform is an **AI-powered financial synthesis engine** that analyzes the user's real balance sheet to compute true investment readiness, draft polite payment reminders, synthesize project briefs from natural language, and answer complex financial questions with zero hallucination.

---

## 🎯 Key Differentiating Modules

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                               FUNDFLOW AI                                   │
 ├──────────────────┬──────────────────┬───────────────────┬───────────────────┤
 │    Dashboard     │  Invoices & Pay  │   Borrow & Lend   │   IPO Readiness   │
 │ • Cash flow rate │ • PayPal Sandbox │ • Peer lending    │ • Anthropic watch │
 │ • Verified funds │ • Orders v2 API  │ • Recovery rate   │ • Capital gap AI  │
 │ • Receivables    │ • PDF invoices   │ • AI reminders    │ • Protected funds │
 └──────────────────┴──────────────────┴───────────────────┴───────────────────┘
```

### 1. 💳 PayPal Orders v2 & Sandbox Settlement
- **End-to-End Server-Side Verification:** Payments are never marked as completed based on client-side triggers. The server contacts PayPal's `/v2/checkout/orders/{id}/capture` endpoint, verifies transaction details, and stores the capture ID and payer metadata.
- **Audit Logging:** Every PayPal transaction creates an immutable record tied to the invoice and user profile.
- **Interactive Sandbox Simulator:** Fully supports official sandbox credentials while offering a built-in sandbox simulator mode for uninterrupted hackathon judging.

### 2. 🤖 AI Financial Command Assistant
- **Direct Database Access:** The assistant queries authorized database records in real time—calculating live receivables, identifying overdue invoices by name, and tracking personal debt balances.
- **Zero Hallucination:** Strict financial synthesis ensures financial figures match database records exactly.
- **Multimodal Support:** Powered by Google Gemini with a deterministic heuristic fallback engine.

### 3. 🎯 Investment Watchlist & AI Readiness Assistant
- **Truth in Reporting:** Unverified opportunities (such as the **Anthropic IPO Watch**) are labeled as unverified without speculative dates or lot prices.
- **Readiness Formula:** When a user sets a target savings goal (e.g., ₹25,000 for an IPO), the AI calculates the weekly savings pace, identifies potential funding sources from pending invoices and money lent to friends, and enforces safety alerts protecting emergency reserves.

### 4. 🤝 Borrow & Lend Ledger with Polite AI Reminders
- **Dual Ledgers:** Tracks money lent to peers and borrowed liabilities with partial repayment schedules.
- **AI-Crafted Courtesy Check-ins:** Generates polite, professional WhatsApp and Email follow-up messages with one-click copy. No messages are sent without explicit user review and approval.

### 5. 👥 Client CRM & AI Project Brief Generator
- **Natural Language Scoping:** Translates informal client prompts (e.g., *"Build an e-commerce storefront for ₹35,000 in 20 days"*) into structured deliverables, milestones, and invoice-ready items.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript | High-performance SPA with strict typing |
| **Styling** | Tailwind CSS, Lucide Icons | Responsive fintech dashboard interface |
| **Visualizations** | Recharts | Cash flow trends, capital ratios, savings progress |
| **Backend** | Node.js, Express.js, TypeScript | Modular RESTful API services |
| **Database** | PostgreSQL 16, Prisma ORM | Relational schema with foreign keys & cascading |
| **Authentication** | JWT, bcryptjs | Encrypted session handling & password hashing |
| **Payment Gateway** | PayPal REST SDK / Orders v2 API | Sandbox order creation, capture & audit verification |
| **AI Synthesis** | Google Gemini 1.5 Flash SDK | Scoping briefs, polite reminders, and chat engine |

---

## ⚡ Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/) (v14 or higher) or [Docker](https://www.docker.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/Dev190606oss/fundflow-ai.git
cd fundflow-ai
```

### 2. Environment Configuration
Create a `.env` file in the `server/` directory:
```bash
cp .env.example server/.env
```

Edit `server/.env` with your parameters:
```env
PORT=5001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fundflow_ai?schema=public"
JWT_SECRET="your_secure_jwt_secret_key"
FRONTEND_URL="http://localhost:5173"

# PayPal Developer Sandbox
PAYPAL_CLIENT_ID="your_paypal_sandbox_client_id"
PAYPAL_CLIENT_SECRET="your_paypal_sandbox_client_secret"
PAYPAL_API_BASE="https://api-m.sandbox.paypal.com"

# Google Gemini AI (Optional - Built-in fallback active if omitted)
GEMINI_API_KEY=""
```

### 3. Database Initialization & Demo Seeding
Start PostgreSQL (or run `docker compose up -d postgres`), then push the schema and seed demo records:
```bash
cd server
npm install
npx prisma db push
npm run seed
cd ..
```

### 4. Install Dependencies & Launch Application
Run the root development command to launch both frontend and backend concurrently:
```bash
npm run install:all
npm run dev
```

- **Frontend Application:** [http://localhost:5173](http://localhost:5173)
- **Backend API Server:** [http://localhost:5001](http://localhost:5001)

---

## 🔑 Pre-Seeded Hackathon Demo Account

You can evaluate the complete application using the 1-click demo button on the login screen, or sign in with:

| Field | Value |
| :--- | :--- |
| **Email** | `demo@fundflow.ai` |
| **Password** | `Password123!` |
| **Display Name** | Alex Mercer |
| **Studio** | Vanguard Engineering & Design |
| **Default Currency** | INR (₹) |

### Demo Records Pre-Loaded:
- **3 Freelance Clients:** Nexus Digital Works, Starlight Media Agency, Horizon FinCorp.
- **5 Sample Invoices:** 2 Paid via PayPal, 2 Pending, 1 Overdue.
- **2 Money-Lent Ledgers:** Rohan Sharma (₹10,000 active), Priya Mehta (₹10,000 fully recovered).
- **1 Borrowing Ledger:** Vikram Patel (₹15,000 remaining).
- **3 Investment Watchlist Entries:** Anthropic IPO Watch (Unverified), Nifty 50 ETF, Stripe Secondary.
- **2 Dedicated Savings Goals:** Anthropic IPO Readiness (₹25,000 target), Emergency Reserve (₹60,000 target).

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user & issue signed JWT |
| `POST` | `/api/auth/register` | Register new user account |
| `GET` | `/api/dashboard/stats` | Real-time financial metrics, cash flow & invoices |
| `GET` | `/api/clients` | List all freelance clients with billing stats |
| `POST` | `/api/clients` | Create new client profile |
| `POST` | `/api/invoices` | Generate invoice with auto-numbering & tax |
| `POST` | `/api/paypal/create-order` | Create PayPal Orders v2 sandbox checkout intent |
| `POST` | `/api/paypal/capture-order` | Server-side capture & payment verification |
| `GET` | `/api/loans` | Retrieve borrow and lend balance sheet |
| `POST` | `/api/loans/:id/repayments` | Record partial or full loan repayment |
| `GET` | `/api/investments/watchlist` | Retrieve investment assets & IPO tracker |
| `GET` | `/api/investments/readiness` | AI synthesis of capital gap vs confirmed funds |
| `POST` | `/api/ai/project-brief` | Generate structured deliverables from text |
| `POST` | `/api/ai/polite-reminder` | AI draft for polite payment follow-up |
| `POST` | `/api/ai/chat` | Conversational financial command center query |
| `GET` | `/api/reports/export/csv` | Download complete invoice ledger as CSV |

---

## 🔒 Security & Financial Safety

1. **Server Payment Verification:** Invoices are never marked as `PAID` based on browser callback parameters. All settlements require direct PayPal backend capture verification.
2. **Zero Sensitive Data In Repositories:** All API keys, secrets, and connection strings are managed strictly through environment variables.
3. **Database Isolation:** All queries filter by `userId` to ensure data isolation.
4. **Password Protection:** Cryptographic password hashing using `bcryptjs` with 10 salt rounds.
5. **No Speculation Advice:** Investment assistant provides calculations and educational preparation only, including explicit informational disclaimers and emergency fund protections.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.

*Built for the PayPal AI Hackathon 2026.*
