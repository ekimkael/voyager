# Historique des voyages — Design Spec

## Contexte

En tant qu'admin, pouvoir consulter l'historique complet des voyages (terminés et annulés) avec filtres afin d'analyser l'activité passée.

La page index actuelle (`/trips`) affiche aujourd'hui tous les statuts. Dans le cadre de cette feature, elle sera modifiée pour ne montrer que les voyages opérationnels (`scheduled`, `in_progress`). La nouvelle page historique prend en charge les voyages passés (`completed`, `cancelled`).

## Décisions

- **Approche** : page dédiée séparée avec filtrage serveur (formulaire GET + query string)
- **Pagination** : 20 résultats par page, serveur — première utilisation de la pagination dans le projet
- **Permission** : réutilise `trip:read` (pas de nouvelle permission)
- **Validation des filtres** : parse manuel, filtres invalides ignorés silencieusement (pas de messages d'erreur)

## Route

| Méthode | Chemin           | Nom             | Permission  |
|---------|------------------|-----------------|-------------|
| GET     | `/trips/history` | `trips.history` | `trip:read` |

Déclarée dans `start/routes/trips.ts`, avant les routes paramétrées (`/:id`).

## Contrôleur

Méthode `history()` dans `app/controllers/trips_controller.ts`.

### Query params acceptés

| Param          | Type   | Valeurs possibles              | Cible                |
|----------------|--------|-------------------------------|----------------------|
| `status`       | string | `completed`, `cancelled`      | `status`             |
| `route_id`     | string | UUID valide                   | `routeId`            |
| `driver_id`    | string | UUID valide                   | `driverId`           |
| `bus_id`       | string | UUID valide                   | `busId`              |
| `travel_class` | string | `standard`, `vip`             | `travelClass`        |
| `date_from`    | string | date ISO (YYYY-MM-DD)         | `departureTime >=`   |
| `date_to`      | string | date ISO (YYYY-MM-DD)         | `departureTime <=`   |
| `price_min`    | string | nombre >= 0                   | `price >=`           |
| `price_max`    | string | nombre >= 0                   | `price <=`           |
| `page`         | string | entier >= 1                   | pagination           |

Tous les filtres sont optionnels. Si un paramètre est invalide, il est ignoré silencieusement.

**Note :** `date_from` et `date_to` filtrent sur la colonne `departureTime` (date de départ du voyage).

### Logique

1. Récupérer le tenant depuis le `HttpContext` — destructuré comme `{ view, request, tenant }: HttpContext` (pattern existant dans tous les contrôleurs)
2. Parser et valider manuellement chaque query param
3. Construire la requête :
   - Base : `Trip.query().where('tenantId', tenant!.id).whereIn('status', ['completed', 'cancelled'])`
   - Appliquer conditionnellement chaque filtre valide avec `.where()`
   - Preload : `route` (avec `departureCity` et `arrivalCity`), `bus`, `driver`
   - Tri : `departureTime` DESC
   - Pagination : `.paginate(page, 20)` puis `.queryString(filters)` sur le paginateur pour conserver les filtres dans les URLs de pagination
4. Charger les listes pour les selects de filtres : routes, buses, drivers (filtrés par tenant)
5. Passer à la vue : `trips` (paginés), `routes`, `buses`, `drivers`, `filters` (valeurs actives)

### Modification de `index()`

Ajouter `.whereIn('status', ['scheduled', 'in_progress'])` à la requête existante pour ne montrer que les voyages opérationnels.

## Vue

Fichier : `resources/views/pages/trips/history.edge`

### Structure

1. **En-tête** : titre "Historique des voyages" + lien retour vers `trips.index`

2. **Barre de filtres** : utiliser le composant `@form` existant avec `method: 'GET'` et `route: 'trips.history'` (cohérent avec le reste du projet, le composant `@form` supporte déjà les formulaires GET et skip le token CSRF)
   - Ligne 1 : Statut (select), Route (select), Chauffeur (select), Bus (select)
   - Ligne 2 : Classe (select), Date de départ (input date), Date de fin (input date), Prix min (input number), Prix max (input number)
   - Actions : bouton "Filtrer" (submit) + lien "Réinitialiser" (href vers `/trips/history`)
   - Chaque input/select conserve sa valeur via les query params passés par le contrôleur

3. **Tableau** (lecture seule, pas de colonne Actions) :
   - Colonnes : Route (départ → arrivée), Bus, Chauffeur, Départ, Arrivée, Classe, Prix (formaté avec `FCFA`), Statut
   - Badges de statut : Terminé (vert), Annulé (rouge)
   - Badges de classe : VIP (violet), Standard (neutre)
   - Note : la colonne Arrivée est ajoutée intentionnellement (absente de l'index) car elle est pertinente pour l'analyse historique

4. **Pagination** : composant réutilisable `resources/views/components/pagination.edge` créé pour l'occasion (sera réutilisable par les autres pages de listing). Utilise les méthodes du `SimplePaginator` de Lucid : `getUrl(page)`, `getNextPageUrl()`, `getPreviousPageUrl()`, `hasMorePages`, `currentPage`, `lastPage`, `total`. Affichage : "Page X sur Y — Z résultats" avec liens Précédent/Suivant et numéros de pages.

5. **État vide** : message "Aucun voyage trouvé pour les filtres sélectionnés"

## Navigation

Ajout d'un lien "Historique" comme entrée séparée dans le sidebar (`resources/views/components/layout/dashboard.edge`), au même niveau que "Voyages", protégé par la permission `trip:read`. Le sidebar actuel utilise des items à plat (`@sidebar.item`) sans concept de sous-items — on reste cohérent avec ce pattern.

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `start/routes/trips.ts` | Ajout route `GET /trips/history` |
| `app/controllers/trips_controller.ts` | Ajout méthode `history()` + modification `index()` pour filtrer les statuts opérationnels |
| `resources/views/pages/trips/history.edge` | Nouvelle vue (filtres + tableau + pagination) |
| `resources/views/components/pagination.edge` | Nouveau composant de pagination réutilisable |
| `resources/views/components/layout/dashboard.edge` | Ajout lien "Historique" dans sidebar |
