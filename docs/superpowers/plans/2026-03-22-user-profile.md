# User Profile & Security Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow authenticated users to edit their personal info, change their email (with token-based confirmation), and update their password from two settings pages in the dashboard.

**Architecture:** Three controllers (ProfileController, EmailChangeController, SecurityController) handle the three concerns. Email change uses a token stored in `email_change_requests` table with 1h expiration, confirmed via a public route with the auth layout. Mail sent via `@adonisjs/mail` SMTP transport.

**Tech Stack:** AdonisJS v7, Edge.js, VineJS, Lucid ORM, PostgreSQL, Tailwind CSS, Alpine.js, `@adonisjs/mail`

**Spec:** `docs/superpowers/specs/2026-03-22-user-profile-design.md`

---

## File Map

### Files to Create

| File | Responsibility |
|------|---------------|
| `database/migrations/{timestamp}_create_email_change_requests_table.ts` | Migration for email change tokens |
| `app/models/email_change_request.ts` | Lucid model for email change requests |
| `app/validators/profile.ts` | Validators: updateProfile, changeEmail, updatePassword |
| `app/controllers/profile_controller.ts` | Show/update personal info |
| `app/controllers/email_change_controller.ts` | Request email change + confirm token |
| `app/controllers/security_controller.ts` | Show/update password |
| `start/routes/profile.ts` | All profile/security/email-confirm routes |
| `resources/views/pages/profile/index.edge` | Profile edit page |
| `resources/views/pages/profile/security.edge` | Password change page |
| `resources/views/pages/profile/email_confirm.edge` | Email confirmation result page (auth layout) |
| `resources/views/emails/email_change.edge` | Email template for confirmation link |
| `app/mails/email_change_mail.ts` | BaseMail class for email change notification |

### Files to Modify

| File | Change |
|------|--------|
| `start/routes.ts` | Add `import '#start/routes/profile'` |
| `resources/views/components/layout/dashboard.edge` | Update profile/settings links in sidebar menu |
| `start/env.ts` | Add SMTP env variables |
| `app/middleware/throttle_middleware.ts` | Make throttle key parameterizable |

---

## Task 1: Install `@adonisjs/mail` and configure SMTP

**Files:**
- Modify: `start/env.ts`
- Auto-generated: `config/mail.ts`, `adonisrc.ts` provider entry

- [ ] **Step 1: Install the mail package**

Run:
```bash
node ace add @adonisjs/mail --transports=smtp
```

Follow the prompts. This auto-registers the provider and creates `config/mail.ts`.

- [ ] **Step 2: Add SMTP env variables to `start/env.ts`**

Add inside the `Env.create` object:

```typescript
  // Mail (SMTP)
  SMTP_HOST: Env.schema.string(),
  SMTP_PORT: Env.schema.number(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),
  MAIL_FROM_ADDRESS: Env.schema.string(),
  MAIL_FROM_NAME: Env.schema.string(),
```

- [ ] **Step 3: Add env values to `.env`**

```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USERNAME=
SMTP_PASSWORD=
MAIL_FROM_ADDRESS=noreply@voyager.local
MAIL_FROM_NAME=Voyager
```

- [ ] **Step 4: Verify `config/mail.ts` uses env variables**

Ensure the generated config uses `env.get('SMTP_HOST')`, `env.get('SMTP_PORT')`, etc. Update the `from` field:

```typescript
import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

const mailConfig = defineConfig({
  default: 'smtp',

  from: {
    address: env.get('MAIL_FROM_ADDRESS'),
    name: env.get('MAIL_FROM_NAME'),
  },

  mailers: {
    smtp: transports.smtp({
      host: env.get('SMTP_HOST'),
      port: env.get('SMTP_PORT'),
      auth: {
        type: 'login',
        user: env.get('SMTP_USERNAME'),
        pass: env.get('SMTP_PASSWORD'),
      },
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(mail): install @adonisjs/mail and configure SMTP transport"
```

---

## Task 2: Make ThrottleMiddleware key parameterizable

**Files:**
- Modify: `app/middleware/throttle_middleware.ts`

- [ ] **Step 1: Update the middleware to accept a key prefix option**

Replace the hardcoded key in `app/middleware/throttle_middleware.ts`:

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

interface ThrottleEntry {
  count: number
  expiresAt: number
}

