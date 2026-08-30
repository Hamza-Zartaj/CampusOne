# CampusOne Setup

This guide covers the original full-stack CampusOne application. The public frontend-only demo has separate notes in [Demo](./DEMO.md).

Related docs: [Architecture](./ARCHITECTURE.md), [Features](./FEATURES.md), [Security](./SECURITY.md)

## Prerequisites

- Node.js and npm. The repository does not declare an explicit `engines` field; use a Node.js version compatible with Vite 7 and Prisma 7.
- PostgreSQL, either local or hosted through Supabase.
- A Supabase project if you want hosted PostgreSQL and storage-backed uploads.
- Resend credentials if you want email delivery.
- OpenAI credentials if you want AI quiz generation and AI-supported assignment similarity review.

## Environment Files

Create local environment files from the examples in each app you plan to run.

Backend:

```powershell
cd campusone-backend
Copy-Item .env.example .env
```

Frontend:

```powershell
cd campusone-frontend
Copy-Item .env.example .env
```

On macOS/Linux, use `cp .env.example .env` from the same directories.

## Backend Environment Variables

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend port. The server defaults to `5000` if unset. |
| `NODE_ENV` | Runtime environment. |
| `CLIENT_URL` | Frontend origin used by backend flows. |
| `JWT_SECRET` | Secret used to sign and verify JWTs. |
| `JWT_EXPIRE` | JWT expiration setting. |
| `DATABASE_URL` | Prisma/PostgreSQL connection URL. |
| `DIRECT_URL` | Direct database URL for selected scripts or Supabase setups. |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for backend storage operations. |
| `RESEND_API_KEY` | Resend API key for email delivery. |
| `RESEND_FROM` | Default sender for transactional emails. |
| `RESEND_FROM_ANNOUNCEMENT` | Sender for announcement emails. |
| `OPENAI_API_KEY` | Enables AI-backed features. |
| `OPENAI_QUIZ_MODEL` | Model for AI quiz generation. |
| `OPENAI_CHEAP_MODEL` | Lower-cost model used by selected AI workflows. |
| `OPENAI_SIMILARITY_MODEL` | Model used by assignment similarity workflows. |
| `OPENAI_SIMILARITY_REVIEW_MODEL` | Model used for similarity review explanations. |
| `AI_MAX_QUIZ_PROMPT_CHARS` | Maximum quiz generation prompt size. |

## Frontend Environment Variables

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL for the Express API. |
| `VITE_SOCKET_URL` | Base URL for Socket.IO connections. |

## Backend Setup

```powershell
cd campusone-backend
npm install
npx prisma generate
npm run db:push
npm run storage:buckets
npm run db:seed
npm run dev
```

For a database managed with checked migrations, use Prisma migration deployment instead of pushing the schema directly:

```powershell
npx prisma migrate deploy
```

Useful backend scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Express API with Nodemon. |
| `npm start` | Start the Express API with Node. |
| `npm run db:push` | Push the Prisma schema to the configured database. |
| `npm run db:seed` | Seed the database. |
| `npm run storage:buckets` | Ensure required Supabase Storage buckets exist. |
| `npm run db:superadmin` | Create a super admin account through the helper script. |
| `npm run db:studio` | Open Prisma Studio. |
| `npm run db:reset` | Destructively reset the database, push schema, and recreate storage buckets. Use only when data loss is acceptable. |

## Storage Setup

The storage bucket helper provisions these Supabase Storage buckets:

| Bucket | Purpose |
| --- | --- |
| `assignments` | Assignment attachments and student submissions. |
| `lectures` | Teacher lecture materials and TA resources. |
| `admission-documents` | Admission application documents. |
| `profile-pictures` | User profile pictures. |

Run the bucket helper after configuring `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and database connection variables:

```powershell
cd campusone-backend
npm run storage:buckets
```

## Frontend Setup

```powershell
cd campusone-frontend
npm install
npm run dev
```

Set `VITE_API_URL` to the backend API URL and `VITE_SOCKET_URL` to the Socket.IO server URL before running the frontend against a live backend.

Useful frontend scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Build the frontend for production. |
| `npm run lint` | Run ESLint. |
| `npm run preview` | Preview the production build locally. |

## Running Both Apps From The Root

The root package can install shared dev tooling and start both the backend and frontend:

```powershell
npm install
npm run dev
```

The root `dev` script runs the backend from `campusone-backend` and the main frontend from `campusone-frontend` using `concurrently`.

## Troubleshooting

- Prisma connection errors: check `DATABASE_URL`, `DIRECT_URL`, network access, and database credentials.
- Missing uploads: confirm Supabase variables are set and run `npm run storage:buckets`.
- Email not sending: confirm `RESEND_API_KEY`, `RESEND_FROM`, and sender-domain configuration.
- AI features unavailable: confirm `OPENAI_API_KEY` and the related model variables.
- Frontend redirects to login after API calls: check that `VITE_API_URL` points to the backend and that the JWT is valid.
- Socket notifications not connecting: check `VITE_SOCKET_URL`, backend availability, and authenticated socket tokens.
- Demo behavior differs from the full-stack app: the demo uses mocked APIs and localStorage; see [Demo](./DEMO.md).
