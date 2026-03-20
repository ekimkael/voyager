# Historique des voyages — Design Spec

## Contexte

En tant qu'admin, pouvoir consulter l'historique complet des voyages (terminés et annulés) avec filtres afin d'analyser l'activité passée. La page opérationnelle actuelle (`/trips`) reste dédiée aux voyages planifiés et en cours.

## Décisions

- **Approche** : page dédiée séparée avec filtrage serveur (formulaire GET + query string)
- **Pagination** : 20 résultats par page, serveur
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

| Param          | Type   | Valeurs possibles              |
|----------------|--------|-------------------------------|
| `status`       | string | `completed`, `cancelled`      |
| `route_id`     | string | UUID valide                   |
| `driver_id`    | string | UUID valide                   |
| `bus_id`       | string | UUID valide                   |
| `travel_class` | string | `standard`, `vip`             |
| `date_from`    | string | date ISO (YYYY-MM-DD)         |
| `date_to`      | string | date ISO (YYYY-MM-DD)         |
| `price_min`    | string | nombre >= 0                   |
| `price_max`    | string | nombre >= 0                   |
| `page`         | string | entier >= 1                   |

Tous les filtres sont optionnels. Si un paramètre est invalide, il est ignoré silencieusement.

### Logique

1. Récupérer le tenant depuis `request.tenant`
2. Parser et valider manuellement chaque query param
3. Construire la requête :
   - Base : `Trip.query().where('tenantId', tenant.id).whereIn('status', ['completed', 'cancelled'])`
   - Appliquer conditionnellement chaque filtre valide avec `.where()`
   - Preload : `route` (avec `departureCity` et `arrivalCity`), `bus`, `driver`
   - Tri : `departureTime` DESC
   - Pagination : `.paginate(page, 20)` avec `queryString` pour conserver les filtres dans les liens de pagination
4. Charger les listes pour les selects de filtres : routes, buses, drivers (filtrés par tenant)
5. Passer à la vue : `trips` (paginés), `routes`, `buses`, `drivers`, `filters` (valeurs actives)

## Vue

Fichier : `resources/views/pages/trips/history.edge`

### Structure

1. **En-tête** : titre "Historique des voyages" + lien retour vers `trips.index`

2. **Barre de filtres** : `<form method="GET" action="{{ route('trips.history') }}">`
   - Ligne 1 : Statut (select), Route (select), Chauffeur (select), Bus (select)
   - Ligne 2 : Classe (select), Date de départ (input date), Date de fin (input date), Prix min (input number), Prix max (input number)
   - Actions : bouton "Filtrer" (submit) + lien "Réinitialiser" (href vers `/trips/history`)
   - Chaque input/select conserve sa valeur via les query params passés par le contrôleur

3. **Tableau** (lecture seule, pas de colonne Actions) :
   - Colonnes : Route (départ → arrivée), Bus, Chauffeur, Départ, Arrivée, Classe, Prix, Statut
   - Badges de statut : Terminé (vert), Annulé (rouge)
   - Badges de classe : VIP (violet), Standard (neutre)

4. **Pagination** : liens en bas du tableau avec "Page X sur Y — Z résultats"

5. **État vide** : message "Aucun voyage trouvé pour les filtres sélectionnés"

## Navigation

Ajout d'un lien "Historique" dans le sidebar (`resources/views/components/layout/dashboard.edge`), sous l'entrée "Voyages" existante, protégé par la permission `trip:read`.

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `start/routes/trips.ts` | Ajout route `GET /trips/history` |
| `app/controllers/trips_controller.ts` | Ajout méthode `history()` avec parse des filtres |
| `resources/views/pages/trips/history.edge` | Nouvelle vue (filtres + tableau + pagination) |
| `resources/views/components/layout/dashboard.edge` | Ajout lien "Historique" dans sidebar |
