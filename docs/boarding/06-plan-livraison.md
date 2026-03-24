# Plan de Livraison Orienté Terrain

## 1) V1 - MVP opérationnel embarquement

Objectif : rendre l'embarquement utilisable en agence avec fiabilité métier.

Périmètre :

- Module embarquement dans dashboard.
- Carte prochain voyage employé (agence) + accès liste.
- Liste passagers complète avec colonnes métier.
- Recherche fuzzy nom/téléphone/code ticket.
- Validation embarquement manuel + scan continu.
- Gestion statuts : pending, boarded, no-show (manuel + auto départ), unboard.
- Blocage tickets cancelled/refunded/reprogrammed (ancien voyage).
- Contrôle fenêtre 30 min avant / 10 min après.
- Override admin selon paramètre company.
- Compteurs temps réel et places restantes.
- Blocage incohérence capacité.
- Historique embarquement filtrable.
- Exports PDF + Excel.
- Audit complet boarding_events.

Definition of Done V1 :

- Scénario heureux employé validé en E2E.
- Erreurs critiques couvertes par tests.
- Performances acceptables sur scan terrain.

## 2) V1.1 - Durcissement exploitation

Objectif : fiabiliser production et supervision opérationnelle.

Périmètre :

- Hors liste avec rattachement réservation + justifications prédéfinies.
- Clôture auto départ +10 consolidée.
- Clôture manuelle (chef d'agence, dispatcher) si activée.
- Rapport quotidien à minuit vers admin, chef d'agence, dispatcher.
- Polissage messages d'erreur et ergonomie mobile.
- Renforcement concurrence (locks).
- Renforcement observabilité (logs métier, taux d'échec scan).

Definition of Done V1.1 :

- Aucun incident bloquant sur pilote agence.
- Rapports quotidiens stables 7 jours consécutifs.
- Régression V1 nulle.

## 3) V2 - Offline robuste et omnicanal feedback

Objectif : continuité opérationnelle sans réseau + montée en charge multi-agences.

Périmètre :

- Mode offline journée complète.
- File locale événements + synchronisation reprise réseau.
- Résolution conflits basée horodatage appareil.
- Revue manuelle des conflits non résolus.
- Feedback client +2h :
  - V2.0 email
  - V2.x SMS/WhatsApp
- Extension analytics KPI (no-show, performance opérateur, qualité scan).

Definition of Done V2 :

- Workflow offline validé en test terrain dégradé.
- Taux de sync appliquée > 99%.
- Dashboard KPI disponible pour exploitation.

## 4) Ordonnancement recommandé

- Sprint 1 : foundations backend (statuts, events, guards, permissions).
- Sprint 2 : UI liste passagers + scan continu + compteurs.
- Sprint 3 : exports, historique, auto no-show, auto close.
- Sprint 4 : hors liste, reporting quotidien, durcissement.
- Sprint 5+ : offline complet + feedback omnicanal.

## 5) Risques et mitigations

- Risque concurrence double scan : lock par ticket + idempotence.
- Risque fuseaux horaires : normaliser timezone agence et tests horaires.
- Risque qualité données téléphone/code : normalisation stricte + validations.
- Risque adoption terrain : UX mobile simple, signal sonore fiable, latence faible.
