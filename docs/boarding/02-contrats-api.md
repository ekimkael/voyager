# Contrats API - Module Embarquement

## 1) Conventions générales

- Base URL dashboard : /dashboard/boarding
- Auth : session-based auth (middleware auth)
- Scoping obligatoire : company_id + agency_id selon permissions
- Format de réponse succès :
  - success : boolean
  - data : object|array
  - meta : object optionnel
- Format de réponse erreur :
  - success : false
  - error.code : string stable
  - error.message : string localisée FR
  - error.details : object optionnel

## 2) Codes HTTP standards

- 200 OK : lecture ou mutation réussie
- 201 Created : création réussie
- 400 Bad Request : payload invalide métier
- 401 Unauthorized : non authentifié
- 403 Forbidden : permission manquante ou hors périmètre
- 404 Not Found : ressource absente
- 409 Conflict : conflit métier (double embarquement, capacité, sync)
- 422 Unprocessable Entity : validation VineJS
- 500 Internal Server Error : erreur inattendue

## 3) Endpoints - Voyages et listes

## 3.1 GET /dashboard/boarding/departures

Objectif : lister les prochains départs (admin) avec filtres.

Query params :

- date: YYYY-MM-DD (défaut aujourd'hui locale)
- status: scheduled|boarding_open|boarding_closed
- agencyId: uuid
- franchiseId: uuid
- driverId: uuid
- routeId: uuid
- page: number
- perPage: number

Règles :

- Exclure voyages complets.
- Tri : departure_datetime asc, created_at asc.
- Horizon : aujourd'hui uniquement.

Réponse 200 data[] :

- tripId
- routeName
- busCode
- agencyName
- departureDate
- departureTime
- boardingOpenAt
- boardingCloseAt
- boardingStatus
- seatsCapacity
- passengersCount
- boardedCount

Erreurs :

- BOARDING_SCOPE_FORBIDDEN (403)

## 3.2 GET /dashboard/boarding/next-trip

Objectif : retourner le prochain voyage automatique pour employé agence.

Règles :

- Premier voyage date+heure >= now locale agence.
- Exclure annulé, reporté, complet, clôturé.

Réponse 200 :

- hasTrip: boolean
- trip: object nullable
- emptyMessage: string nullable

Erreurs :

- BOARDING_SCOPE_FORBIDDEN (403)

## 3.3 GET /dashboard/boarding/trips/:tripId/passengers

Objectif : liste passagers d'un voyage + métriques embarquement.

Query params :

- q: recherche fuzzy nom/téléphone/code
- status: pending|boarded|no-show|cancelled|refunded|reprogrammed
- page, perPage

Réponse 200 :

- trip: object
- counters:
  - total
  - pending
  - boarded
  - noShow
  - remainingSeats
- passengers[]:
  - ticketId
  - ticketCode
  - passengerName
  - seatNumber
  - phone
  - paymentStatus
  - ticketStatus
  - boardedAt

Erreurs :

- TRIP_NOT_FOUND (404)
- BOARDING_SCOPE_FORBIDDEN (403)

## 4) Endpoints - Actions embarquement

## 4.1 POST /dashboard/boarding/tickets/:ticketId/board

Objectif : valider embarquement manuel.

Payload JSON :

- tripId: uuid
- identityCheckConfirmed: boolean
- channel: manual|scan|offline_sync
- overrideWindow: boolean optionnel

Règles métier :

- status requis : pending ou no-show.
- Interdire cancelled/refunded/reprogrammed (ancien voyage).
- Interdire double embarquement si status boarded.
- Vérifier fenêtre temporelle sauf override admin autorisé.
- Vérifier capacité restante (sinon blocage).

Réponse 200 :

- ticketId
- previousStatus
- newStatus (boarded)
- boardedAt
- boardedBy
- counters mis à jour

Erreurs :

- BOARDING_TICKET_ALREADY_BOARDED (409)
- BOARDING_TICKET_NOT_ELIGIBLE (409)
- BOARDING_WINDOW_CLOSED (409)
- BOARDING_WINDOW_NOT_OPEN (409)
- BOARDING_CAPACITY_MISMATCH_BLOCKED (409)
- BOARDING_OVERRIDE_NOT_ALLOWED (403)
- BOARDING_SCOPE_FORBIDDEN (403)

## 4.2 POST /dashboard/boarding/scan

Objectif : embarquement via scan code ticket.

Payload JSON :

- tripId: uuid
- scannedCode: string
- identityCheckConfirmed: boolean
- continuousMode: boolean
- overrideWindow: boolean optionnel

Règles :

- Résolution scannedCode vers ticket unique.
- Même garde-fous que endpoint board.
- Retourne marqueur sonore front : successTone | errorTone.

Réponse 200 :

- result: success|error
- tone: successTone|errorTone
- ticket: object nullable
- message: string
- counters: object

Erreurs :

- BOARDING_SCAN_CODE_INVALID (404)
- BOARDING_TICKET_ALREADY_BOARDED (409)
- BOARDING_TICKET_NOT_ELIGIBLE (409)
- BOARDING_SCOPE_FORBIDDEN (403)

## 4.3 POST /dashboard/boarding/tickets/:ticketId/unboard

Objectif : annuler embarquement.

Payload JSON :

- tripId: uuid
- reasonCode: string optionnel (liste fermée)

Règles :

- status requis : boarded.
- Transition : boarded -> pending.

Réponse 200 :

- ticketId
- previousStatus: boarded
- newStatus: pending
- counters mis à jour

Erreurs :

- BOARDING_UNBOARD_INVALID_STATE (409)
- BOARDING_SCOPE_FORBIDDEN (403)

## 4.4 POST /dashboard/boarding/tickets/:ticketId/mark-no-show

Objectif : marquer absent manuellement.

Payload JSON :

- tripId: uuid
- reasonCode: string optionnel (liste fermée)

Règles :

- status requis : pending.
- Transition : pending -> no-show.

Réponse 200 :

- ticketId
- previousStatus
- newStatus: no-show
- noShowAt

Erreurs :

- BOARDING_NOSHOW_INVALID_STATE (409)
- BOARDING_SCOPE_FORBIDDEN (403)

## 4.5 POST /dashboard/boarding/tickets/:ticketId/offlist-attach

Objectif : rattacher un passager hors liste à une réservation existante.

Payload JSON :

- tripId: uuid
- bookingReference: string
- justificationCode: string

Règles :

- justificationCode obligatoire et actif.
- bookingReference doit exister et être compatible voyage/company.

Réponse 201 :

- ticketId
- bookingId
- attached: true
- message

Erreurs :

- BOARDING_OFFLIST_JUSTIFICATION_REQUIRED (422)
- BOARDING_OFFLIST_REFERENCE_NOT_FOUND (404)
- BOARDING_OFFLIST_REFERENCE_INCOMPATIBLE (409)

## 5) Endpoints - Historique, export, justifications

## 5.1 GET /dashboard/boarding/history

Objectif : historique des actions d'embarquement.

Query params :

- fromDate, toDate
- agencyId
- tripId
- action
- page, perPage

Règles :

- Employé : restreint à son agence.

Réponse 200 :

- events[]
- pagination

## 5.2 GET /dashboard/boarding/trips/:tripId/export

Objectif : exporter la liste embarquement.

Query params :

- format: pdf|xlsx

Règles :

- Inclure pending, boarded, no-show + horodatages.

Réponse 200 :

- fichier binaire
- content-type selon format

Erreurs :

- BOARDING_EXPORT_FORMAT_UNSUPPORTED (422)

## 5.3 GET /dashboard/boarding/offlist-justifications

Objectif : lister justifications hors liste actives.

Réponse 200 :

- items[] : code, label

## 6) Endpoints - Offline sync

## 6.1 POST /dashboard/boarding/sync

Objectif : rejouer des événements capturés offline.

Payload JSON :

- deviceId: string
- events[]:
  - eventId
  - action
  - ticketId
  - tripId
  - deviceEventTime
  - payload

Règles :

- Priorité au premier horodatage appareil.
- Traitement transactionnel par événement.
- Conflits marqués conflict sans casser tout le lot.

Réponse 200 :

- appliedCount
- conflictCount
- rejectedCount
- results[] : eventId, status, errorCode optionnel

Erreurs :

- BOARDING_SYNC_PAYLOAD_INVALID (422)

## 7) Tâches planifiées backend (non HTTP)

- Auto no-show à l'heure de départ planifiée.
- Auto clôture embarquement à départ + 10 minutes.
- Rapport quotidien agence à minuit locale.
- Envoi mail feedback client à +2h.

## 8) Exemple erreur standard

{
"success": false,
"error": {
"code": "BOARDING_TICKET_ALREADY_BOARDED",
"message": "Ce ticket est déjà embarqué",
"details": {
"ticketId": "..."
}
}
}
