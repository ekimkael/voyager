# Migration Cleanup, Tenant → Company Rename & Schema Enhancements

**Date**: 2026-03-24
**Status**: Approved

## Objectif

Nettoyer les migrations, renommer `tenant` en `company` dans toute la codebase, ajouter des champs manquants (sex pour customers, pièce d'identité pour passengers), et unifier la gestion des tokens.

## Scope

### 1. Consolidation des migrations (Approche C — 1 table = 1 fichier)

19 migrations → 17 migrations. Changements :
- Suppression de `alter_users_table` (fusionné dans `create_users_table`)
- Suppression de `email_change_requests` et `password_reset_tokens` (remplacés par `tokens`)
- Ajout de `create_tokens_table`
- Renommage `tenants` → `companies` et `tenant_id` → `company_id` partout

**Ordre des migrations** (respecte les FK) :

| # | Fichier | Table | Notes |
|---|---------|-------|-------|
| 1 | `0001_enable_pgcrypto.ts` | — | Extension pgcrypto |
| 2 | `0002_create_companies_table.ts` | companies | Ex-tenants |
| 3 | `0003_create_cities_table.ts` | cities | Global, RLS |
| 4 | `0004_create_franchises_table.ts` | franchises | FK → companies, cities |
| 5 | `0005_create_users_table.ts` | users | FK → companies, franchises. Inclut franchise_id + phone dès le départ |
| 6 | `0006_create_roles_table.ts` | roles | FK → companies |
| 7 | `0007_create_permissions_table.ts` | permissions | Global |
| 8 | `0008_create_user_role_assignments_table.ts` | user_role_assignments | FK → users, roles |
| 9 | `0009_create_role_permissions_table.ts` | role_permissions | FK → roles, permissions |
| 10 | `0010_create_routes_table.ts` | routes | FK → companies, cities |
| 11 | `0011_create_buses_table.ts` | buses | FK → companies |
| 12 | `0012_create_trips_table.ts` | trips | FK → companies, routes, buses, users |
| 13 | `0013_create_customers_table.ts` | customers | FK → companies. + champ `sex` |
| 14 | `0014_create_bookings_table.ts` | bookings | FK → companies, trips, customers, users, franchises |
| 15 | `0015_create_passengers_table.ts` | passengers | FK → bookings. + `id_document_type`, `id_document_number` |
| 16 | `0016_create_payments_table.ts` | payments | FK → bookings |
| 17 | `0017_create_tokens_table.ts` | tokens | FK → users. Remplace email_change_requests + password_reset_tokens |

### 2. Renommage tenant → company

**Portée complète** :
- Table `tenants` → `companies`
- Colonne `tenant_id` → `company_id` dans toutes les tables
- Model `app/models/tenant.ts` → `app/models/company.ts`, classe `Tenant` → `Company`
- Middleware `tenant_middleware.ts` → `company_middleware.ts`
- Service `tenant_service.ts` → `company_service.ts`
- Tous les controllers : `tenantId` → `companyId`, `ctx.tenant` → `ctx.company`
- HttpContext extension : `tenant?: Tenant` → `company?: Company`
- Routes : `tenantSlug` → `companySlug`
- Views Edge.js : toutes les refs tenant
- Config, validators, types

### 3. Nouveaux champs

#### Customers — `sex`
- Type : enum PostgreSQL `sex` (`'male'`, `'female'`)
- Nullable
- Ajouté dans le model Customer

#### Passengers — pièce d'identité
- `id_document_type` : enum PostgreSQL `id_document_type` (`'cni'`, `'passport'`, `'permit'`, `'other'`) — nullable
- `id_document_number` : string, max 50 — nullable
- Validation applicative : si l'un est rempli, l'autre doit l'être

### 4. Table tokens unifiée

Remplace `email_change_requests` et `password_reset_tokens`.

**Structure** :
```
tokens
├── id (UUID, PK, gen_random_uuid())
├── user_id (UUID, FK → users, CASCADE)
├── type (enum token_type: 'password_reset', 'email_change')
├── token (string, unique)
├── metadata (jsonb, nullable)
├── expires_at (timestamp)
├── used_at (timestamp, nullable)
├── created_at (timestamp)
```

- `metadata` : données spécifiques au type (ex: `{ "newEmail": "..." }` pour email_change)
- `used_at` : marque un token comme consommé sans le supprimer

**Model** : `app/models/token.ts`, classe `Token`
- Relations : belongsTo(User)
- Méthodes : `isExpired` getter, `isUsed` getter

### 5. Fichiers supprimés

- `app/models/email_change_request.ts`
- `app/models/password_reset_token.ts`
- Migration `create_email_change_requests_table.ts`
- Migration `create_password_reset_tokens_table.ts`
- Migration `alter_users_table.ts`

### 6. Incohérences à corriger

- Vérifier que toutes les FK CASCADE/RESTRICT sont cohérentes
- S'assurer que tous les index nécessaires sont présents
- Vérifier les enums PostgreSQL (nommage cohérent)
