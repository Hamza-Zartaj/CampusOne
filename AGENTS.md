# CampusOne Agent Instructions

## Project Tracker

- Treat `Project_context.md` as the canonical project tracker and source of truth.
- After any meaningful feature, schema, seed, workflow, verification, or UX change, update `Project_context.md` in the same turn.
- Keep context updates concise: add completed work to the verified feature inventory, add verification notes when commands were run, and move resolved work out of future tasks.
- Do not create separate audit, planning, or status documents unless the user explicitly asks for one.

## Repository Notes

- Prefer existing project patterns over new abstractions.
- Backend authorization is the security boundary; frontend visibility is not enough.
- Never run `npm run dev` or `npm.cmd run dev`; the user controls dev servers.
- For frontend changes, run `npm.cmd run build` in `campusone-frontend` when feasible.
- For backend schema or Prisma changes, run the relevant Prisma validation/generation command when feasible.
