# SLRJ DIGITAL — Bulk WhatsApp Outreach & Marketing Automation Platform

An enterprise-grade, production-ready WhatsApp Business Cloud API outreach platform architected exclusively for **SLRJ DIGITAL**.

Built strictly with the official **WhatsApp Business Platform Cloud API (Meta Graph API v21.0)**. It enforces rigorous anti-spam compliance, ITU-T E.164 phone normalization, strict marketing opt-in consent governance, automated webhook `STOP` opt-out suppression, and real-time delivery lifecycle tracking.

---

## 🌟 Key Features

### 1. Official WhatsApp Business Cloud API
- **Direct Meta Integration**: Uses official Graph API endpoints (`graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`).
- **Zero Web Automation / No Bot Scrapers**: 100% compliant with WhatsApp Business Platform policies.
- **Permanent Access Token Protection**: All secrets stored securely on the backend; never exposed to browser bundles.
- **Interactive Demo Simulator**: Built-in simulator with life-like message lifecycle (`SENT` → `DELIVERED` → `READ`) allowing complete team end-to-end testing before Meta billing.

### 2. High-Precision Bulk Contact Upload (.xlsx, .csv)
- **Automatic Column Detection**: Intelligently identifies Name, Mobile, Business, Email, Category, and WhatsApp Marketing Consent columns.
- **ITU-T E.164 Standardization**: Normalizes numbers to canonical international format (`+91 98200 11223`).
- **Duplicate & Invalid Filtering**: Instantly detects duplicate numbers within upload batches and across existing database records.
- **Strict Opt-In Rule**: Non-opted-in contacts (`UNKNOWN`, `OPTED_OUT`, `NO`) are strictly filtered out and prevented from promotional outreach.
- **Export Audit Logs**: One-click export of invalid and duplicate rows to CSV for client data cleanup.

### 3. Campaign Creator & Live Smartphone Simulator
- **Meta-Approved Templates Library**: Pre-loaded with 8 tailored SLRJ DIGITAL templates (Intro, Website Dev, E-Commerce, Mobile App, Digital Marketing, Special 20% Offer, Follow-Up, Client Feedback).
- **Dynamic Personalization**: Seamless parameter insertion (`{{name}}`, `{{business_name}}`).
- **Interactive Smartphone Preview**: Renders a live iPhone/Android chat mockup with green Meta Verified badge, message bubble, interactive quick-reply buttons, and unsubscribe instructions.
- **Pre-Launch Test Sender**: Dispatch an instant preview to an authorized administrator phone before launching bulk queue.

### 4. Background Execution Engine & Rate Limiter
- **Throttled Batch Dispatch**: Respects WhatsApp tier throughput limits (safe throttle with configurable msgs/sec).
- **Real-Time Pre-Send Verification**: Verifies suppression lists and opt-in consent immediately before each message is sent.
- **Campaign Controls**: Instant **Pause**, **Resume**, and **Cancel** controls.
- **Exponential Backoff**: Automatic retry for transient failures with detailed Meta error code tracking.

### 5. Automated Opt-Out & Suppression (Webhook Engine)
- **`STOP` Keyword Detection**: Automatically listens to inbound webhooks (`/api/webhooks/whatsapp`).
- **Instant Revocation**: If a customer replies `STOP`, `UNSUBSCRIBE`, `REMOVE`, or `CANCEL`, the system updates their consent status to `OPTED_OUT` and permanently blocks them on the `SuppressionList`.

### 6. Role-Based Access Control & Security
- **3 Dedicated Roles**:
  - `SUPER_ADMIN`: Full credentials, API tokens, user management, and system config.
  - `MARKETING_MANAGER`: Campaign creation, launch, pause, templates, and analytics.
  - `CAMPAIGN_OPERATOR`: Contact uploads, viewing campaigns, and sending test messages.
- **Immutable Audit Trail**: Logs every single upload, launch, consent update, and credential modification with timestamps, IP addresses, and event payloads.

---

## 🚀 Quickstart & Setup

