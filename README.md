# Rabata Hub Connect (`राबता`)

> **Connecting Education with Opportunity**  
> A community-led educational ecosystem, AI-powered spoken English practice companion, and transparent governance platform in Derabassi, Punjab, India.

[![Live Web Application](https://img.shields.io/badge/Live%20App-rabata--hub--connect-emerald?style=for-the-badge&logo=vercel)](https://rabata-hub-connect-main.vercel.app)
[![React 19](https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react)](https://react.dev)
[![TanStack Start](https://img.shields.io/badge/TanStack-Start%20%26%20Router-orange?style=for-the-badge)](https://tanstack.com/start)
[![AI Voice](https://img.shields.io/badge/Conversational%20AI-Real--Time%20Voice-purple?style=for-the-badge)](#)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20RLS-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com)

---

## 📖 About Rabata

**Rabata (`राबता`)** is a grassroots educational initiative founded by **Tammana Rathore** in Derabassi, Punjab. We provide free foundational education, conversational English fluency, digital literacy, and holistic mentorship for underserved children from low-income communities.

Our mission is to eliminate barriers to quality education, ensure complete safeguarding of young learners, and bring absolute financial and operational transparency to grassroots community care.

- 📍 **Location**: Derabassi, Punjab, India
- ✉️ **Official Email**: `rabataofficial111@gmail.com`
- 📞 **Helpline**: `+91 79654 81661`
- 📸 **Instagram**: [@rabata._.official](https://www.instagram.com/rabata._.official/) · Founder: [@rathore._.tammana](https://www.instagram.com/rathore._.tammana/)

---

## 🌟 Key Platform Features

### 1. 🎙️ AI Spoken English Buddy (`/learn`)
- **Conversational Practice Partner**: An interactive, friend-like AI companion for everyday conversational English practice with gentle corrections and natural dialogue flow.
- **Zero-Clutter Visual Orb UI**: Powered by `orb-ui` with real-time radial audio responsiveness, smooth listening/speaking state transitions, and dynamic ambient glow.
- **Bi-directional Low-Latency Streaming**: 16kHz PCM duplex audio streaming over signed WebSockets with client-side resampling, energy-based voice activity detection (VAD), and silence keepalive packets.

### 2. 🤖 Multilingual Inbound Call & Web Bot Integration
- **Direct Phone & Web Intake**: Community members can speak to Rabata’s voice assistant in **Hindi, Punjabi, or English** to enquire about classes or volunteer.
- **Transcript Parsing & Entity Extraction**: The platform processes inbound webhook payloads, extracts applicant names, contact info, grade levels, and learning goals, and records them with full transcripts.
- **One-Click Verified Enrollment**: Administrators can review the captured transcript and immediately enroll the student into their academic cohort with pre-filled profile details.

### 3. 🛡️ Central Admin Console & Governance OS (`/admin`)
Unified under a 3-tier layout (Executive KPIs $\rightarrow$ Control & Search Bar $\rightarrow$ Data Grids):
- **Executive Overview**: Real-time stats across active academic cohorts, verified mentors, transparent funds received, and published lectures.
- **Student Academic Profiles**: Individual progress cards, monthly test scores, attendance ratios, skill mastery tracking, and one-click printable academic report cards.
- **Mentors & Student Roster**: Verified volunteer mentors, student-mentor pairings, class attendance logs, and guardian contact records.
- **Recorded Lecture Library**: Curated video lessons filterable by class (Class 1–5, 6–8, 9–10, Young Adult) and subject with zero third-party tracking.
- **Fund Ledger & Allocation Proofs**: Every rupee received and spent is recorded with itemized categories, physical receipt attachments, and cryptographic audit proofs.
- **Stories & Community Gallery**: Real classroom teaching photos and safeguarding-approved student growth milestones.

### 4. 🔒 Safeguarding & Data Protection
- **PostgreSQL Row-Level Security (RLS)**: Sensitive learner and guardian records have **zero anonymous public browser read access**.
- **Guardian-First Intake**: Registration requires explicit parental or guardian verification.
- **Server-Only Intake Pipeline**: Contact and student forms submit through server-side RPCs with honeypots and rate limiting.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev), [TanStack Start](https://tanstack.com/start), [TanStack Router](https://tanstack.com/router) |
| **Styling & Motion** | [Tailwind CSS v4](https://tailwindcss.com), Custom Tech-Luxury Design System, Lucide React |
| **Interactive UI** | [Orb UI](https://github.com), Radix UI Primitives, Recharts |
| **Voice & Audio** | Real-time 16kHz PCM Duplex Audio Streaming, WebSocket Voice Runtime, Web Audio API |
| **Database & Auth** | [Supabase](https://supabase.com) (PostgreSQL, Row-Level Security, Server RPCs) |
| **Build & Runtime** | [Vite](https://vite.dev), [Nitro](https://nitro.unjs.io), Vercel Serverless |
| **Testing** | [Vitest](https://vitest.dev), React Testing Library |

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v20.x` or higher
- npm `v10.x` or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/kumawatjayant/Raabata.git
   cd Raabata
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment configuration:
   ```bash
   cp .env.example .env
   ```
   Add your respective database and voice API credentials in `.env` (refer to `.env.example` for details).

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   The local application will be available at `http://localhost:8080` (or `http://localhost:3000`).

5. **Run test suites**:
   ```bash
   npm test
   ```

---

## 📁 Repository Architecture

```text
├── src/
│   ├── components/            # UI components (Admin Console, Voice Orb, Navigation)
│   │   ├── admin-content.tsx          # Lecture library & community gallery
│   │   ├── admin-directory.tsx        # Student academic profiles & rosters
│   │   ├── admin-overview.tsx         # Executive KPI dashboards
│   │   ├── admin-calls-tracker.tsx    # Inbound calls, transcripts & enrollment modal
│   │   ├── english-speaking-tutor.tsx # Spoken English Orb interface
│   │   └── site-shell.tsx             # Shared navigation, header, and footer
│   ├── integrations/          # Supabase client and database types
│   ├── lib/                   # Business logic, audio processing & API services
│   │   ├── voice-client.ts            # Real-time duplex audio & WebSocket voice client
│   │   ├── server-api.ts              # Server-side API endpoints & voice webhook handlers
│   │   └── site.ts                    # Global site configuration & metadata
│   ├── routes/                # TanStack Start file-based routing
│   │   ├── _authenticated/            # Protected admin and account views
│   │   ├── index.tsx                  # Public homepage
│   │   ├── learn.tsx                  # AI Spoken English buddy & lecture library
│   │   ├── funds.tsx                  # Public transparent fund ledger
│   │   ├── students.tsx               # Academic profiles showcase
│   │   └── privacy.tsx                # Safeguarding, terms & data policy
│   ├── server.ts              # Nitro SSR & API route dispatcher
│   └── styles.css             # Design system & responsive layouts
├── .env.example               # Safe template for environment configuration
├── SETUP.md                   # Platform operations & deployment manual
└── vite.config.ts             # Vite build & local API dev middleware configuration
```

---

## 📜 License & Governance

This project is open-source under the [MIT License](LICENSE).  
Dedicated to empowering children and volunteers through accessible, high-quality, and transparent technology.
