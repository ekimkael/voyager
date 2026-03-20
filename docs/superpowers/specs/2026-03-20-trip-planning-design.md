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
- **Devise unique (XAF)** par défaut — multi-devises hors scope

---

## Module 1 — Bus (Véhicules)

### Table `buses`

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| tenant_id | UUID | FK → tenants(id) ON DELETE CASCADE, NOT NULL | Scoping multi-tenant |
| license_plate | VARCHAR(20) | NOT NULL, UNIQUE (global) | Plaque d'immatriculation |
| brand | VARCHAR(80) | NOT NULL | Marque |
| model | VARCHAR(80) | NOT NULL | Modèle |
| capacity | INTEGER | NOT NULL, CHECK > 0 | Nombre de sièges |
| year | INTEGER | NOT NULL, CHECK BETWEEN 1990 AND 2035 | Année de mise en service |
| status | ENUM | NOT NULL, DEFAULT 'available' | available \| on_trip \| maintenance \| out_of_service |
| next_maintenance_date | DATE | NULL | Prochaine maintenance prévue |
| active | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft delete |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

**Index :** UNIQUE ON license_plate (global — une plaque physique est unique nationalement, empêche un même bus d'être enregistré par deux tenants), ON tenant_id, ON status, ON next_maintenance_date

**Interaction active/status :** Le champ `active` est un soft delete administratif (bus retiré du système). Le champ `status` reflète l'état opérationnel courant. Un bus avec `active: false` n'apparaît plus dans les listes et ne peut pas être assigné à un voyage, quel que soit son `status`.

### Transitions de statut du bus

```
available ──→ on_trip       (voyage démarre)
on_trip ────→ available     (voyage terminé/annulé)
available ──→ maintenance   (maintenance planifiée)
maintenance → available     (maintenance terminée)
available ──→ out_of_service (panne/retrait)
out_of_service → available  (remise en service)
```

Seuls les bus avec `status: available` et `active: true` peuvent être assignés à un nouveau voyage.

### Model `Bus`
- `belongsTo` Tenant
- `hasMany` Trip
- Scoped par tenant (comme Route)

### Controller `BusesController`
- CRUD complet : index, create, store, edit, update, destroy
- Permissions : `vehicle:read`, `vehicle:create`, `vehicle:update`, `vehicle:delete`
- Soft delete : toggle `active` au lieu de supprimer
- Impossible de désactiver un bus avec des voyages actifs (scheduled/in_progress)

### Validator
- license_plate : string, 1-20 chars, unique globalement
- brand, model : string, 1-80 chars
- capacity : number, min 1
- year : number, 1990-2035
- status : enum (available, on_trip, maintenance, out_of_service)
- next_maintenance_date : date, optionnel

### Views
- `pages/buses/index.edge` — table avec immatriculation, marque, modèle, capacité, année, statut (badge couleur), actions
- `pages/buses/form.edge` — formulaire create/edit

### Sidebar
- Lien "Véhicules" → `buses.index`, permission `vehicle:read` (remplacer le placeholder actuel et ajouter `@can` guard)

---

## Module 2 — Conducteurs (vue filtrée des Users)

### Pas de nouvelle table
Les conducteurs sont des Users ayant le rôle "Chauffeur" dans le système RBAC existant.

### Controller `DriversController`
- `index()` — Liste les users ayant le rôle Chauffeur dans le tenant courant
- Permission : `driver:read`
- Lecture seule pour cette itération

### View
- `pages/drivers/index.edge` — table listant les conducteurs : nom complet, email, statut (actif/inactif), indicateur de disponibilité (pas assigné à un voyage scheduled/in_progress)

Note : le champ téléphone n'existe pas sur le modèle User actuel. Il sera exclu de cette vue. Un champ `phone` pourra être ajouté au User dans une itération future.

### Sidebar
- Lien "Conducteurs" → `drivers.index`, permission `driver:read` (remplacer le placeholder actuel et ajouter `@can` guard)

### Hors scope
- Assignation du rôle Chauffeur (module Administration futur)
- CRUD des utilisateurs
- Permissions driver:create, driver:update, driver:delete (existantes dans le RBAC, utilisées plus tard)

---

## Module 3 — Voyages (Trip)

### Table `trips`

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| tenant_id | UUID | FK → tenants(id) ON DELETE CASCADE, NOT NULL | Scoping multi-tenant |
| route_id | UUID | FK → routes(id) ON DELETE RESTRICT, NOT NULL | Liaison concernée |
| bus_id | UUID | FK → buses(id) ON DELETE RESTRICT, NOT NULL | Véhicule affecté |
| driver_id | UUID | FK → users(id) ON DELETE RESTRICT, NOT NULL | Chauffeur assigné |
| departure_time | TIMESTAMP | NOT NULL | Date/heure de départ |
| arrival_time | TIMESTAMP | NOT NULL, CHECK > departure_time | Date/heure d'arrivée prévue |
| travel_class | ENUM | NOT NULL, DEFAULT 'standard' | standard \| vip |
| price | DECIMAL(10,2) | NOT NULL, CHECK >= 0 | Tarif du voyage (XAF) |
| status | ENUM | NOT NULL, DEFAULT 'scheduled' | scheduled \| in_progress \| completed \| cancelled |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

**Index :** ON route_id, ON bus_id, ON driver_id, ON departure_time, ON status
**Index composites (pour les requêtes de chevauchement) :** ON (bus_id, status, departure_time, arrival_time), ON (driver_id, status, departure_time, arrival_time)

### Contraintes métier
- Un bus ne peut pas être assigné à deux voyages qui se chevauchent dans le temps
- Un chauffeur ne peut pas être assigné à deux voyages qui se chevauchent dans le temps
- Seuls les voyages avec statut `scheduled` ou `in_progress` comptent pour la vérification de chevauchement (`cancelled` et `completed` sont exclus)
- Le chauffeur doit avoir le rôle "Chauffeur" dans le tenant
- Le bus doit appartenir au même tenant, être `active: true` et `status: available`
- La route doit appartenir au même tenant et être active
- Validation de chevauchement au niveau applicatif (controller/validator)

### Transitions de statut du voyage

```
scheduled ───→ in_progress  (départ manuel par l'admin/dispatcher)
scheduled ───→ cancelled    (annulation avant départ)
in_progress ─→ completed    (arrivée confirmée)
in_progress ─→ cancelled    (annulation en cours de route — panne, etc.)
```

- `completed` et `cancelled` sont des états terminaux (pas de modification)
- Le passage scheduled → in_progress est déclenché manuellement
- Lors du passage à `in_progress` : le bus passe en `on_trip`
- Lors du passage à `completed` ou `cancelled` : le bus repasse en `available`

### Model `Trip`
- `belongsTo` Tenant, Route, Bus
- `belongsTo` User (as driver, foreignKey: 'driverId')

### Modèles existants à mettre à jour
- **Route** : ajouter `hasMany` Trip
- **User** : ajouter `hasMany` Trip (foreignKey: 'driverId')

### Controller `TripsController`
- CRUD complet : index, create, store, edit, update, destroy
- Permissions : `trip:create`, `trip:read`, `trip:update`, `trip:delete`
- Gestion des statuts via transitions validées
- Vérification de chevauchement bus/chauffeur à la création et modification

### Validator
- route_id, bus_id, driver_id : UUID, requis
- departure_time : date future (en création ; pas de contrainte future en update si le voyage est déjà in_progress)
- arrival_time : date, > departure_time
- travel_class : enum (standard, vip)
- price : number, >= 0
- status : enum (store: uniquement scheduled ; update: selon transitions valides)

### Views
- `pages/trips/index.edge` — table avec route (départ → arrivée), bus (immatriculation), chauffeur (nom), date/heure départ, classe, tarif, statut (badge), actions
- `pages/trips/form.edge` — formulaire avec sélection route, bus (filtrés disponibles), chauffeur (filtrés disponibles), datetime pickers, classe, tarif

### Sidebar
- Nouveau lien "Voyages" → `trips.index`, permission `trip:read` (avec `@can` guard)

---

## RBAC — Modifications

### Nouveau resource `trip`
Ajouter dans `config/rbac.ts` :

| Resource | Action | Description | isSensitive |
|----------|--------|-------------|-------------|
| trip | create | Planifier un nouveau voyage | false |
| trip | read | Consulter les voyages | false |
| trip | update | Modifier un voyage existant | false |
| trip | delete | Supprimer un voyage | true |

Note : pas de `trip:assign` — l'assignation du bus et du chauffeur fait partie de `trip:create` et `trip:update`.

### Mise à jour des rôles système
- **Admin** : `*` (inchangé, couvre trip:\*)
- **Dispatcher** : ajouter `trip:*`
- **Chauffeur** : ajouter `trip:read`
- **Lecteur** : ajouter `trip:read`

---

## Ordre d'implémentation

1. **Bus** — migration, model, validator, controller, views, sidebar (remplacer placeholder + @can)
2. **Conducteurs** — controller, view, sidebar (remplacer placeholder + @can)
3. **Voyages** — RBAC update, migration, model, validator, controller, views, sidebar, mise à jour models Route et User
