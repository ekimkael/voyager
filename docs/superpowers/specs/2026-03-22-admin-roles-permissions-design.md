# Admin Roles & Permissions Management

**Date**: 2026-03-22
**Status**: Approved
**Scope**: CRUD rôles + assignation aux utilisateurs avec temporalité

## Decisions

- **Scope** : Gestion des rôles (CRUD, hiérarchie, permissions) + assignation/retrait de rôles aux employés. Pas de CRUD permissions (définies par le code).
- **Hiérarchie** : Arbre visuel, permissions héritées affichées en lecture seule avec indication du rôle source.
- **Rôles système** : Protégés — ni modifiables ni supprimables. Visibles en lecture seule.
- **Assignation** : Globale + date d'expiration optionnelle. Traçabilité `grantedBy` automatique.
- **UI permissions** : Grille hybride — tableau CRUD (read/create/update/delete × ressources) + section permissions spéciales.
- **Approche** : Pages dédiées, navigation classique full-page, cohérente avec le reste du dashboard.

## Nouvelles permissions

| Clé | Description | Sensitive |
|-----|-------------|-----------|
| `role:read` | Voir les rôles | non |
| `role:create` | Créer un rôle | non |
| `role:update` | Modifier un rôle | non |
| `role:delete` | Supprimer un rôle | oui |
| `role:assign` | Assigner/retirer des rôles aux utilisateurs | oui |

## Routes

### Rôles

| Méthode | URL | Action | Permission |
|---------|-----|--------|------------|
| GET | `/dashboard/roles` | `roles.index` | `role:read` |
| GET | `/dashboard/roles/create` | `roles.create` | `role:create` |
| POST | `/dashboard/roles` | `roles.store` | `role:create` |
| GET | `/dashboard/roles/:id` | `roles.show` | `role:read` |
| GET | `/dashboard/roles/:id/edit` | `roles.edit` | `role:update` |
| PUT | `/dashboard/roles/:id` | `roles.update` | `role:update` |
| DELETE | `/dashboard/roles/:id` | `roles.destroy` | `role:delete` |
| POST | `/dashboard/roles/:id/permissions` | `roles.syncPermissions` | `role:update` |

### Assignation (ajouts sur employés)

| Méthode | URL | Action | Permission |
|---------|-----|--------|------------|
| GET | `/dashboard/employees/:id/roles` | `employees.roles` | `role:assign` |
| POST | `/dashboard/employees/:id/roles` | `employees.assignRole` | `role:assign` |
| DELETE | `/dashboard/employees/:id/roles/:assignmentId` | `employees.revokeRole` | `role:assign` |

## Pages & Vues

### `/dashboard/roles` (index)

