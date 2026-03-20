# Design — Planification de Voyages (Bus + Conducteurs + Trips)

**Date :** 2026-03-20
**Auteur :** Claude (brainstorming avec l'utilisateur)
**Source :** User story admin + modelisation_base_de_donnees.pdf (Tables 4 & 5)

## Contexte

En tant qu'admin, je veux planifier un voyage avec horaire, bus et chauffeur assignés afin d'assurer l'organisation opérationnelle.

### Existant
- Modèles City et Route avec CRUD complet
- RBAC multi-tenant avec rôles Admin, Dispatcher, Chauffeur, Lecteur
- Permissions existantes : vehicle:\*, driver:\*, route:\*, city:\*
- Sidebar avec placeholders pour Véhicules, Conducteurs

### Décisions prises
- **Approche séquentielle** : Bus CRUD → Conducteurs (vue) → Voyages CRUD
- **Conducteurs = Users** avec le rôle Chauffeur (pas de modèle séparé), conforme au PDF Table 5
- **tenant_id** utilisé au lieu de agence_id (pattern existant de l'app)
- **Noms de tables et colonnes en anglais** (convention du projet)
- **next_maintenance_date** sans historique de maintenances (itération future)

---

## Module 1 — Bus (Véhicules)

### Table `buses`

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| tenant_id | UUID | FK → tenants(id), NOT NULL | Scoping multi-tenant |
| license_plate | VARCHAR(20) | NOT NULL, UNIQUE | Plaque d'immatriculation |
| brand | VARCHAR(80) | NOT NULL | Marque |
| model | VARCHAR(80) | NOT NULL | Modèle |
| capacity | INTEGER | NOT NULL, CHECK > 0 | Nombre de sièges |
| year | INTEGER | NOT NULL, CHECK BETWEEN 1990 AND 2035 | Année de mise en service |
| status | ENUM | NOT NULL, DEFAULT 'available' | available \| on_trip \| maintenance \| out_of_service |
| next_maintenance_date | DATE | NULL | Prochaine maintenance prévue |
| active | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft delete |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

**Index :** UNIQUE ON license_plate, ON tenant_id, ON status, ON next_maintenance_date

### Model `Bus`
- `belongsTo` Tenant
- `hasMany` Trip
- Scoped par tenant (comme Route)

### Controller `BusesController`
- CRUD complet : index, create, store, edit, update, destroy
- Permissions : `vehicle:read`, `vehicle:create`, `vehicle:update`, `vehicle:delete`
- Soft delete : toggle `active` au lieu de supprimer
- Impossible de supprimer (désactiver) un bus avec des voyages actifs (scheduled/in_progress)

### Validator
- license_plate : string, 1-20 chars, unique par tenant
- brand, model : string, 1-80 chars
- capacity : number, min 1
- year : number, 1990-2035
- status : enum (available, on_trip, maintenance, out_of_service)
- next_maintenance_date : date, optionnel

### Views
- `pages/buses/index.edge` — table avec immatriculation, marque, modèle, capacité, année, statut (badge couleur), actions
- `pages/buses/form.edge` — formulaire create/edit

### Sidebar
- Lien "Véhicules" → `buses.index`, permission `vehicle:read`

---

## Module 2 — Conducteurs (vue filtrée des Users)

### Pas de nouvelle table
Les conducteurs sont des Users ayant le rôle "Chauffeur" dans le système RBAC existant.

### Controller `DriversController`
- `index()` — Liste les users ayant le rôle Chauffeur dans le tenant courant
- Permission : `driver:read`
- Lecture seule pour cette itération

### View
- `pages/drivers/index.edge` — table listant les conducteurs : nom complet, email, téléphone, statut (actif/inactif), indicateur de disponibilité (pas assigné à un voyage en cours)

### Sidebar
- Lien "Conducteurs" → `drivers.index`, permission `driver:read`

### Hors scope
- Assignation du rôle Chauffeur (module Administration futur)
- CRUD des utilisateurs

---

## Module 3 — Voyages (Trip)

### Table `trips`

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| tenant_id | UUID | FK → tenants(id), NOT NULL | Scoping multi-tenant |
| route_id | UUID | FK → routes(id), NOT NULL | Liaison concernée |
| bus_id | UUID | FK → buses(id), NOT NULL | Véhicule affecté |
| driver_id | UUID | FK → users(id), NOT NULL | Chauffeur assigné |
| departure_time | TIMESTAMP | NOT NULL | Date/heure de départ |
| arrival_time | TIMESTAMP | NOT NULL, CHECK > departure_time | Date/heure d'arrivée prévue |
| class | ENUM | NOT NULL, DEFAULT 'standard' | standard \| vip |
| price | DECIMAL(10,2) | NOT NULL, CHECK >= 0 | Tarif du voyage |
| status | ENUM | NOT NULL, DEFAULT 'scheduled' | scheduled \| in_progress \| completed \| cancelled |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

**Index :** ON route_id, ON bus_id, ON driver_id, ON departure_time, ON status

### Contraintes métier
- Un bus ne peut pas être assigné à deux voyages qui se chevauchent dans le temps
- Un chauffeur ne peut pas être assigné à deux voyages qui se chevauchent dans le temps
- Le chauffeur doit avoir le rôle "Chauffeur" dans le tenant
- Le bus doit appartenir au même tenant
- La route doit appartenir au même tenant et être active

### Model `Trip`
- `belongsTo` Tenant, Route, Bus
- `belongsTo` User (as driver)

### Controller `TripsController`
- CRUD complet : index, create, store, edit, update, destroy
- Permissions : `trip:create`, `trip:read`, `trip:update`, `trip:delete`
- Gestion des statuts : scheduled → in_progress → completed, ou scheduled → cancelled
- À la création d'un voyage immédiat : le bus passe en `on_trip`
- À l'annulation/complétion : le bus repasse en `available`

### Validator
- route_id, bus_id, driver_id : UUID, requis
- departure_time : date future
- arrival_time : date, > departure_time
- class : enum (standard, vip)
- price : number, >= 0
- status : enum (store: uniquement scheduled; update: transitions valides)

### Views
- `pages/trips/index.edge` — table avec route (départ → arrivée), bus (immatriculation), chauffeur (nom), date/heure départ, classe, tarif, statut (badge), actions
- `pages/trips/form.edge` — formulaire avec sélection route, bus (filtrés disponibles), chauffeur (filtrés disponibles), datetime pickers, classe, tarif

### Sidebar
- Nouveau lien "Voyages" → `trips.index`, permission `trip:read`

---

## RBAC — Modifications

### Nouveau resource `trip`
Ajouter dans `config/rbac.ts` :
- `trip:create`
- `trip:read`
- `trip:update`
- `trip:delete` (sensitive)

### Mise à jour des rôles système
- **Admin** : `*` (inchangé, couvre trip:\*)
- **Dispatcher** : ajouter `trip:*`
- **Chauffeur** : ajouter `trip:read`
- **Lecteur** : ajouter `trip:read`

---

## Ordre d'implémentation

1. **Bus** — migration, model, validator, controller, views, sidebar
2. **Conducteurs** — controller, view, sidebar
3. **Voyages** — migration, model, validator, controller, views, sidebar, RBAC update
