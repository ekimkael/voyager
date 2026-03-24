# Spec Fonctionnelle Prête à Implémenter

## 1) Objectif

- Permettre l'embarquement opérationnel des passagers par voyage planifié.
- Couvrir deux usages principaux :
  - Admin : choisir un voyage depuis les prochains départs et gérer la liste.
  - Employé d'embarquement : voir automatiquement le prochain voyage de son agence et traiter l'embarquement rapidement (scan prioritaire).

## 2) Périmètre

- Module embarquement intégré au dashboard existant.
- Langue unique : français (V1/V1.1).
- Support desktop + mobile/tablette pour usage terrain.
- Multi-tenant strict : filtrage company/agence selon rôle.

## 3) Définitions métier

- Voyage : instance planifiée d'un trajet (date/heure/bus), pas le trajet théorique.
- Un voyage possède un seul point d'embarquement.
- Un ticket est embarquable sur un seul segment.
- Pas de classes de siège impactant l'embarquement.

## 4) Acteurs et permissions

- Admin :
  - Accès à toutes agences/franchises.
  - Peut embarquer, annuler embarquement, marquer absent/no-show.
  - Peut override la fenêtre d'embarquement si activé dans les paramètres company.
- Employé d'embarquement :
  - Limité à son agence.
  - Ne voit pas les voyages des autres agences.
  - Peut embarquer, annuler embarquement, marquer absent/no-show selon permissions.
- Chef d'agence et dispatcher :
  - Peuvent clôturer manuellement si fonctionnalité exposée.
- Consultation historique :
  - Admin global, chef d'agence, employé d'embarquement.
  - Employé limité à son agence.

## 5) Règles de sélection des voyages

### 5.1 Admin - liste prochains départs

- Source : voyages d'aujourd'hui uniquement.
- Tri par défaut : heure ascendante puis ordre de création.
- Filtres disponibles : statut, agence, franchise, chauffeur, route.
- Filtres non persistants entre sessions.
- Voyages complets : totalement masqués.

### 5.2 Employé - prochain voyage automatique

- Affichage d'une carte en haut du module avec le prochain voyage + action "ouvrir la liste".
- Critère : premier départ dont date+heure >= maintenant (heure locale de l'agence).
- Exclure : voyages annulés, reportés, complets, embarquement clôturé.
- Égalité d'horaire : ordre de création.
- Aucun voyage à venir aujourd'hui : afficher une phrase humoristique fixe.

## 6) Fenêtre d'embarquement et clôture

- Ouverture standard : 30 minutes avant l'heure de départ planifiée.
- Fermeture standard : 10 minutes après départ.
- Hors fenêtre :
  - Blocage par défaut.
  - Override possible pour admin si paramètre company activé.
- Clôture automatique : départ + 10 minutes.
- Clôture manuelle (optionnelle) : chef d'agence ou dispatcher.

## 7) Statuts ticket et transitions

### 7.1 Statuts autorisés

- pending
- boarded
- no-show
- cancelled
- refunded
- reprogrammed

### 7.2 Règles métier

- État initial embarquement : pending.
- Validation embarquement : pending -> boarded.
- Marquer absent : pending -> no-show (manuel autorisé avant départ).
- No-show automatique : au départ planifié.
- Correction manuelle : no-show -> boarded autorisé.
- Annulation embarquement : boarded -> pending autorisée.
- Double embarquement : interdit avec message explicite.

### 7.3 Tickets non embarquables

- cancelled : embarquement interdit.
- refunded : embarquement interdit.
- reprogrammed : interdit sur ancien voyage, autorisé sur le nouveau voyage lié.

## 8) Modes d'embarquement

- Manuel : action en 1 clic, sans modal de confirmation.
- Scan : QR/code-barres format unique.
- Scan continu activé pour terrain.
- Billets papier + mobile supportés.
- Retour immédiat :
  - Succès : feedback visuel + signal sonore A.
  - Erreur : feedback visuel + signal sonore B.
- Contrôle identité : recommandé, non bloquant (avertissement).

## 9) Gestion hors liste

- Embarquement hors liste autorisé avec justification.
- Modèle : rattachement à réservation existante introuvable.
- Justifications prédéfinies à créer en base.
- Pas de validation manager requise.
- Toutes les actions hors liste journalisées.

## 10) Liste passagers et UX

- Sur un voyage : afficher tous les passagers.
- Colonnes obligatoires :
  - nom
  - siège
  - téléphone
  - code ticket
  - statut paiement
- Badges visuels : pending, boarded, no-show, cancelled, refunded, reprogrammed.
- Recherche instantanée tolérante (fuzzy) : nom, téléphone, référence ticket.
- Normalisation téléphone : espaces, +, indicatif.
- Compteur temps réel : embarqués / total.
- Affichage places restantes.
- Si incohérence capacité bus : blocage embarquement + message bloquant.

## 11) Export, reporting et notifications

- Export embarquement V1 : PDF + Excel.
- Export inclut : pending, boarded, no-show + horodatages.
- Rapport quotidien embarquement :
  - Génération automatique à minuit (heure locale).
  - Destinataires : admin global, chef d'agence, dispatcher.
- Feedback client à +2h :
  - Cibles finales : SMS, WhatsApp, email.
  - V1 : email d'abord.
  - Contenu : feedback voyage + expérience agence.

## 12) Audit et sécurité

- Journal d'audit obligatoire pour toutes actions d'embarquement.
- Audit consultable :
  - Admin : global.
  - Chef d'agence : périmètre agence.
  - Employé embarquement : périmètre agence.
- Données personnelles : non masquées selon rôle (décision produit).
- Politique interne entreprise : section dédiée interdisant usage/divulgation personnels.

## 13) Offline et synchronisation

- V1 offline :
  - Lecture locale des listes.
  - File d'attente locale des validations.
  - Synchronisation au retour réseau.
- Durée hors ligne supportée : jusqu'à une journée.
- Résolution des conflits : priorité au premier horodatage appareil.
- Verrouillage de concurrence côté serveur recommandé (locks Adonis) pour cas rares.

## 14) Critères d'acceptation prioritaires

### 14.1 Scénario heureux employé (priorité 1)

- Ouvrir module embarquement.
- Voir la carte prochain voyage de l'agence.
- Ouvrir la liste.
- Scanner un ticket pending.
- Le ticket passe boarded.
- Le compteur embarqués/total s'incrémente.
- L'événement d'audit est créé.

### 14.2 Erreurs prioritaires à sécuriser

- Double scan d'un ticket déjà boarded.
- Tentative sur ticket cancelled/refunded/reprogrammed (ancien voyage).
- Tentative hors fenêtre sans override.
- Tentative d'un employé sur voyage d'une autre agence.
- Tentative sur voyage clôturé.
- Perte réseau + reprise sync.
- Conflits de mise à jour rapprochés.

## 15) KPI prioritaires

- Taux d'embarquement dans la fenêtre standard.
- Taux de no-show par agence et tranche horaire.
- Temps moyen de traitement par passager (scan vs manuel).
- Taux d'erreurs scan.
- Nombre d'incohérences capacité détectées et bloquées.
- Taux de conflits de sync offline.