- Header : titre "Rôles" + bouton "Nouveau rôle" (gated `role:create`)
- Affichage en arbre hiérarchique : rôles groupés par hiérarchie (parents d'abord, enfants indentés)
- Chaque ligne : nom du rôle, badge "Système" si `isSystem`, nombre de permissions, nombre d'utilisateurs assignés
- Actions par ligne : Voir (show), Modifier (edit, masqué si système), Supprimer (destroy, masqué si système)

### `/dashboard/roles/create` et `/dashboard/roles/:id/edit` (form)

- Champs : Nom (texte, requis), Rôle parent (select, optionnel)
- Pattern existant : vue `form.edge` + partial `form_fields.edge`
- En mode edit : nom et parent en lecture seule si `isSystem`

### `/dashboard/roles/:id` (show)

Page centrale avec trois sections :

1. **En-tête** — Nom du rôle, badge système, rôle parent (lien cliquable), bouton "Modifier" (si non système)

2. **Grille de permissions hybride** :
   - **Permissions CRUD** : tableau lignes = ressources, colonnes = read/create/update/delete. Checkboxes. Permissions héritées = checkbox cochée + désactivée + tooltip "Hérité de [rôle parent]"
   - **Permissions spéciales** : liste des permissions non-CRUD avec checkboxes
   - Rôle système : tout en lecture seule
   - Rôle custom : formulaire POST pour sauvegarder

3. **Utilisateurs assignés** — Tableau : nom, email, date d'assignation, expiration (si temporaire), accordé par. Lecture seule (gestion côté fiche employé).

### `/dashboard/employees/:id/roles` (assignation)

- En-tête : nom de l'employé, lien retour vers la fiche
- Rôles actuels : tableau (nom rôle, date assignation, expiration, accordé par, bouton "Retirer")
- Formulaire d'assignation : select rôle (excluant ceux déjà assignés), date d'expiration (optionnelle), bouton "Assigner"

## Controller & Service

### `RolesController`

- **index** — Query rôles du tenant avec preload `parentRole`, `children`, count permissions et users. Pas de pagination. Tri hiérarchique.
- **create** — Charge rôles existants du tenant pour select parent.
- **store** — Valide `createRoleValidator`, crée avec `tenantId`. Gère doublon `23505`.
- **show** — Charge rôle + preload `parentRole`, `rolePermissions.permission`, `userRoleAssignments.user`. Charge toutes les permissions système. Sépare CRUD / spéciales. Marque permissions héritées.
- **edit** — Comme create + charge rôle. Bloque si `isSystem`.
- **update** — Valide `updateRoleValidator`. Bloque si `isSystem`. Gère doublon.
- **destroy** — Bloque si `isSystem`. Vérifie aucun user assigné. Vérifie aucun rôle enfant. Hard delete.
- **syncPermissions** — Reçoit tableau d'IDs permissions. Supprime existantes + recrée. Transaction. Bloque si `isSystem`.

### Ajouts `EmployeesController`

- **roles** (GET) — Charge employé + preload `userRoleAssignments.role` et `.granter`. Charge rôles du tenant pour select.
- **assignRole** (POST) — Valide `assignRoleValidator`. Crée `UserRoleAssignment` avec `grantedBy = auth.user.id`, `expiresAt` optionnel. Gère doublon.
- **revokeRole** (DELETE) — Trouve assignment par ID, vérifie appartenance à l'employé, supprime. Bloque si l'admin retire son propre rôle Admin.

### Validators

- **createRoleValidator** — `name` (string, trim, 2-80 chars), `parentRoleId` (uuid, optional)
- **updateRoleValidator** — identique à create
- **syncPermissionsValidator** — `permissions` (array de uuid)
- **assignRoleValidator** — `roleId` (uuid), `expiresAt` (date, optional, futur uniquement)

## Résolution des permissions héritées

Dans `roles.show`, construction de la grille :

1. Charger toutes les permissions du système
2. Séparer en CRUD (read/create/update/delete) et spéciales (le reste)
3. Charger permissions directes du rôle (via `RolePermission`)
4. Remonter la chaîne `parentRoleId` (max 4 niveaux), collecter permissions de chaque ancêtre
5. Construire structure pour la vue :

```
crudGrid = [
  { resource: 'booking', label: 'Réservations', actions: {
    read:   { granted: true, inherited: false },
    create: { granted: true, inherited: true, from: 'Agent' },
    update: { granted: false, inherited: false },
    delete: { granted: false, inherited: false },
  }},
]

specialPermissions = [
  { key: 'boarding:validate', label: 'Valider un embarquement', granted: true, inherited: false },
]
```

- `granted` = permission active (directe ou héritée)
- `inherited` = vient d'un ancêtre (checkbox désactivée, tooltip rôle source)

## Règles métier

- Un rôle ne peut pas être son propre parent ni créer de cycle
- Suppression impossible si users assignés ou rôles enfants existent
- Rôles système : ni modifiables ni supprimables (vérification `isSystem` côté controller)
- Unicité couple (tenant, name) — erreur `23505` gérée avec flash
- `grantedBy` renseigné automatiquement avec `auth.user.id`
- Expiration : date validée dans le futur. Assignations expirées visibles mais marquées visuellement
- Auto-verrouillage : un admin ne peut pas retirer son propre rôle Admin

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `app/controllers/roles_controller.ts` | Controller CRUD + syncPermissions |
| `app/validators/role.ts` | Validators create, update, syncPermissions, assignRole |
| `start/routes/roles.ts` | Routes CRUD rôles + syncPermissions |
| `resources/views/pages/roles/index.edge` | Liste hiérarchique des rôles |
| `resources/views/pages/roles/show.edge` | Détail rôle + grille permissions + utilisateurs |
| `resources/views/pages/roles/form.edge` | Formulaire create/edit |
| `resources/views/partials/roles/form_fields.edge` | Champs du formulaire |
| `resources/views/pages/employees/roles.edge` | Page assignation rôles d'un employé |

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `config/rbac.ts` | Ajouter 5 permissions (role:read/create/update/delete/assign) |
| `start/routes.ts` | Importer fichier routes roles |
| `start/routes/employees.ts` | Ajouter 3 routes d'assignation |
| `resources/views/components/layout/dashboard.edge` | Mettre à jour lien Rôles dans sidebar |

## Aucune migration requise

Les tables `roles`, `permissions`, `role_permissions`, `user_role_assignments` existent déjà avec tous les champs nécessaires.