const store = new Map<string, ThrottleEntry>()

export default class ThrottleMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { maxAttempts?: number; decayMinutes?: number; key?: string } = {}
  ) {
    const maxAttempts = options.maxAttempts ?? 5
    const decayMinutes = options.decayMinutes ?? 60
    const keyPrefix = options.key ?? 'throttle:global'
    const key = `${keyPrefix}:${ctx.request.ip()}`
    const now = Date.now()

    const entry = store.get(key)

    if (entry && entry.expiresAt > now) {
      if (entry.count >= maxAttempts) {
        const retryAfterSeconds = Math.ceil((entry.expiresAt - now) / 1000)
        ctx.session.flash(
          'error',
          `Trop de tentatives. Réessayez dans ${Math.ceil(retryAfterSeconds / 60)} minute(s).`
        )
        ctx.response.header('Retry-After', String(retryAfterSeconds))
        ctx.response.status(429)
        return ctx.response.redirect().back()
      }
      entry.count++
    } else {
      store.set(key, {
        count: 1,
        expiresAt: now + decayMinutes * 60 * 1000,
      })
    }

    // Cleanup expired entries periodically (every ~100 requests)
    if (Math.random() < 0.01) {
      for (const [k, v] of store) {
        if (v.expiresAt <= now) store.delete(k)
      }
    }

    return next()
  }
}
```

- [ ] **Step 2: Update existing booking route throttle call to pass key**

In `start/routes/bookings.ts` line 12, update the throttle call to pass the explicit key that matches the old hardcoded key:

Old:
```typescript
      .use(middleware.throttle({ maxAttempts: 5, decayMinutes: 60 }))
```

New:
```typescript
      .use(middleware.throttle({ maxAttempts: 5, decayMinutes: 60, key: 'throttle:booking:initiate' }))
