# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-24

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

#### Email System

- SMTP transport configuration via @adonisjs/mail
- Transactional email support (email change confirmation)
- Mail classes with Edge.js email templates

#### Dashboard

- Admin UI with sidebar navigation
- Edge.js component library (forms, inputs, selects, checkboxes, alerts, buttons, pagination)
- Flash messages for user feedback
- Alpine.js-powered interactivity

#### Frontend

- Tailwind CSS v4 styling inspired by shadcn/ui
- Tabler icons via edge-iconify
- Responsive layout components (base, dashboard, public)
