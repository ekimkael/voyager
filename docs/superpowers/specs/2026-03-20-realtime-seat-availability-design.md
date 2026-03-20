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
- **Autorisation** : Aucune (donnée non sensible)

### Points de déclenchement (broadcast)

| Moment | Fichier | Méthode | Effet |
|--------|---------|---------|-------|
| Allocation de sièges (client) | `app/controllers/bookings_controller.ts` | `storePassengers()` | Places diminuent |
| Réservation agent (dashboard) | `app/controllers/dashboard/bookings_controller.ts` | `store()` | Places diminuent |
| Annulation (dashboard) | `app/controllers/dashboard/bookings_controller.ts` | `destroy()` | Places augmentent |

### Logique de broadcast

Nouvelle méthode dans `SeatAllocator` :

```typescript
async broadcastAvailability(tripId: string): Promise<void> {
  const availableSeats = await this.getAvailableSeatCount(tripId)
  transmit.broadcast(`trips/${tripId}/seats`, { availableSeats })
}
```

Appelée dans les controllers après chaque action modifiant la disponibilité.

### Données controllers → vues

- `BookingsController.passengers()` : ajoute `availableSeats` + `tripId` aux données de la vue
- `BookingsController.payment()` : idem
- `DashboardBookingsController.create()` : pas de changement (le `tripId` vient du `<select>`, le compteur initial arrive via SSE)

## Intégration client

### Parcours public

**Pages concernées** : `passengers.edge`, `payment.edge`

Comportement :
- Compteur "Places restantes : X" affiché dans le bloc trip summary
- Souscription SSE au canal `trips/${tripId}/seats` via `@adonisjs/transmit-client`
- Mise à jour silencieuse du compteur à chaque message
- Quand `availableSeats <= 0` : texte en rouge "Plus de places disponibles", boutons d'action désactivés (`disabled` + style grisé)

### Dashboard

**Page concernée** : `create.edge`

Comportement :
- Compteur affiché sous le `<select>` de voyage
- Souscription SSE au canal du voyage sélectionné
- Changement de voyage → désinscription ancien canal, souscription nouveau canal
- Quand `availableSeats <= 0` : bouton "Créer la réservation" désactivé

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `package.json` | Ajout `@adonisjs/transmit` + `@adonisjs/transmit-client` |
| `config/transmit.ts` | Créé par `node ace add @adonisjs/transmit` |
| `start/routes.ts` | Ajout `transmit.registerRoutes()` |
| `app/services/seat_allocator.ts` | Ajout méthode `broadcastAvailability()` |
| `app/controllers/bookings_controller.ts` | Broadcast après `storePassengers()` + données `availableSeats`/`tripId` pour vues |
| `app/controllers/dashboard/bookings_controller.ts` | Broadcast après `store()` et `destroy()` |
| `resources/views/pages/bookings/passengers.edge` | Compteur SSE + blocage boutons |
| `resources/views/pages/bookings/payment.edge` | Compteur SSE + blocage bouton |
| `resources/views/pages/dashboard/bookings/create.edge` | Compteur SSE dynamique + blocage bouton |

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
