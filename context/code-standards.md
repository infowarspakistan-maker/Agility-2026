# Code Standards

## General

- Keep modules small and single-purpose.
- Fix root causes, do not layer workarounds.
- Do not mix unrelated concerns in one component.

## TypeScript

- Strict mode is required throughout the project.
- Avoid `any` — use explicit interfaces from `src/types`.
- Use functional components with typed props.

## Framework: React (Vite)

- Follow standard Vite project structure.
- Use functional components and hooks exclusively.
- Centralize logic in `src/services` to keep components focused on UI.

## Styling

- Use Tailwind CSS utility classes.
- Follow the border radius scale defined in `ui-context.md`.
- No inline styles or external CSS files.

## API & Data

- All Firebase interactions must handle errors via `handleFirestoreError`.
- Use `onSnapshot` for real-time status updates in key UI areas.

## Data and Storage

- Metadata belongs in Firestore.
- Large assets (images, documents) belong in Firebase Storage.
- Always use `serverTimestamp` for creation dates.

## File Organization

- `src/pages/` — Top-level routable views.
- `src/components/` — Generic components (`ui/`) and project-specific ones.
- `src/services/` — Firebase business logic and data seeding.
- `src/types/` — Shared TypeScript definitions.
