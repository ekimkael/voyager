# Design : Places restantes en temps réel

## Contexte

Lors du processus de réservation, les clients et agents ne voient pas les changements de disponibilité en temps réel. Un client peut remplir un formulaire alors que les dernières places viennent d'être prises par un autre utilisateur. Le `SeatAllocator` empêche le surbooking en base, mais l'expérience utilisateur est dégradée (erreur tardive).

## Objectif

Afficher un compteur de places restantes mis à jour en temps réel sur les étapes critiques du parcours de réservation (ajout passagers + paiement côté public, création de réservation côté dashboard). Bloquer les actions quand les places tombent à zéro.

## Approche retenue

**SSE événementiel via `@adonisjs/transmit`** (module natif AdonisJS).

Approche écartée : SSE + rafraîchissement périodique — jugé trop complexe pour un bénéfice marginal (l'edge case d'expiration est conservateur, pas dangereux).

## Architecture

### Canal SSE

- **Nom** : `trips/:tripId/seats`
- **Payload** : `{ availableSeats: number }`
- **Autorisation** : Aucune. Les trip IDs sont des UUIDs, ce qui fournit une obscurité suffisante. Le nombre de places n'est pas une donnée sensible. Si nécessaire à l'avenir, on pourra ajouter une autorisation de canal via `transmit.authorize()`.

### Points de déclenchement (broadcast)

| Moment | Fichier | Méthode | Effet |
|--------|---------|---------|-------|
| Allocation de sièges (client) | `app/controllers/bookings_controller.ts` | `storePassengers()` | Places diminuent |
| Confirmation paiement (client) | `app/controllers/bookings_controller.ts` | `processPayment()` | Places verrouillées définitivement (pending → confirmed) |
| Réservation agent (dashboard) | `app/controllers/dashboard/bookings_controller.ts` | `store()` | Places diminuent |
| Annulation (dashboard) | `app/controllers/dashboard/bookings_controller.ts` | `destroy()` | Places augmentent |

**Important** : Le broadcast de `processPayment()` est nécessaire car la confirmation transforme des sièges "temporairement retenus" (pending, expirent après 15min) en sièges "définitivement pris". Le compteur doit refléter ce changement pour les autres utilisateurs.

### Logique de broadcast

Nouvelle méthode dans `SeatAllocator` :

```typescript
async broadcastAvailability(tripId: string): Promise<void> {
  const availableSeats = await this.getAvailableSeatCount(tripId)
  transmit.broadcast(`trips/${tripId}/seats`, { availableSeats })
}
```

**Timing critique** : Le broadcast doit toujours être appelé **après** le commit de la transaction, jamais à l'intérieur. Si la transaction échoue et fait un rollback, un broadcast prématuré enverrait un compteur incorrect aux clients.

### Données controllers → vues

- `BookingsController.passengers()` : passe `availableSeats` (via `seatAllocator.getAvailableSeatCount()`) aux données de la vue. Le `tripId` est accessible via `booking.tripId` déjà disponible dans la vue.
- `BookingsController.payment()` : idem.
- `DashboardBookingsController.create()` : passe `availableSeats` par voyage dans les données de la vue (map `tripId → availableSeats`), utilisé pour le compteur initial à la sélection d'un voyage.

## Intégration client

### Import du client Transmit

`@adonisjs/transmit-client` est importé via Vite (bundler existant du projet).

Note : `@adonisjs/transmit` enregistre ses routes automatiquement. Les routes POST (`__transmit/subscribe`, `__transmit/unsubscribe`) sont compatibles avec `@adonisjs/shield` — le client Transmit envoie le token CSRF via les headers.

### Parcours public

**Pages concernées** : `passengers.edge`, `payment.edge`

Comportement :
- Compteur "Places restantes : X" affiché dans le bloc trip summary, initialisé avec la valeur serveur
- Souscription SSE au canal `trips/${booking.tripId}/seats` via `@adonisjs/transmit-client`
- Mise à jour silencieuse du compteur à chaque message
- Quand `availableSeats <= 0` : texte en rouge "Plus de places disponibles", boutons d'action désactivés (`disabled` + style grisé)
- Sur `passengers.edge` : le bouton "Ajouter un passager" est aussi désactivé quand `passengers.length >= availableSeats` (empêche d'ajouter plus de passagers qu'il n'y a de places)

### Dashboard

**Page concernée** : `create.edge`

Comportement :
- Compteur initialisé avec les données serveur (map de compteurs par voyage), affiché sous le `<select>` de voyage
- Souscription SSE au canal du voyage sélectionné
- Changement de voyage → désinscription ancien canal, souscription nouveau canal
- Quand `availableSeats <= 0` : bouton "Créer la réservation" désactivé
- Correction du bug existant : `trip.bookedSeats` référencé dans le template n'existe pas sur le modèle Trip. Remplacé par les données de compteur fournies par le controller.

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `package.json` | Ajout `@adonisjs/transmit` + `@adonisjs/transmit-client` |
| `adonisrc.ts` | Provider `@adonisjs/transmit` ajouté automatiquement par `node ace add` |
| `config/transmit.ts` | Créé par `node ace add @adonisjs/transmit` |
| `start/routes.ts` | Ajout `transmit.registerRoutes()` |
| `app/services/seat_allocator.ts` | Ajout méthode `broadcastAvailability()` |
| `app/controllers/bookings_controller.ts` | Broadcast après `storePassengers()` et `processPayment()` + données `availableSeats` pour vues `passengers` et `payment` |
| `app/controllers/dashboard/bookings_controller.ts` | Broadcast après `store()` et `destroy()` + données `availableSeats` par voyage pour vue `create` |
| `resources/views/pages/bookings/passengers.edge` | Compteur SSE + blocage boutons (submit + ajouter passager) |
| `resources/views/pages/bookings/payment.edge` | Compteur SSE + blocage bouton payer |
| `resources/views/pages/dashboard/bookings/create.edge` | Compteur SSE dynamique + blocage bouton + correction bug `trip.bookedSeats` |

## Ce qui ne change pas

- Schéma de base de données
- Modèles Lucid
- Validators
- Routes de booking existantes
- Logique de verrouillage en base du `SeatAllocator`

## Edge cases

- **Réservation expirée** : Le compteur peut rester conservateur (affiche moins de places qu'en réalité) jusqu'au prochain événement. Pas dangereux — on ne montre jamais plus de places qu'il n'y en a.
- **Connexion SSE perdue** : `@adonisjs/transmit-client` gère la reconnexion automatique (configurable via `maxReconnectAttempts`).
- **Plusieurs onglets** : Chaque onglet a sa propre souscription SSE, chacun reçoit les mises à jour indépendamment.
- **Reconnexion épuisée** : Si toutes les tentatives de reconnexion échouent, le compteur affiché peut devenir obsolète. Ce cas est acceptable pour un MVP — l'utilisateur peut rafraîchir la page manuellement. Une amélioration future pourrait afficher un indicateur "connexion perdue".
