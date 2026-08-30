# CampusOne Demo

The public CampusOne demo is a frontend-only version intended for quick review without provisioning the full backend stack.

Live demo: <https://campusone.site>

Related docs: [Architecture](./ARCHITECTURE.md), [Features](./FEATURES.md), [Setup](./SETUP.md)

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Student | `student@campusone.demo` | `student123` |
| Teacher | `teacher@campusone.demo` | `teacher123` |
| Admin | `admin@campusone.demo` | `admin123` |

These credentials are intentionally public and only apply to the frontend-only demo.

## How The Demo Works

The demo app lives in `campusone-frontend-demo`. It uses the same React and Vite foundation as the main frontend, but replaces live API calls with mocked API helpers.

```text
React/Vite demo app
  -> demo API adapters
  -> browser localStorage
  -> simulated uploads, notifications, auth, emails, and AI responses
```

Demo data is stored in browser localStorage under:

```text
campusone-frontend-demo-store-v1
```

Changes made in the demo persist only in that browser until the stored data is cleared.

## What The Demo Shows

- Student, teacher, and admin dashboards.
- Demo login and profile flows.
- Admin user management, admissions, academic setup, schedule tools, reports, audit logs, announcements, notifications, and TA oversight.
- Teacher offerings, lectures, attendance, assignments, quizzes, Q&A, marks, leave applications, notifications, and TA application review.
- Student courses, registration, attendance, assignments, quizzes, Q&A, grades, transcript, timetable, leave status, notifications, and TA workflows.
- Simulated file upload behavior for demo workflows.
- Simulated AI quiz generation using predefined demo questions.

## What Is Simulated

The public demo does not connect to:

- The Express backend.
- PostgreSQL or Prisma.
- Supabase Storage.
- Resend email delivery.
- OpenAI APIs.
- A live Socket.IO server.

Uploads are represented in the browser, emails and OTP-style flows are simulated, notifications are generated locally, and AI quiz generation returns demo sample content.

## Run The Demo Locally

```powershell
cd campusone-frontend-demo
npm install
npm run dev
```

Useful demo scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the demo Vite development server. |
| `npm run build` | Build the demo for production. |
| `npm run lint` | Run ESLint. |
| `npm run preview` | Preview the demo production build locally. |

## Reset Demo Data

To reset the demo state, clear this browser localStorage key and refresh:

```text
campusone-frontend-demo-store-v1
```

The demo code also includes a `resetDemoStore()` helper for resetting seeded browser data from code.

## Deployment Notes

The demo includes a Vercel SPA rewrite so deep links route back to the React app:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

The live demo is designed for product review. Use the full-stack setup when validating backend authorization, database behavior, storage policies, email delivery, real-time sockets, or AI integrations.
