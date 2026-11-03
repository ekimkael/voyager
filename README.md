# Voyager

Multi-tenant SaaS platform for bus transport management.

![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen)
![License](https://img.shields.io/badge/license-UNLICENSED-red)

## About

Voyager is a multi-tenant SaaS platform designed for bus transport companies. It provides a complete solution for managing reservations, ticketing, fleet operations, and route planning — all scoped per tenant with role-based access control.

## Features

- **Multi-tenant architecture** with tenant-scoped data isolation
- **Role-based access control** — 4 system roles (Admin, Dispatcher, Driver, Reader) with 70+ granular permissions
- **Booking and ticketing** with PDF generation and QR codes
- **Fleet management** — buses, routes, cities, franchises, employees
- **Route and trip planning** with scheduling
- **Real-time updates** via Server-Sent Events (AdonisJS Transmit)
- **User profiles** with password change and email change confirmation flow
- **Email notifications** via SMTP
- **Admin dashboard** with full CRUD operations

## Tech Stack

| Technology | Role |
|---|---|
| [AdonisJS v7](https://docs.adonisjs.com) | Backend framework |
| [Lucid ORM](https://lucid.adonisjs.com) | PostgreSQL ORM |
| [Edge.js](https://edgejs.dev) | Template engine |
| [VineJS](https://vinejs.dev) | Input validation |
| [Alpine.js](https://alpinejs.dev) | Frontend interactivity |
| [Tailwind CSS v4](https://tailwindcss.com) | Styling |
| [Vite](https://vite.dev) | Build & HMR |
| [PostgreSQL](https://www.postgresql.org) | Database |
| [Japa](https://japa.dev) | Testing framework |

## Prerequisites

- Node.js >= 24
- PostgreSQL
- npm

## Getting Started

```bash
# Clone the repository
git clone <repository-url>
cd voyager

# Install dependencies
npm install

# Set up environment
cp .env.example .env
node ace generate:key

# Configure your .env file:
# - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE
# - SMTP_HOST, SMTP_PORT, MAIL_FROM_NAME, MAIL_FROM_ADDRESS

# Run migrations
node ace migration:run

# Seed the database (optional, for development)
node ace db:seed

# Start the development server
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npm run typecheck` | TypeScript type checking |

## Project Structure

```
app/
├── controllers/      # One file per resource, standard CRUD methods
├── models/           # Lucid models with UUID primary keys
├── validators/       # VineJS validators
├── middleware/        # Auth, tenant, permission, throttle
├── services/         # Business logic
├── abilities/        # Bouncer abilities
├── policies/         # Bouncer policies
├── mails/            # Mail classes
└── events/           # Event definitions
config/               # App, auth, RBAC, mail, database configuration
database/
├── migrations/       # PostgreSQL migrations with UUID PKs
└── seeders/          # Database seeders
resources/
└── views/
    ├── components/   # Reusable Edge.js components
    ├── partials/     # Global partials
    └── pages/        # Pages organized by feature
start/
├── routes/           # One file per feature
└── kernel.ts         # Middleware stack
tests/                # Japa test suites
```

## Contributing

1. Branch from `develop`
2. Use [conventional commits](https://www.conventionalcommits.org/) (e.g., `feat:`, `fix:`, `docs:`)
3. Run `npm run lint && npm run format` before submitting a PR
4. Ensure `npm run typecheck` passes

## License

This project is proprietary and unlicensed (UNLICENSED). All rights reserved.
