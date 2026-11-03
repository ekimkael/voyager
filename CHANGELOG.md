# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-11-03

### Security

- Upgrade dependencies with known vulnerabilities: a critical issue in proxy address handling (`proxy-addr`) and high-severity issues in request body parsing, form-data uploads, the Vite dev server and email address parsing (Nodemailer 10).

### Fixed

- The production build no longer stops on a TypeScript error in the test suite.

## [1.0.0] - 2026-11-03

### Added

#### Core Platform

- AdonisJS v7 application setup with TypeScript
- Multi-tenant architecture with tenant-scoped data isolation
- Session-based authentication via @adonisjs/auth
- PostgreSQL database with UUID primary keys and native enums
- Real-time Server-Sent Events via AdonisJS Transmit
- Vite build pipeline with HMR for development

#### RBAC

- Four system roles: Admin, Dispatcher, Driver, Reader
- 70+ granular permissions per resource
- Bouncer-based authorization with abilities and policies
- Permission middleware for route-level access control
- RBAC configuration centralized in `config/rbac.ts`

#### Fleet Management

- CRUD operations for buses, routes, cities, employees, franchises, and roles
- Dashboard forms with validation via VineJS
- Tenant-scoped queries for all entities

#### Booking & Ticketing

- Reservation system with seat allocation
- PDF ticket generation with QR codes via PDFKit
- Public booking flow

#### Trip Planning

- Trip creation and scheduling
- Route management with city connections

#### User Profile

- Profile editing (personal information)
- Password change functionality
- Email change with confirmation flow and transactional email
- Password reset through an emailed link

#### Email System

- SMTP transport configuration via @adonisjs/mail
- Transactional email support (email change confirmation, password reset)
- Mail classes with Edge.js email templates

#### Dashboard

- Admin UI with sidebar navigation
- Edge.js component library (forms, inputs, selects, checkboxes, alerts, buttons, badges, dropdown menus, tables, filters, pagination)
- Dashboard lists (bookings, trips, trip history, roles, routes) shown as tables with inline filters and row action menus
- Dates displayed in French format
- Flash messages for user feedback
- Alpine.js-powered interactivity

#### Frontend

- Tailwind CSS v4 styling inspired by shadcn/ui
- Tabler icons via edge-iconify
- Responsive layout components (base, dashboard, public)
