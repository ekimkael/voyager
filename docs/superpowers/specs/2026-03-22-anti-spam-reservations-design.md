# Anti-spam réservations

## Problème

Les routes publiques de réservation n'ont aucune protection contre le spam. Un utilisateur ou un bot peut créer des réservations "pending" en boucle, ce qui :

- Bloque des sièges pendant 15 minutes à chaque fois
- Crée des enregistrements vides/orphelins en base (bookings sans passagers, sans client, sans paiement)
- Peut saturer la capacité d'un voyage artificiellement

## Solution

Quatre mécanismes complémentaires pour couvrir à la fois les abandons légitimes et les attaques automatisées.

---

## 1. Une seule réservation pending par session

### Principe

À l'initiation d'une réservation, si l'utilisateur a déjà un booking "pending" en session, on gère selon le contexte au lieu de créer un doublon.

### Flux

```
POST /booking?trip=:tripId
│
├─ Récupérer currentBookingId depuis la session
│
├─ Si currentBookingId existe ET booking.status === 'pending' :
│   │
│   ├─ Même tripId → redirect vers l'étape en cours
│   │   (l'utilisateur reprend sa progression)
│   │
│   ├─ tripId différent ET aucun passager :
│   │   └─ Réutiliser le booking : booking.tripId = newTripId, booking.save()
│   │
│   └─ tripId différent ET passagers existants :
│       ├─ Passer le booking en status 'cancelled'
│       ├─ Les sièges sont libérés (SeatAllocator ignore les cancelled)
│       └─ Créer un nouveau booking
│
└─ Sinon → créer un nouveau booking normalement
```

### Données de l'ancien booking (cas annulation)

| Donnée | Comportement |
|--------|-------------|
| Booking | Status → `cancelled`, reste en BDD |
| Passagers | Restent liés au booking annulé, ignorés par SeatAllocator |
| Customer | Reste en BDD, réutilisable (identifié par tenantId + phone) |
| Payment | N'existe probablement pas (le spam arrive avant le paiement) |
| Sièges | Libérés automatiquement |

---

## 2. Rate limiting par IP

### Principe

Un middleware de throttling sur la route d'initiation qui limite le nombre de créations de réservation par IP.

### Configuration

- **Route cible** : `POST /booking?trip=:tripId`
- **Clé de stockage** : `throttle:booking:initiate:{ip}` (sans tripId — tous voyages confondus)
- **Limite** : 5 initiations par heure par IP
- **Backend** : cache AdonisJS (store en mémoire)
- **Réponse** : page 429 (Too Many Requests) avec message et temps restant

### Pourquoi seulement sur l'initiation

Les étapes suivantes (passagers, customer, payment) nécessitent de remplir des formulaires avec des données valides. Le spam y est naturellement limité par la validation VineJS.

### Faux positifs

La limite de 5/heure est modérée pour gérer le CGNAT mobile (opérateurs partagent une même IP entre de nombreux utilisateurs) et les réseaux partagés (cybercafés, bureaux, hôtels).

---

## 3. Honeypot anti-bot

### Principe

Un champ caché visuellement dans le formulaire d'initiation. Un humain ne le voit pas et ne le remplit pas. Un bot qui parse le HTML remplit tous les champs automatiquement.

### Implémentation

```html
<input type="text" name="website" class="sr-only" tabindex="-1" autocomplete="off">
```

- Type `text` (pas `hidden`) — les bots sophistiqués ignorent les champs `type="hidden"`
- Caché visuellement via CSS (`sr-only`)
- `tabindex="-1"` empêche la navigation clavier
- `autocomplete="off"` empêche le remplissage automatique du navigateur

### Vérification

- Côté contrôleur : si `request.input('website')` n'est pas vide → rejet silencieux (redirect ou 403)
- Vérification faite **avant** le rate limiting et la création du booking — coût zéro en ressources

---

## 4. Annulation automatique des bookings abandonnés

### Principe

Une commande AdonisJS planifiée qui annule les bookings "pending" dont le voyage est déjà parti.

### Commande

- Nom : `booking:cancel_abandoned`
- Invocation : `node ace booking:cancel_abandoned`

### Critères de sélection

- `status = 'pending'`
- Le voyage lié a une `departureTime < NOW()`

### Action

- Passer le status en `cancelled`

### Planification

- Via CRON dans le panel n0c (hébergeur mutualisé avec Phusion Passenger)
- Fréquence : toutes les 30 minutes
- Entrée crontab : `*/30 * * * * cd /path/to/app && node ace booking:cancel_abandoned`

### Pourquoi une commande ace

- Fonctionne indépendamment de Phusion Passenger (pas de process long-running)
- Simple, testable, exécutable manuellement
- Compatible avec l'environnement mutualisé

---

## Changement de route

L'URL d'initiation change de `POST /booking/trips/:tripId` à `POST /booking?trip=:tripId`.

- Le `tripId` passe en query string au lieu d'un paramètre d'URL
- Les routes nommées et les liens dans les templates doivent être mis à jour
- Les autres routes du flow (`/booking/:id/passengers`, etc.) restent inchangées

---

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `start/routes/bookings.ts` | Changer la route d'initiation |
| `app/controllers/bookings_controller.ts` | Logique session (réutilisation/annulation), honeypot, lire tripId depuis query string |
| `app/middleware/throttle_middleware.ts` | Nouveau middleware de rate limiting |
| `start/kernel.ts` | Enregistrer le middleware throttle |
| `app/commands/booking_cancel_abandoned.ts` | Nouvelle commande ace |
| Templates Edge (formulaire de réservation) | Ajouter le champ honeypot, mettre à jour l'URL du formulaire |
