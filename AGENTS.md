# Repository Guidelines

This repository contains a React/Vite frontend and a Spring Boot API. Keep changes scoped to the module you are working in and document any cross-module impacts.

## Project Structure & Module Organization
- `shina-magazin-front/`: Vite + React app. Source lives in `src/` with `components/`, `pages/`, `router/`, `store/`, `api/`, `types/`, and `config/`. Entry HTML is `index.html`.
- `shina-magazin-api/`: Spring Boot API. Code is under `src/main/java/uz/shinamagazin/api/` with `controller/`, `service/`, `repository/`, `entity/`, `dto/`, `config/`, `security/`, and `exception/`. Config and migrations are in `src/main/resources/` (Flyway in `db/migration/`). Build output goes to `target/`.

## Build, Test, and Development Commands
Frontend (run in `shina-magazin-front/`):
- `npm run dev` to start the Vite dev server.
- `npm run build` to type-check and bundle for production.
- `npm run lint` to run ESLint.
- `npm run preview` to preview the production build.

Backend (run in `shina-magazin-api/`):
- `mvn spring-boot:run` to run the API locally.
- `mvn test` to run JUnit/Spring tests.
- `mvn package` to build the jar.

## Coding Style & Naming Conventions
- Indentation: TypeScript/TSX uses 2 spaces; Java uses 4 spaces.
- React components/pages use PascalCase (`ProductsPage.tsx`, `MainLayout.tsx`); store files use camelCase (`cartStore.ts`).
- Java types use PascalCase with suffixes (`*Controller`, `*Service`, `*Repository`); DTOs in `dto/request` and `dto/response` use `*Request`/`*Response`.
- Linting is via ESLint in the frontend; no formatter config is checked in.

## Testing Guidelines
- Backend uses Spring Boot Starter Test (JUnit 5). Place tests in `shina-magazin-api/src/test/java/...` and name them `*Test.java`.
- Frontend test tooling is not configured yet; add a runner and script before adding UI tests.

## Commit & Pull Request Guidelines
- Git history currently shows a single `init` commit, so no convention is established. Use short, imperative summaries (optionally scoped), e.g. `api: add stock adjustment endpoint`.
- PRs should describe affected areas (frontend/API), include screenshots for UI changes, and call out any DB migration or config updates.

## Configuration & Security Notes
- API defaults: `server.port=8080`, context path `/api`, PostgreSQL dev DB in `application-dev.yml`.
- Set `JWT_SECRET` for production; the dev default is defined in `application.yml`.
