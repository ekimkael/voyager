# Proposition de Modèle de Données Minimal

## 1) Entités existantes réutilisées

- trips
- bookings
- passengers
- tickets
- users
- companies
- agences/franchises (selon structure existante)

## 2) Évolutions minimales sur tickets

Champs à ajouter sur tickets (ou table liée si séparation souhaitée) :

- status enum : pending, boarded, no-show, cancelled, refunded, reprogrammed
- boarded_at datetime nullable
- boarded_by_user_id uuid nullable
- no_show_at datetime nullable
- boarding_channel enum nullable : manual, scan, offline_sync
- status_updated_at datetime nullable
- status_updated_by_user_id uuid nullable
- offlist_justification_id uuid nullable

Contraintes recommandées :

- index (trip_id, status)
- index (status)
- unique sur ticket_code si non déjà existant

## 3) Nouvelle table boarding_events

Objectif : audit métier complet de toutes actions d'embarquement.

Champs :

- id uuid pk
- tenant_id uuid
- company_id uuid
- agency_id uuid
- trip_id uuid
- ticket_id uuid nullable
- booking_id uuid nullable
- passenger_id uuid nullable
- action enum :
  - board
  - unboard
  - mark_no_show
  - auto_no_show
  - offlist_attach
  - sync_replay
  - override_window
  - close_boarding
- previous_status enum nullable
- new_status enum nullable
- performed_by_user_id uuid nullable
- channel enum : manual, scan, offline_sync, system
- justification_code varchar nullable
- metadata jsonb nullable
- device_time datetime nullable
- created_at datetime

Index recommandés :

- index (trip_id, created_at)
- index (ticket_id, created_at)
- index (agency_id, created_at)
- index (action, created_at)

## 4) Nouvelle table offlist_justifications

Objectif : référentiel des justifications prédéfinies hors liste.

Champs :

- id uuid pk
- company_id uuid
- code varchar
- label_fr varchar
- is_active boolean default true
- sort_order int default 0
- created_at datetime
- updated_at datetime

Contraintes :

- unique (company_id, code)
- index (company_id, is_active)

## 5) Table de synchronisation offline

Option A (recommandée) : table serveur boarding_sync_events.

Champs :

- id uuid pk
- company_id uuid
- agency_id uuid
- device_id varchar
- client_event_id varchar
- action varchar
- payload jsonb
- device_event_time datetime
- received_at datetime
- applied_at datetime nullable
- status enum : pending, applied, conflict, rejected
- conflict_reason varchar nullable

Contraintes :

- unique (device_id, client_event_id)
- index (status, received_at)

## 6) Paramètres company

Si table de settings existante, ajouter :

- boarding_window_open_minutes int default 30
- boarding_window_close_minutes int default 10
- allow_admin_window_override boolean default false
- enable_offline_boarding boolean default true
- feedback_delay_minutes int default 120
- daily_report_time_local varchar default 00:00

## 7) Table rapports journaliers (optionnelle mais utile)

- id uuid pk
- company_id uuid
- agency_id uuid
- report_date date
- payload jsonb
- generated_at datetime
- mailed_at datetime nullable

Contraintes :

- unique (agency_id, report_date)

## 8) Intégrité et règles SQL utiles

- check status in (...) sur tickets.
- check boarding_channel in (...) si non null.
- FK explicites avec delete behavior cohérent (restrict recommandé sur audit).
- transactions obligatoires pour mutations ticket + event audit.
- lock logique (par ticket) pour éviter double embarquement concurrent.
