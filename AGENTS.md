# Repository Guidelines

## Project Structure & Module Organization
This is a single-repo workspace with two apps:
- `apps/web`: Next.js UI in `apps/web/src/app`.
- `apps/api`: Nest.js API in `apps/api/src` (controllers, services, DTOs).
- `2540081_E_20251231.pdf` and `In the c4codataapi service, all texts of a service request (description, interaction, notes, etc.md` are reference docs.
Add shared code under `packages/` if needed.

## Build, Test, and Development Commands
From the repo root:
- `npm install` installs workspace dependencies.
- `npm run dev:api` starts the Nest API at `http://localhost:4000`.
- `npm run dev:web` starts the Next.js UI at `http://localhost:3000`.
- `npm run build --workspace apps/api` or `npm run build --workspace apps/web` builds one app.

## Coding Style & Naming Conventions
Use TypeScript for both apps. Prefer 2-space indentation, named exports, and kebab-case for folder names. Keep API routes in `apps/api/src/controllers` and business logic in `apps/api/src/services`. UI pages live in `apps/web/src/app`, and shared components can go in `apps/web/src/components` if added.

## Testing Guidelines
No tests are configured yet. If you add testing, keep API tests under `apps/api/test` or `apps/api/src/**/__tests__` and UI tests under `apps/web`. Name files `*.spec.ts` or `*.test.tsx` and document how to run them.

## Commit & Pull Request Guidelines
No commit history is available to infer conventions. Prefer Conventional Commits (e.g., `feat: add email notes lookup`). PRs should include a summary, steps to verify locally, and any sample outputs or screenshots for UI changes.

## Security & Configuration Tips
Do not commit credentials. Provide C4C Basic Auth credentials via local env or runtime input only. Avoid logging full OData responses that might contain personal data.
