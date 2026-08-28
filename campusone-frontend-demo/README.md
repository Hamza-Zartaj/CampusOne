# CampusOne Frontend Demo

This is a frontend-only portfolio/demo version of CampusOne. It keeps the React 19, Vite, and Tailwind CSS frontend while replacing backend calls with local mock data stored in `localStorage`.

## Run

```bash
npm install
npm run dev
```

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Student | `student@campusone.demo` | `student123` |
| Teacher | `teacher@campusone.demo` | `teacher123` |
| Admin | `admin@campusone.demo` | `admin123` |

## Notes

- No Express, database, Socket.IO, JWT, OpenAI, Resend, or Supabase service is required.
- Mock data lives under `src/data`.
- Mutations are simulated with React state and `localStorage`.
- The original CampusOne project is not required at runtime.
