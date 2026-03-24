# README & CHANGELOG Design

**Date:** 2026-03-24
**Status:** Approved

## Overview

Add a `README.md` and `CHANGELOG.md` to the project root. Content in English. The README targets both stakeholders (product overview) and developers (setup, structure, contributing). The CHANGELOG follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format starting at version 1.0.0.

## README.md

### Structure

1. **Header** — Project name, one-line tagline, badges (Node version, license status)
2. **About** — 2-3 sentences: multi-tenant SaaS platform for bus transport management (reservations, ticketing, fleet)
3. **Features** — Bullet list:
   - Multi-tenant architecture with tenant-scoped data
   - Role-based access control (Admin, Dispatcher, Driver, Reader) with 70+ granular permissions
   - Booking and ticketing with PDF generation and QR codes
   - Fleet management (buses, routes, cities, franchises, employees)
   - Route and trip planning
   - User profiles with email change confirmation flow
   - Real-time updates via SSE (AdonisJS Transmit)
   - Email notifications via SMTP
   - Dashboard with admin UI
4. **Tech Stack** — Table: technology | role (AdonisJS v7, Lucid ORM, Edge.js, VineJS, Alpine.js, Tailwind CSS v4, Vite, PostgreSQL, Japa)
5. **Prerequisites** — Node >= 24, PostgreSQL, npm
6. **Getting Started** — Steps: clone, `npm install`, copy `.env.example` to `.env`, generate app key (`node ace generate:key`), configure DB and SMTP credentials, run migrations (`node ace migration:run`), seed (`node ace db:seed`), start dev server (`npm run dev`)
7. **Scripts** — Table of npm scripts: dev, build, start, test, lint, format, typecheck
8. **Project Structure** — Simplified tree of key directories (app/, config/, database/, resources/, start/, tests/)
9. **Contributing** — Branch from `develop`, use conventional commits, run `npm run lint && npm run format` before PRs
10. **License** — "This project is proprietary and unlicensed (UNLICENSED)."

### Style notes

- Keep it concise — no walls of text
- Use tables for structured data (tech stack, scripts)
- No emojis

## CHANGELOG.md

### Format

Follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) with [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Content

**[1.0.0] - 2026-03-24**

All entries under `### Added`, grouped by feature area:

- **Core Platform**: AdonisJS v7 application setup, multi-tenant architecture, session-based authentication, PostgreSQL with UUID primary keys, real-time SSE via AdonisJS Transmit
- **RBAC**: Four system roles (Admin, Dispatcher, Driver, Reader), 70+ granular permissions, Bouncer-based authorization, permission middleware
- **Fleet Management**: CRUD for buses, routes, cities, employees, franchises, roles
- **Booking & Ticketing**: Reservation system, PDF ticket generation with QR codes, seat allocation
- **Trip Planning**: Trip creation, route management, scheduling
- **User Profile**: Profile editing, password change, email change with confirmation flow
- **Email System**: SMTP transport configuration, transactional email support (email change confirmation)
- **Dashboard**: Admin UI with sidebar navigation, Edge.js component library (forms, alerts, buttons, pagination), flash messages, Alpine.js interactivity
- **Frontend**: Tailwind CSS v4 styling, Vite build with HMR, Tabler icons via edge-iconify

## Implementation

This is a documentation-only task. Files to create/update:
- Create `README.md` at project root
- Create `CHANGELOG.md` at project root
- Update `package.json` version from `0.0.0` to `1.0.0` to match the CHANGELOG anchor