```

This preserves the exact same throttle bucket key that was previously hardcoded in the middleware.

- [ ] **Step 3: Commit**

```bash
git add app/middleware/throttle_middleware.ts && git commit -m "refactor(throttle): make throttle key parameterizable"
```

---

## Task 3: Create the `email_change_requests` migration and model

**Files:**
- Create: `database/migrations/{timestamp}_create_email_change_requests_table.ts`
- Create: `app/models/email_change_request.ts`

- [ ] **Step 1: Generate migration**

Run:
```bash
node ace make:migration create_email_change_requests_table
```

- [ ] **Step 2: Write migration content**

Replace the generated file content with:

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'email_change_requests'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('new_email', 254).notNullable()
      table.string('token', 64).notNullable().unique()
      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

- [ ] **Step 3: Run migration**

Run:
```bash
node ace migration:run
```

Expected: migration succeeds, `email_change_requests` table created.

- [ ] **Step 4: Create model file `app/models/email_change_request.ts`**

```typescript
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class EmailChangeRequest extends BaseModel {
  static updatedAt = false

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare newEmail: string

  @column()
  declare token: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
```

- [ ] **Step 5: Commit**

```bash
git add database/migrations/ app/models/email_change_request.ts && git commit -m "feat(profile): add email_change_requests migration and model"
```

---

## Task 4: Create validators

**Files:**
- Create: `app/validators/profile.ts`

- [ ] **Step 1: Create `app/validators/profile.ts`**

```typescript
import vine from '@vinejs/vine'

const firstName = () => vine.string().trim().minLength(2).maxLength(80)
const lastName = () => vine.string().trim().minLength(2).maxLength(80)
const phone = () => vine.string().trim().maxLength(20).optional()

export const updateProfileValidator = vine.compile(
  vine.object({
    firstName: firstName(),
    lastName: lastName(),
    phone: phone(),
  })
)

export const changeEmailValidator = vine.compile(
  vine.object({
    currentPassword: vine.string(),
    newEmail: vine.string().trim().email().maxLength(254),
  })
)

export const updatePasswordValidator = vine.compile(
  vine.object({
    currentPassword: vine.string(),
    newPassword: vine.string().minLength(8).maxLength(32).confirmed({
      confirmationField: 'newPasswordConfirmation',
    }),
  })
)
```

- [ ] **Step 2: Commit**

```bash
git add app/validators/profile.ts && git commit -m "feat(profile): add profile, email change, and password validators"
```

---

## Task 5: Create ProfileController

**Files:**
- Create: `app/controllers/profile_controller.ts`

- [ ] **Step 1: Create `app/controllers/profile_controller.ts`**

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import { updateProfileValidator } from '#validators/profile'

export default class ProfileController {
  async show({ view, auth }: HttpContext) {
    return view.render('pages/profile/index', {
      user: auth.user!,
    })
  }

  async update({ request, response, session, auth }: HttpContext) {
    const payload = await request.validateUsing(updateProfileValidator)
    const user = auth.user!

    user.firstName = payload.firstName
    user.lastName = payload.lastName
    user.phone = payload.phone ?? null

    await user.save()

    session.flash('success', 'Vos informations ont été mises à jour avec succès')
    return response.redirect().toRoute('profile.show')
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/controllers/profile_controller.ts && git commit -m "feat(profile): add ProfileController for personal info management"
```

---

## Task 6: Create EmailChangeMail class and email template

**Files:**
- Create: `app/mails/email_change_mail.ts`
- Create: `resources/views/emails/email_change.edge`

- [ ] **Step 1: Create `app/mails/email_change_mail.ts`**

```typescript
import { BaseMail } from '@adonisjs/mail'
import User from '#models/user'

export default class EmailChangeMail extends BaseMail {
  subject = 'Confirmez votre nouvelle adresse email'

  constructor(
    private user: User,
    private confirmationUrl: string
  ) {
    super()
  }

  prepare() {
    this.message.to(this.user.email).htmlView('emails/email_change', {
      user: this.user,
      confirmationUrl: this.confirmationUrl,
    })
  }
}
```

- [ ] **Step 2: Create `resources/views/emails/email_change.edge`**

```edge
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Bonjour {{ user.firstName }},</h2>

  <p>Vous avez demandé à modifier l'adresse email associée à votre compte Voyager.</p>

  <p>Cliquez sur le bouton ci-dessous pour confirmer votre nouvelle adresse email :</p>

  <p style="text-align: center; margin: 30px 0;">
    <a href="{{ confirmationUrl }}"
      style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 9999px; font-weight: 500; font-size: 14px;">
      Confirmer mon email
    </a>
  </p>

  <p style="color: #666; font-size: 14px;">Ce lien expire dans 1 heure.</p>

  <p style="color: #666; font-size: 14px;">Si vous n'avez pas fait cette demande, vous pouvez ignorer cet email en toute sécurité.</p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #999; font-size: 12px;">&copy; {{ new Date().getFullYear() }} Voyager</p>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add app/mails/email_change_mail.ts resources/views/emails/email_change.edge && git commit -m "feat(profile): add EmailChangeMail class and email template"
```

---

## Task 7: Create EmailChangeController

**Files:**
- Create: `app/controllers/email_change_controller.ts`

- [ ] **Step 1: Create `app/controllers/email_change_controller.ts`**

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import { randomBytes } from 'node:crypto'
import env from '#start/env'
import hash from '@adonisjs/core/services/hash'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import User from '#models/user'
import EmailChangeRequest from '#models/email_change_request'
import EmailChangeMail from '#mails/email_change_mail'
import { changeEmailValidator } from '#validators/profile'

export default class EmailChangeController {
  async store({ request, response, session, auth, tenant }: HttpContext) {
    const payload = await request.validateUsing(changeEmailValidator)
    const user = auth.user!

    const isPasswordValid = await hash.verify(user.password, payload.currentPassword)
    if (!isPasswordValid) {
      session.flash('error', 'Le mot de passe actuel est incorrect')
      return response.redirect().back()
    }

    const emailTaken = await User.query()
      .where('tenantId', tenant!.id)
      .where('email', payload.newEmail)
      .whereNot('id', user.id)
      .first()

    if (emailTaken) {
      session.flash('error', 'Cet email est déjà utilisé par un autre compte')
      return response.redirect().back()
    }

    await EmailChangeRequest.query().where('userId', user.id).delete()

    const token = randomBytes(32).toString('hex')

    await EmailChangeRequest.create({
      userId: user.id,
      newEmail: payload.newEmail,
      token,
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })

    const confirmationUrl = `${env.get('APP_URL')}/email/confirm?token=${token}`

    await mail.send(new EmailChangeMail(user, confirmationUrl))

    session.flash('success', `Un email de confirmation a été envoyé à ${payload.newEmail}`)
    return response.redirect().toRoute('profile.show')
  }

  async confirm({ request, view, auth }: HttpContext) {
    const token = request.input('token')

    if (!token) {
      return view.render('pages/profile/email_confirm', {
        status: 'error',
        message: 'Ce lien est invalide ou a expiré',
        isLoggedIn: auth.isAuthenticated,
      })
    }

    const emailChangeRequest = await EmailChangeRequest.query()
      .where('token', token)
      .preload('user')
      .first()

    if (!emailChangeRequest || emailChangeRequest.expiresAt < DateTime.now()) {
      return view.render('pages/profile/email_confirm', {
        status: 'error',
        message: 'Ce lien est invalide ou a expiré',
        isLoggedIn: auth.isAuthenticated,
      })
    }

    try {
      const user = emailChangeRequest.user
      user.email = emailChangeRequest.newEmail
      await user.save()
      await emailChangeRequest.delete()

      return view.render('pages/profile/email_confirm', {
        status: 'success',
        message: 'Votre adresse email a été mise à jour avec succès',
        isLoggedIn: auth.isAuthenticated,
      })
    } catch (error) {
      if (error.code === '23505') {
        return view.render('pages/profile/email_confirm', {
          status: 'error',
          message: 'Cet email est déjà utilisé par un autre compte',
          isLoggedIn: auth.isAuthenticated,
        })
      }
      throw error
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/controllers/email_change_controller.ts && git commit -m "feat(profile): add EmailChangeController with store and confirm actions"
```

---

## Task 8: Create SecurityController

**Files:**
- Create: `app/controllers/security_controller.ts`

- [ ] **Step 1: Create `app/controllers/security_controller.ts`**

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import { updatePasswordValidator } from '#validators/profile'

export default class SecurityController {
  async show({ view, auth }: HttpContext) {
    return view.render('pages/profile/security', {
      user: auth.user!,
    })
  }

  async update({ request, response, session, auth }: HttpContext) {
    const payload = await request.validateUsing(updatePasswordValidator)
    const user = auth.user!

    const isPasswordValid = await hash.verify(user.password, payload.currentPassword)
    if (!isPasswordValid) {
      session.flash('error', 'Le mot de passe actuel est incorrect')
      return response.redirect().back()
    }

    user.password = payload.newPassword
    await user.save()

    session.flash('success', 'Votre mot de passe a été mis à jour avec succès')
    return response.redirect().toRoute('security.show')
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/controllers/security_controller.ts && git commit -m "feat(profile): add SecurityController for password management"
```

---

## Task 9: Create routes and register them

**Files:**
- Create: `start/routes/profile.ts`
- Modify: `start/routes.ts`

- [ ] **Step 1: Create `start/routes/profile.ts`**

```typescript
import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const ProfileController = () => import('#controllers/profile_controller')
const EmailChangeController = () => import('#controllers/email_change_controller')
const SecurityController = () => import('#controllers/security_controller')

router
  .group(() => {
    router.get('profile', [ProfileController, 'show']).as('profile.show')
    router.put('profile', [ProfileController, 'update']).as('profile.update')

    router
      .post('profile/email', [EmailChangeController, 'store'])
      .as('profile.email.store')
      .use(middleware.throttle({ maxAttempts: 3, decayMinutes: 60, key: 'throttle:email-change' }))

    router.get('profile/security', [SecurityController, 'show']).as('security.show')
    router.put('profile/security', [SecurityController, 'update']).as('security.update')
  })
  .prefix('dashboard')
  .use(middleware.auth())

// Public email confirmation route (accessible without auth)
router.get('email/confirm', [EmailChangeController, 'confirm']).as('email.confirm')
```

- [ ] **Step 2: Add import to `start/routes.ts`**

Add at the end of the imports list:

```typescript
import '#start/routes/profile'
```

- [ ] **Step 3: Commit**

```bash
git add start/routes/profile.ts start/routes.ts && git commit -m "feat(profile): add profile, security, and email confirmation routes"
```

---

## Task 10: Create profile page view

**Files:**
- Create: `resources/views/pages/profile/index.edge`

- [ ] **Step 1: Create `resources/views/pages/profile/index.edge`**

```edge
@layout.dashboard()
<div x-data="{ emailFormOpen: false }" class="mx-auto max-w-3xl">
  {{-- Tabs --}}
  <div class="mb-6 flex border-b border-outline">
    <a href="{{ route('profile.show') }}"
      class="border-b-2 border-primary px-4 pb-3 text-sm font-medium text-on-surface-strong">
      Mon profil
    </a>
    <a href="{{ route('security.show') }}"
      class="px-4 pb-3 text-sm font-medium text-on-surface hover:text-on-surface-strong transition-colors">
      Sécurité
    </a>
  </div>

  {{-- Header --}}
  <div class="mb-8">
    <h1 class="text-2xl font-bold text-on-surface-strong">Informations personnelles</h1>
    <p class="mt-1 text-sm text-on-surface">Mettez à jour vos informations personnelles</p>
  </div>

  {{-- Profile Form --}}
  @form({ route: 'profile.update', method: 'PUT' })
    {{-- First Name / Last Name --}}
    <div class="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-[200px_1fr] sm:items-start py-5">
      <label class="text-sm font-medium text-on-surface-strong sm:pt-2">Nom complet</label>
      <div class="grid grid-cols-2 gap-4">
        @field.root({ name: 'firstName' })
          @!input.control({ placeholder: 'Prénom', value: user.firstName })
          @!field.error()
        @end
        @field.root({ name: 'lastName' })
          @!input.control({ placeholder: 'Nom', value: user.lastName })
          @!field.error()
        @end
      </div>
    </div>

    <hr class="border-outline">

    {{-- Phone --}}
    <div class="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-[200px_1fr] sm:items-start py-5">
      <label class="text-sm font-medium text-on-surface-strong sm:pt-2">Téléphone</label>
      <div>
        @field.root({ name: 'phone' })
          @!input.control({ placeholder: '+237 6XX XXX XXX', value: user.phone ?? '' })
          @!field.error()
        @end
      </div>
    </div>

    <hr class="border-outline">

    {{-- Email (read-only + change action) --}}
    <div class="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-[200px_1fr] sm:items-start py-5">
      <label class="text-sm font-medium text-on-surface-strong sm:pt-2">Email</label>
      <div>
        <p class="py-2 text-sm text-on-surface">{{ user.email }}</p>
        <button x-show="!emailFormOpen" x-on:click.prevent="emailFormOpen = true" type="button"
          class="mt-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
          Modifier l'email
        </button>

        {{-- Inline email change form --}}
        <div x-show="emailFormOpen" x-cloak class="mt-3 rounded-radius border border-outline bg-surface-alt p-4">
          @form({ route: 'profile.email.store', method: 'POST' })
            <div class="flex flex-col gap-4">
              @field.root({ name: 'currentPassword' })
                @!field.label({ text: 'Mot de passe actuel' })
                @!input.control({ type: 'password', placeholder: '••••••••' })
                @!field.error()
              @end

              @field.root({ name: 'newEmail' })
                @!field.label({ text: 'Nouvel email' })
                @!input.control({ type: 'email', placeholder: 'nouveau@example.com' })
                @!field.error()
              @end

              <div class="flex items-center gap-3">
                @!button({ text: 'Envoyer la confirmation', type: 'submit' })
                <button x-on:click.prevent="emailFormOpen = false" type="button"
                  class="rounded-full border border-outline px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-alt transition-colors">
                  Annuler
                </button>
              </div>
            </div>
          @end
        </div>
      </div>
    </div>

    <hr class="border-outline">

    {{-- Action buttons --}}
    <div class="flex items-center justify-end gap-3 pt-5">
      <a href="{{ route('profile.show') }}"
        class="rounded-full border border-outline px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-alt transition-colors">
        Annuler
      </a>
      @!button({ text: 'Enregistrer', type: 'submit' })
    </div>
  @end
</div>
@end
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/pages/profile/index.edge && git commit -m "feat(profile): add profile edit page view"
```

---

## Task 11: Create security page view

**Files:**
- Create: `resources/views/pages/profile/security.edge`

- [ ] **Step 1: Create `resources/views/pages/profile/security.edge`**

```edge
@layout.dashboard()
<div class="mx-auto max-w-3xl">
  {{-- Tabs --}}
  <div class="mb-6 flex border-b border-outline">
    <a href="{{ route('profile.show') }}"
      class="px-4 pb-3 text-sm font-medium text-on-surface hover:text-on-surface-strong transition-colors">
      Mon profil
    </a>
    <a href="{{ route('security.show') }}"
      class="border-b-2 border-primary px-4 pb-3 text-sm font-medium text-on-surface-strong">
      Sécurité
    </a>
  </div>

  {{-- Header --}}
  <div class="mb-8">
    <h1 class="text-2xl font-bold text-on-surface-strong">Mot de passe</h1>
    <p class="mt-1 text-sm text-on-surface">Mettez à jour votre mot de passe</p>
  </div>

  {{-- Password Form --}}
  @form({ route: 'security.update', method: 'PUT' })
    {{-- Current Password --}}
    <div class="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-[200px_1fr] sm:items-start py-5">
      <label class="text-sm font-medium text-on-surface-strong sm:pt-2">Mot de passe actuel</label>
      <div>
        @field.root({ name: 'currentPassword' })
          @!input.control({ type: 'password', placeholder: '••••••••' })
          @!field.error()
        @end
      </div>
    </div>

    <hr class="border-outline">

    {{-- New Password --}}
    <div class="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-[200px_1fr] sm:items-start py-5">
      <label class="text-sm font-medium text-on-surface-strong sm:pt-2">Nouveau mot de passe</label>
      <div>
        @field.root({ name: 'newPassword' })
          @!input.control({ type: 'password', placeholder: '••••••••' })
          @!field.error()
        @end
      </div>
    </div>

    <hr class="border-outline">

    {{-- Confirm Password --}}
    <div class="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-[200px_1fr] sm:items-start py-5">
      <label class="text-sm font-medium text-on-surface-strong sm:pt-2">Confirmer le mot de passe</label>
      <div>
        @field.root({ name: 'newPasswordConfirmation' })
          @!input.control({ type: 'password', placeholder: '••••••••' })
          @!field.error()
        @end
      </div>
    </div>

    <hr class="border-outline">

    {{-- Action buttons --}}
    <div class="flex items-center justify-end gap-3 pt-5">
      <a href="{{ route('security.show') }}"
        class="rounded-full border border-outline px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-alt transition-colors">
        Annuler
      </a>
      @!button({ text: 'Enregistrer', type: 'submit' })
    </div>
  @end
</div>
@end
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/pages/profile/security.edge && git commit -m "feat(profile): add security/password change page view"
```

---

## Task 12: Create email confirmation page view

**Files:**
- Create: `resources/views/pages/profile/email_confirm.edge`

- [ ] **Step 1: Create `resources/views/pages/profile/email_confirm.edge`**

```edge
@layout.base()
<div class="flex min-h-screen">
  {{-- Left panel - decorative --}}
  <div class="auth-panel-bg relative hidden flex-col justify-between overflow-hidden p-10 lg:flex lg:w-1/2 xl:w-[45%]">
    <div class="pointer-events-none absolute inset-0 opacity-[0.04]"
      style="background-image: url(&quot;data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E&quot;)">
    </div>

    <a href="/" class="relative z-10 text-xl font-bold tracking-tight text-white">Voyager</a>

    <div class="relative z-10">
      <h2 class="text-3xl font-semibold leading-tight text-white xl:text-4xl">
        Confirmation de votre adresse email
      </h2>
    </div>

    <p class="relative z-10 text-sm text-white/40">&copy; {{ new Date().getFullYear() }} Voyager</p>
  </div>

  {{-- Right panel - result --}}
  <div class="flex flex-1 flex-col">
    <div class="flex items-center justify-between px-6 py-4 lg:px-10">
      <a href="/" class="text-xl font-bold tracking-tight text-on-surface-strong lg:invisible">Voyager</a>
    </div>

    <div class="flex flex-1 items-center justify-center px-6 pb-12 sm:px-10">
      <div class="w-full max-w-md animate-fade-rise text-center">
        @if(status === 'success')
          <div class="mx-auto mb-6 inline-flex size-12 items-center justify-center rounded-full bg-emerald-100">
            @svg('tabler:check', { class: 'size-6 text-emerald-600' })
          </div>
          <h1 class="text-2xl font-bold text-on-surface-strong">Email confirmé</h1>
          <p class="mt-2 text-on-surface">{{ message }}</p>
          <a href="{{ isLoggedIn ? route('profile.show') : route('session.create') }}"
            class="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-secondary">
            {{ isLoggedIn ? 'Retour au profil' : 'Se connecter' }}
          </a>
        @else
          <div class="mx-auto mb-6 inline-flex size-12 items-center justify-center rounded-full bg-danger/10">
            @svg('tabler:alert-circle', { class: 'size-6 text-danger' })
          </div>
          <h1 class="text-2xl font-bold text-on-surface-strong">Erreur</h1>
          <p class="mt-2 text-on-surface">{{ message }}</p>
          <a href="{{ isLoggedIn ? route('profile.show') : route('session.create') }}"
            class="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-secondary">
            {{ isLoggedIn ? 'Retour au profil' : 'Se connecter' }}
          </a>
        @end
      </div>
    </div>
  </div>
</div>
@end
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/pages/profile/email_confirm.edge && git commit -m "feat(profile): add email confirmation result page with auth layout"
```

---

## Task 13: Update dashboard sidebar links

**Files:**
- Modify: `resources/views/components/layout/dashboard.edge`

- [ ] **Step 1: Update the profile link (line 143)**

In `resources/views/components/layout/dashboard.edge`, replace `href="#"` on the Profil link:

Old:
```edge
          <a href="#" role="menuitem"
            class="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-on-surface underline-offset-2 hover:bg-primary/5 hover:text-on-surface-strong focus-visible:underline focus:outline-hidden dark:text-on-surface-dark dark:hover:bg-primary-dark/5 dark:hover:text-on-surface-dark-strong">
            @svg('tabler:user', { class: 'size-5 shrink-0' })
            <span>Profil</span>
          </a>
```

New:
```edge
          <a href="{{ route('profile.show') }}" role="menuitem"
            class="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-on-surface underline-offset-2 hover:bg-primary/5 hover:text-on-surface-strong focus-visible:underline focus:outline-hidden dark:text-on-surface-dark dark:hover:bg-primary-dark/5 dark:hover:text-on-surface-dark-strong">
            @svg('tabler:user', { class: 'size-5 shrink-0' })
            <span>Profil</span>
          </a>
```

- [ ] **Step 2: Update the settings link (line 150)**

Old:
```edge
          <a href="#" role="menuitem"
            class="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-on-surface underline-offset-2 hover:bg-primary/5 hover:text-on-surface-strong focus-visible:underline focus:outline-hidden dark:text-on-surface-dark dark:hover:bg-primary-dark/5 dark:hover:text-on-surface-dark-strong">
            @svg('tabler:settings', { class: 'size-5 shrink-0' })
            <span>Paramètres</span>
          </a>
```

New:
```edge
          <a href="{{ route('security.show') }}" role="menuitem"
            class="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-on-surface underline-offset-2 hover:bg-primary/5 hover:text-on-surface-strong focus-visible:underline focus:outline-hidden dark:text-on-surface-dark dark:hover:bg-primary-dark/5 dark:hover:text-on-surface-dark-strong">
            @svg('tabler:settings', { class: 'size-5 shrink-0' })
            <span>Sécurité</span>
          </a>
```

- [ ] **Step 3: Commit**

```bash
git add resources/views/components/layout/dashboard.edge && git commit -m "feat(profile): update sidebar profile and security links"
```

---

## Task 14: Smoke test

- [ ] **Step 1: Start the dev server**

```bash
node ace serve --hmr
```

- [ ] **Step 2: Verify routes are registered**

```bash
node ace list:routes | grep -E "profile|security|email/confirm"
```

Expected output should show all 6 routes with correct methods, URLs, and names.

- [ ] **Step 3: Manual browser testing**

1. Log in and navigate to `/dashboard/profile` — verify the profile form loads with current user data
2. Update first name and save — verify flash success message and data persistence
3. Click "Modifier l'email" — verify inline form appears with Alpine.js toggle
4. Navigate to `/dashboard/profile/security` — verify password form loads
5. Change password (correct current + new + confirmation) — verify success
6. Try wrong current password — verify error message
7. Check sidebar links point to correct routes
8. Visit `/email/confirm?token=invalid` — verify error page renders with auth layout

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix(profile): address smoke test findings"
```
