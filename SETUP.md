# Rabata Hub Connect — Setup & Operating Guide

## Working Architecture
- **Public Learning & Community Portal**: 11 responsive pages with metadata, localized English/Hindi/Punjabi options, and child-safe community materials.
- **AI Spoken English Buddy**: Interactive voice-first conversational partner powered by Sarvam AI Samvaad with dynamic Orb audio visualization.
- **Sarvam AI Voice & Multilingual Integration**: Inbound call tracking, transcript parsing, and one-click student enrollment in the Admin Console.
- **Central Governance OS**: Dedicated administrative workspace covering:
  - Executive KPI overview (cohort stats, attendance averages, active mentors).
  - Student academic profiles, attendance records, and report generation.
  - Mentors & student rosters with pairing and attendance tracking.
  - Recorded lecture library with subject filtering and direct playback.
  - Public fund ledger & allocation proofs with verifiable receipts and transaction hashes.
  - Community photo gallery & safeguarding-verified success stories.
- **Child Safeguarding & Information Protection**:
  - Enquiries and student registrations are stored with PostgreSQL Row-Level Security (RLS) on Supabase.
  - No anonymous public browser reads allowed for child and guardian data.
  - Intake functions apply honeypot checks and rate limits.

## Environment Configuration
Copy `.env.example` to `.env` and provide your credentials:

```bash
# Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your_supabase_publishable_key"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"

# Sarvam AI
SARVAM_API_KEY="your_sarvam_api_key"
SARVAM_ORG_ID="your_sarvam_org_id"
SARVAM_WORKSPACE_ID="your_sarvam_workspace_id"
SARVAM_APP_ID="English-Bud-5427078a-fa90"
SARVAM_TUTOR_APP_ID="English-Bud-5427078a-fa90"
```

## Running Locally
```bash
npm install
npm run dev
```

Run test suite:
```bash
npm test
```
