# User Profile & Security Settings

## Résumé

Permettre à l'utilisateur connecté de modifier ses informations personnelles (nom, prénom, téléphone), son email (avec confirmation par email) et son mot de passe depuis deux pages dans le dashboard, avec un design inspiré d'Untitled UI (tabs horizontaux, sections avec dividers).

## Pages & Routes

### Routes dashboard (auth requise)

| Méthode | URL | Contrôleur | Action |
|---------|-----|------------|--------|
| GET | `/dashboard/profile` | `ProfileController` | `show` |
| PUT | `/dashboard/profile` | `ProfileController` | `update` |
| POST | `/dashboard/profile/email` | `EmailChangeController` | `store` |
| GET | `/dashboard/profile/security` | `SecurityController` | `show` |
| PUT | `/dashboard/profile/security` | `SecurityController` | `update` |

### Route publique (hors auth)

| Méthode | URL | Contrôleur | Action |
|---------|-----|------------|--------|
| GET | `/email/confirm` | `EmailChangeController` | `confirm` |

Le token est passé en query param : `/email/confirm?token=<token>`. Cette page utilise le layout auth (comme login/signup).

## Base de données

### Nouvelle table `email_change_requests`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users, NOT NULL |
| `new_email` | string(254) | NOT NULL |
| `token` | string(64) | UNIQUE, NOT NULL |
| `expires_at` | timestamp | NOT NULL |
| `created_at` | timestamp | NOT NULL |

Règles :
- À chaque nouvelle demande, les demandes précédentes non expirées du même utilisateur sont supprimées.
- Les tokens expirés sont ignorés à la confirmation.
- Après confirmation réussie, la ligne est supprimée.

Aucune modification de la table `users` — les champs nécessaires (firstName, lastName, email, phone, password) existent déjà.

## Contrôleurs & Logique métier

### ProfileController

- `show()` — Affiche la page profil avec les données de l'utilisateur connecté (`auth.user`).
- `update()` — Valide avec `updateProfileValidator`, met à jour firstName, lastName, phone. Redirige vers profil avec message de succès.

### EmailChangeController

- `store()` — Vérifie le mot de passe actuel via `hash.verify()`. Vérifie que le nouvel email n'est pas déjà pris (scope tenant). Supprime les demandes précédentes de l'utilisateur. Crée un `EmailChangeRequest` avec token aléatoire (64 chars) et expiration à 1h. Envoie l'email de confirmation via `EmailChangeMail`. Redirige vers profil avec message "Un email de confirmation a été envoyé à [newEmail]".
- `confirm()` — Récupère le token depuis `request.input('token')`. Cherche la demande en base. Si token invalide ou expiré → affiche la page avec message d'erreur. Si valide → met à jour l'email de l'utilisateur, supprime la demande, affiche la page avec message de succès. Si l'utilisateur est connecté, redirige vers `/dashboard/profile`. Sinon, redirige vers `/login`.

### SecurityController

- `show()` — Affiche le formulaire de changement de mot de passe.
- `update()` — Vérifie le mot de passe actuel via `hash.verify()`. Valide le nouveau mot de passe avec `updatePasswordValidator`. Met à jour le mot de passe. Redirige vers la page sécurité avec message de succès.

## Validateurs

### `updateProfileValidator`

```typescript
firstName: vine.string().trim().minLength(2).maxLength(80)
lastName: vine.string().trim().minLength(2).maxLength(80)
phone: vine.string().trim().maxLength(20).optional()
```

### `changeEmailValidator`

```typescript
currentPassword: vine.string()
newEmail: vine.string().email().maxLength(254)
```

### `updatePasswordValidator`

```typescript
currentPassword: vine.string()
newPassword: vine.string().minLength(8).maxLength(32)
newPassword_confirmation: // confirmed rule
```

## Vues

### Layout commun profil/sécurité

Dans le layout dashboard, les deux pages partagent :
- **Tabs horizontaux** en haut : "Mon profil" (actif sur `/dashboard/profile`) | "Sécurité" (actif sur `/dashboard/profile/security`)
- **En-tête de section** sous les tabs : titre + description
- **Formulaire** : labels à gauche, champs à droite, sections séparées par des dividers horizontaux
- **Boutons d'action** (Annuler / Enregistrer) alignés à droite après un divider final

Design inspiré d'Untitled UI settings-04.

### `pages/profile/index.edge`

Layout dashboard. Tabs avec "Mon profil" actif.

- En-tête : "Informations personnelles" / "Mettez à jour vos informations personnelles"
- Section Prénom / Nom (grille 2 colonnes)
- Divider
- Section Téléphone
- Divider
- Section Email : affiche l'email actuel + bouton "Modifier l'email" qui ouvre un formulaire inline (mot de passe actuel + nouvel email + bouton Envoyer la confirmation)
- Divider
- Boutons Annuler / Enregistrer (pour le formulaire principal nom/prénom/téléphone)

### `pages/profile/security.edge`

Layout dashboard. Tabs avec "Sécurité" actif.

- En-tête : "Mot de passe" / "Mettez à jour votre mot de passe"
- Section Mot de passe actuel
- Divider
- Section Nouveau mot de passe
- Divider
- Section Confirmation du mot de passe
- Divider
- Boutons Annuler / Enregistrer

### `pages/profile/email_confirm.edge`

Layout auth (comme login/signup). Affiche le résultat de la confirmation :
- Succès : message "Votre email a été mis à jour" + lien de redirection
- Erreur : message "Token invalide ou expiré" + lien vers login

### `emails/email_change.edge`

Template email de confirmation :
- Sujet : "Confirmez votre nouvelle adresse email"
- Contenu : salutation avec le prénom, explication de la demande, bouton/lien de confirmation, mention de l'expiration (1h), note "Si vous n'avez pas fait cette demande, ignorez cet email"

## Setup Mail

### Installation

```bash
node ace add @adonisjs/mail --transports=smtp
```

### Variables d'environnement

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
MAIL_FROM_ADDRESS=noreply@example.com
MAIL_FROM_NAME=Voyager
```

### Config (`config/mail.ts`)

Transport SMTP par défaut, adresse d'expédition depuis les variables d'env.

### Classe `EmailChangeMail` (`app/mails/email_change_mail.ts`)

Classe BaseMail qui reçoit l'utilisateur et l'URL de confirmation. Rend le template `emails/email_change.edge`.

## Modèle

### `EmailChangeRequest` (`app/models/email_change_request.ts`)

| Propriété | Type |
|-----------|------|
| `id` | string (UUID) |
| `userId` | string |
| `newEmail` | string |
| `token` | string |
| `expiresAt` | DateTime |
| `createdAt` | DateTime |

Relations : `belongsTo(User)`.

## Navigation

- Mettre à jour le lien "Profil" dans le sidebar du dashboard (`href="#"` → `route('profile.show')`)
- Mettre à jour le lien "Settings" dans le sidebar vers `route('security.show')` ou le supprimer si redondant avec les tabs