### Prerequisites
- Node.js 18+ (tested on Node v22)
- npm 9+

### 1. Installation
Clone repository and install dependencies:
```bash
git clone <repo-url>
cd whatsappp
npm install
```

### 2. Environment Configuration
The system includes `.env` configured for out-of-the-box SQLite local development:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="slrj_digital_jwt_secret_key_prod_auth_2026_secure"
WHATSAPP_API_VERSION="v21.0"
WHATSAPP_BUSINESS_ACCOUNT_ID=""
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_ACCESS_TOKEN=""
WHATSAPP_WEBHOOK_VERIFY_TOKEN="slrj_digital_secure_wh_2026"
```

### 3. Initialize & Seed Database
Sync the Prisma schema and seed pre-configured SLRJ DIGITAL templates, sample contacts, and admin credentials:
```bash
npx prisma db push
npx prisma db seed
```

### 4. Run the Application
Start the development server:
```bash
npm run dev
```
Or run the production build:
```bash
npm run build
npm run start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Pre-Configured Administrator Credentials

| Role | Email | Password |
|---|---|---|
| **Super Admin** | `admin@slrjdigital.in` | `Admin@123456` |
| **Marketing Manager** | `marketing@slrjdigital.in` | `Marketing@123456` |
| **Campaign Operator** | `operator@slrjdigital.in` | `Operator@123456` |

*Quick-fill buttons are also available on the `/login` screen for fast testing.*

---

## 📡 Meta Cloud API Setup (Live Production)

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps** → Create App (Type: **Business**).
2. Add the **WhatsApp** product.
3. In **API Setup**, retrieve your:
   - **Phone Number ID**
   - **WhatsApp Business Account ID (WABA ID)**
4. In **Meta Business Manager** → **System Users**, generate a permanent access token with permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. In the SLRJ DIGITAL dashboard, navigate to **WhatsApp API Settings** (`/settings`), toggle off Demo Simulator, and paste your credentials.
6. Under **Webhooks** in the Meta App Dashboard:
   - Set Callback URL: `https://your-domain.com/api/webhooks/whatsapp`
   - Verify Token: `slrj_digital_secure_wh_2026` (or custom token configured in `/settings`)
   - Subscribe to the `messages` field.

---

## 🛡️ Database Models (Prisma)

- **`User`**: Administrators and team members with RBAC roles (`SUPER_ADMIN`, `MARKETING_MANAGER`, `CAMPAIGN_OPERATOR`).
- **`Contact`**: Normalized E.164 phone numbers, full names, business names, categories, and consent status.
- **`ContactGroup`**: Audience segmentation batches.
- **`ContactConsent`**: Audit trail of opt-in and opt-out sources with timestamps.
- **`SuppressionList`**: Opt-out registry enforcing anti-spam rules.
- **`WhatsAppAccount`**: Meta WABA configuration, token storage, and messaging tier metadata.
- **`MessageTemplate`**: Approved WhatsApp templates, headers, bodies, footers, and interactive buttons.
- **`Campaign`**: Bulk outreach runs with target filters, progress metrics, and execution statuses (`DRAFT`, `RUNNING`, `PAUSED`, `COMPLETED`, `CANCELLED`).
- **`CampaignContact`**: Individual recipient status logs (`PENDING`, `SENDING`, `SENT`, `DELIVERED`, `READ`, `FAILED`, `SKIPPED`).
- **`Message`**: Real-time inbound and outbound message records with WAMID tracking.
- **`MessageStatusEvent`**: Granular delivery event timestamps and Meta error codes.
- **`AuditLog`**: Security compliance log of administrative actions.

---

## 💻 Tech Stack
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Framer Motion.
- **Backend**: Next.js Route Handlers, Node.js, Prisma ORM, LibPhoneNumber-JS, PapaParse, XLSX, BcryptJS, JWT.
- **Database**: SQLite (local development zero-dependency) / PostgreSQL (production).
- **APIs**: Official Meta WhatsApp Business Platform Cloud API v21.0.

---

© 2026 **SLRJ DIGITAL**. All Rights Reserved.
