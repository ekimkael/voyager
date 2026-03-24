# Machine d'États Ticket - Embarquement

## 1) États

- pending
- boarded
- no-show
- cancelled
- refunded
- reprogrammed

## 2) État initial

- pending (pour le flux embarquement)

## 3) Événements métier

- BOARD_REQUEST
- SCAN_REQUEST
- UNBOARD_REQUEST
- MARK_NOSHOW_REQUEST
- AUTO_NOSHOW_AT_DEPARTURE
- REBOARD_FROM_NOSHOW_REQUEST
- TRIP_REPROGRAMMED
- TICKET_CANCELLED
- TICKET_REFUNDED

## 4) Transitions autorisées

| État courant | Événement                    | État cible   | Autorisé | Conditions                                                                  |
| ------------ | ---------------------------- | ------------ | -------- | --------------------------------------------------------------------------- |
| pending      | BOARD_REQUEST / SCAN_REQUEST | boarded      | oui      | ticket éligible, permissions, fenêtre valide ou override admin, capacité ok |
| no-show      | BOARD_REQUEST / SCAN_REQUEST | boarded      | oui      | correction manuelle autorisée, permissions, voyage compatible               |
| boarded      | UNBOARD_REQUEST              | pending      | oui      | permissions                                                                 |
| pending      | MARK_NOSHOW_REQUEST          | no-show      | oui      | permissions                                                                 |
| pending      | AUTO_NOSHOW_AT_DEPARTURE     | no-show      | oui      | départ planifié atteint                                                     |
| pending      | TICKET_CANCELLED             | cancelled    | oui      | flux annulation                                                             |
| pending      | TICKET_REFUNDED              | refunded     | oui      | flux remboursement                                                          |
| pending      | TRIP_REPROGRAMMED            | reprogrammed | oui      | flux reprogrammation                                                        |

## 5) Transitions interdites (exemples)

- boarded -> boarded (double embarquement)
- cancelled -> boarded
- refunded -> boarded
- reprogrammed -> boarded sur ancien voyage
- no-show -> pending direct (non nécessaire, passer par boarded puis unboard si besoin)

## 6) Gardes (guards)

### 6.1 Guard permission

- Vérifie rôle + permission explicite.
- Vérifie scope agency/company.

### 6.2 Guard fenêtre temporelle

- Fenêtre standard :
  - openAt = departureAt - 30 min
  - closeAt = departureAt + 10 min
- Refus hors fenêtre sauf override admin autorisé par paramètres company.

### 6.3 Guard éligibilité ticket

- État doit appartenir à l'ensemble autorisé de l'événement.
- Ticket doit correspondre au voyage courant.
- Ticket non annulé/non remboursé/non reprogrammé (ancien voyage).

### 6.4 Guard capacité

- Si capacité incohérente ou dépassée : blocage embarquement.

### 6.5 Guard idempotence / concurrence

- Verrou logique recommandé (Adonis locks) par ticketId.
- Si événement déjà appliqué : réponse conflit contrôlé.

## 7) Effets de bord par transition

### 7.1 pending -> boarded

- Mettre status=boarded.
- Renseigner boarded_at, boarded_by_user_id.
- Créer boarding_event action=board.
- Recalculer compteurs voyage.

### 7.2 boarded -> pending

- Vider boarded_at et boarded_by_user_id.
- Créer boarding_event action=unboard.
- Recalculer compteurs voyage.

### 7.3 pending -> no-show (manuel ou auto)

- Mettre status=no-show.
- Renseigner no_show_at.
- Créer boarding_event action=mark_no_show ou auto_no_show.
- Recalculer compteurs voyage.

### 7.4 no-show -> boarded

- Mettre status=boarded.
- Renseigner boarded_at, boarded_by_user_id.
- Créer boarding_event action=board (source=no-show).
- Recalculer compteurs voyage.

## 8) Invariants

- Un ticket ne peut avoir qu'un statut actif à la fois.
- boarded implique boarded_at non null.
- no-show implique no_show_at non null.
- Un ticket boarded ne peut pas être re-boarded sans unboard préalable.
- Toute transition valide écrit un événement d'audit.

## 9) Règle auto no-show

- Déclenchement à departure_at planifié (heure locale agence).
- Cible uniquement tickets pending.
- Tickets déjà boarded ignorés.

## 10) Règle scan

- SCAN_REQUEST est un alias fonctionnel de BOARD_REQUEST.
- Différence : canal=scan et feedback sonore front.

## 11) Tableau résumé des autorisations d'embarquement

| Statut ticket | Embarquer possible | Notes                         |
| ------------- | ------------------ | ----------------------------- |
| pending       | oui                | cas nominal                   |
| no-show       | oui                | correction manuelle autorisée |
| boarded       | non                | éviter double embarquement    |
| cancelled     | non                | interdit                      |
| refunded      | non                | interdit                      |
| reprogrammed  | non                | interdit sur ancien voyage    |
