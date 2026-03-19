# Dashboard Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a dashboard page with collapsible sidebar layout, migrate the entire app from custom CSS to Tailwind CSS, and integrate edge-iconify with Tabler icons.

**Architecture:** Nested layouts — a base layout (`layouts/base.edge`) provides shared HTML infrastructure (head, Vite, Alpine), and a dashboard layout (`layouts/dashboard.edge`) extends it with a collapsible sidebar + content area. Auth/home pages use the base layout directly. The existing `components/layout.edge` is removed.

**Tech Stack:** AdonisJS v7, Edge.js, Tailwind CSS v4 (via `@tailwindcss/vite`), Alpine.js, edge-iconify with Tabler icons

**Spec:** `docs/superpowers/specs/2026-03-19-dashboard-layout-design.md`

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `resources/css/app.css`

- [ ] **Step 1: Install Tailwind CSS and edge-iconify packages**

Run:
```bash
npm install tailwindcss @tailwindcss/vite edge-iconify @iconify-json/tabler
```

- [ ] **Step 2: Add Tailwind plugin to Vite config**

In `vite.config.ts`, add the Tailwind plugin:

```typescript
import { defineConfig } from 'vite'
import adonisjs from '@adonisjs/vite/client'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    adonisjs({
      entrypoints: ['resources/css/app.css', 'resources/js/app.js'],
      reload: ['resources/views/**/*.edge'],
    }),
    tailwindcss(),
  ],

  server: {
    watch: {
      ignored: ['**/storage/**', '**/tmp/**'],
    },
  },
})
```

- [ ] **Step 3: Replace app.css with Tailwind directives and theme**

Replace the entire content of `resources/css/app.css` with:

```css
@import 'tailwindcss';

@theme {
    /* Light Theme */
    --color-surface: var(--color-white);
    --color-surface-alt: var(--color-neutral-50);
    --color-on-surface: var(--color-neutral-600);
    --color-on-surface-strong: var(--color-neutral-900);
    --color-primary: var(--color-black);
    --color-on-primary: var(--color-neutral-100);
    --color-secondary: var(--color-neutral-800);
    --color-on-secondary: var(--color-white);
    --color-outline: transparent;
    --color-outline-strong: var(--color-neutral-800);

    /* Dark Theme */
    --color-surface-dark: var(--color-neutral-950);
    --color-surface-dark-alt: var(--color-neutral-900);
    --color-on-surface-dark: var(--color-neutral-300);
    --color-on-surface-dark-strong: var(--color-white);
    --color-primary-dark: var(--color-white);
    --color-on-primary-dark: var(--color-black);
    --color-secondary-dark: var(--color-neutral-300);
    --color-on-secondary-dark: var(--color-black);
    --color-outline-dark: var(--color-neutral-700);
    --color-outline-dark-strong: var(--color-neutral-300);

    /* Shared Colors */
    --color-info: var(--color-sky-500);
    --color-on-info: var(--color-white);
    --color-success: var(--color-green-500);
    --color-on-success: var(--color-white);
    --color-warning: var(--color-amber-500);
    --color-on-warning: var(--color-white);
    --color-danger: var(--color-red-500);
    --color-on-danger: var(--color-white);

    /* Border Radius */
    --radius-radius: var(--radius-2xl);
}

@keyframes scale-up {
  from {
    transform: scale(0.7);
  }
  to {
    transform: scale(1);
  }
}

[x-cloak] {
  display: none;
}
```

- [ ] **Step 4: Verify Vite builds successfully**

Run: `npm run dev` (or `node ace serve --hmr`)
Expected: Vite starts without errors, Tailwind CSS compiles.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts resources/css/app.css
git commit -m "feat: install Tailwind CSS, edge-iconify, and Tabler icons"
```

---

### Task 2: Configure edge-iconify

**Files:**
- Create: `start/view.ts`

- [ ] **Step 1: Create the view preload file**

Create `start/view.ts`:

```typescript
import edge from 'edge.js'
import { edgeIconify, addCollection } from 'edge-iconify'
import { icons as tablerIcons } from '@iconify-json/tabler'

addCollection(tablerIcons)
edge.use(edgeIconify)
```

- [ ] **Step 2: Register the preload file in adonisrc**

Check `adonisrc.ts` for the `preloads` array. Add `() => import('#start/view')` if not already present.

Run: `grep -n preloads adonisrc.ts` to find the section.

Add the entry:
```typescript
preloads: [
  () => import('#start/routes'),
  () => import('#start/kernel'),
  () => import('#start/view'),  // <-- add this
],
```

- [ ] **Step 3: Verify icons render**

Temporarily add `@svg('tabler:bus')` to any existing template, start the server, and confirm the icon SVG renders. Then remove the test.

- [ ] **Step 4: Commit**

```bash
git add start/view.ts adonisrc.ts
git commit -m "feat: configure edge-iconify with Tabler icons"
```

---

### Task 3: Create Base Layout

**Files:**
- Create: `resources/views/layouts/base.edge`

This layout replaces `resources/views/components/layout.edge`. It provides the root HTML shell used by all pages.

- [ ] **Step 1: Create the layouts directory and base layout**

Create `resources/views/layouts/base.edge`:

```edge
<!DOCTYPE html>
<html lang="en-us">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>
      Voyager
    </title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @stack('dumper')
  </head>
  <body class="min-h-screen bg-surface-alt font-sans text-on-surface antialiased">
    {{{ await $slots.main() }}}
  </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/layouts/base.edge
git commit -m "feat: create base layout with Tailwind CSS"
```

---

### Task 4: Migrate Edge Components to Tailwind

**Files:**
- Modify: `resources/views/components/button.edge`
- Modify: `resources/views/components/link.edge`
- Modify: `resources/views/components/avatar.edge`
- Modify: `resources/views/components/form/index.edge`
- Modify: `resources/views/components/field/root.edge`
- Modify: `resources/views/components/field/label.edge`
- Modify: `resources/views/components/field/error.edge`
- Modify: `resources/views/components/input/control.edge`
- Modify: `resources/views/components/textarea/control.edge`
- Modify: `resources/views/components/select/control.edge`
- Modify: `resources/views/components/checkbox/group.edge`
- Modify: `resources/views/components/checkbox/control.edge`
- Modify: `resources/views/components/radio/group.edge`
- Modify: `resources/views/components/radio/control.edge`
- Modify: `resources/views/components/alert/root.edge`
- Modify: `resources/views/components/alert/title.edge`
- Modify: `resources/views/components/alert/description.edge`

Components use a `classes` array pattern where CSS classes are merged via `$props.merge({ class: classes })`. Add Tailwind classes to those arrays. The component logic (props, context injection, slots) stays identical — only the `classes` arrays and any hardcoded CSS class names change.

- [ ] **Step 1: Migrate button.edge**

```edge
@let(buttonTextFromSlot = await $slots.main())
@let(buttonText = buttonTextFromSlot.trim() ? buttonTextFromSlot : $props.get('text') ?? '')
@let(classes = ['w-full', 'rounded-radius', 'bg-primary', 'text-on-primary', 'px-4', 'py-2.5', 'text-sm', 'font-medium', 'hover:bg-secondary', 'cursor-pointer', 'transition-colors'])

<button {{
  $props.except(['text']).merge({ class: classes }).toAttrs()
}}>{{{ buttonText }}}</button>
```

- [ ] **Step 2: Migrate link.edge**

```edge
@let(linkTextFromSlot = await $slots.main())
@let(linkText = linkTextFromSlot.trim() ? linkTextFromSlot : $props.get('text') ?? '')
@let(linkHref = $props.has('href')
  ? $props.get('href')
  : $props.get('route')
    ? urlFor(
      $props.get('route'),
      $props.get('routeParams'),
      $props.get('routeOptions')
    )
    : undefined
)
@let(activeClass = request.url() === linkHref ? 'text-on-surface-strong font-semibold' : '')
@let(classes = ['font-medium', 'text-on-surface', 'hover:text-on-surface-strong', 'transition-colors', activeClass])

<a {{ $props
  .except(['href', 'text', 'route', 'routeParams', 'routeOptions'])
  .merge({ href: linkHref, class: classes })
  .toAttrs() }}>{{{ linkText }}}</a>
```

- [ ] **Step 3: Migrate avatar.edge**

```edge
@let(nameInitials = $props.get('initials'))
@let(classes = ['inline-flex', 'items-center', 'justify-center', 'size-8', 'rounded-full', 'bg-primary', 'text-on-primary', 'text-xs', 'font-medium'])

@if($props.get('src'))
  <img {{ $props
  .except(['initials', 'name'])
  .merge({ class: ['size-8', 'rounded-full', 'object-cover'] })
  .toAttrs() }}>
@elseif(nameInitials)
  <span {{ $props
  .except(['initials', 'name', 'src'])
  .merge({ class: classes })
  .toAttrs() }}> {{ nameInitials.toUpperCase() }} </span>
@end
```

- [ ] **Step 4: Migrate input/control.edge**

```edge
@let(useOldValue = !['password', 'file', 'checkbox', 'radio'].includes($props.get('type')))
@let(inputValue = useOldValue
  ? $context.oldValue || $props.get('value') || ''
  : $props.get('value') || ''
)
@let(classes = ['h-10', 'w-full', 'rounded-radius', 'border', 'border-neutral-300', 'bg-surface', 'px-4', 'text-sm', 'text-on-surface-strong', 'outline-none', 'focus:border-primary', 'focus:ring-1', 'focus:ring-primary', 'aria-[invalid=true]:border-danger'])

<input {{ $props
  .except(['value'])
  .merge({
    name: $context.name,
    id: $context.id,
    value: inputValue,
    class: classes,
    type: 'text',
    'aria-invalid': $context.hasErrors ? 'true' : false,
    'data-invalid': $context.hasErrors ? 'true' : false,
    'autofocus': $context.hasErrors ? 'true' : false,
    'aria-describedby': $context.hasErrors ? `${$context.id}-error` : '',
  })
  .mergeIf($props.get('keepChecked'), {
    checked: !!(
      $context.oldValue && ($context.oldValue === inputValue || $context.oldValue === 'on')
    ),
  })
  .toAttrs() }} />
```

- [ ] **Step 5: Migrate textarea/control.edge**

```edge
@let(classes = ['w-full', 'rounded-radius', 'border', 'border-neutral-300', 'bg-surface', 'px-4', 'py-2', 'text-sm', 'text-on-surface-strong', 'outline-none', 'focus:border-primary', 'focus:ring-1', 'focus:ring-primary', 'aria-[invalid=true]:border-danger'])

<textarea {{ $props
  .except(['value'])
  .merge({
    name: $context.name,
    id: $context.id,
    class: classes,
    'aria-invalid': $context.hasErrors ? 'true' : false,
    'data-invalid': $context.hasErrors ? 'true' : false,
    'aria-describedby': $context.hasErrors ? `${$context.id}-error` : '',
  })
  .toAttrs() }}>{{{ $context.oldValue || $props.get('value') || '' }}}</textarea>
```

- [ ] **Step 6: Migrate select/control.edge**

```edge
@let(classes = ['h-10', 'w-full', 'rounded-radius', 'border', 'border-neutral-300', 'bg-surface', 'px-4', 'text-sm', 'text-on-surface-strong', 'outline-none', 'focus:border-primary', 'focus:ring-1', 'focus:ring-primary', 'aria-[invalid=true]:border-danger'])

<select {{ $props
  .except(['options'])
  .merge({
    name: $context.name,
    id: $context.id,
    class: classes,
    'aria-invalid': $context.hasErrors ? 'true' : false,
    'data-invalid': $context.hasErrors ? 'true' : false,
    'aria-describedby': $context.hasErrors ? `${$context.id}-error` : '',
  })
  .toAttrs() }}>
@each(option in $props.get('options'))
  @let(isSelected = option.isSelected
    ? true
    : $context.oldValue && $context.oldValue === option.value
  )
  <option value="{{ option.value }}" {{ isSelected ? 'selected' : '' }}>
    {{ option.name ?? option.value }}
  </option>
@end
</select>
```

- [ ] **Step 7: Migrate field/label.edge**

```edge
@let(labelTextFromSlot = await $slots.main())
@let(labelText = labelTextFromSlot.trim() ? labelTextFromSlot : $props.get('text'))
@let(classes = ['mb-1', 'block', 'text-sm', 'font-medium', 'text-on-surface-strong'])

<label {{ $props
  .except(['text'])
  .merge({
    for: $context.id,
    class: classes,
    'data-invalid': $context.hasErrors ? 'true' : false,
  })
  .toAttrs() }}>{{{ labelText }}}</label>
```

- [ ] **Step 8: Migrate field/error.edge**

```edge
@let(classes = ['mt-1', 'text-sm', 'font-medium', 'text-danger'])

@if($context.hasErrors)
  <div {{ $props.merge({ id: `${$context.id}-error`, class: classes }).toAttrs() }}>
    @each(message in $context.errors)
      <span>{{ message }}</span>
    @end
  </div>
@end
```

- [ ] **Step 9: Migrate alert/root.edge**

```edge
@let(variant = $props.get('variant') || 'default')
@inject({ variant, autoDismiss: $props.get('autoDismiss') })
@let(variantClasses = {
  default: 'border-neutral-300 bg-surface text-on-surface-strong',
  destructive: 'border-danger bg-danger/10 text-danger',
  success: 'border-success bg-success/10 text-success',
})
@let(classes = ['relative', 'min-w-[380px]', 'rounded-radius', 'border', 'px-4', 'py-3', 'text-sm', 'font-medium', 'animate-[scale-up_0.2s_ease-out]', variantClasses[variant] || variantClasses.default])

<div {{ $props
  .except(['variant', 'autoDismiss'])
  .merge({
    role: 'alert',
    class: classes,
    'x-data': 'alert',
    'x-show': 'isVisible',
    'x-cloak': true
  })
  .toAttrs()
}}> {{{ await $slots.main() }}} </div>
```

- [ ] **Step 10: Migrate alert/title.edge**

```edge
@let(titleFromSlot = await $slots.main())
@let(title = titleFromSlot.trim() ? titleFromSlot : $props.get('text'))
@let(classes = ['text-base', 'font-semibold'])

<h2 {{ $props
  .except(['text'])
  .merge({ class: classes })
  .toAttrs() }}>{{{ title }}}</h2>
```

- [ ] **Step 11: Migrate alert/description.edge**

```edge
@let(descriptionFromSlot = await $slots.main())
@let(description = descriptionFromSlot.trim() ? descriptionFromSlot : $props.get('text'))
@let(classes = ['text-sm'])

<section {{ $props
  .except(['text'])
  .merge({ class: classes })
  .toAttrs() }}>{{{ description }}}</section>
```

- [ ] **Step 12: Migrate checkbox/control.edge**

```edge
@assign($context.counter = $context.counter + 1)
@let(classes = ['size-4', 'rounded', 'border', 'border-neutral-300', 'accent-primary'])

<input {{ $props
  .except(['type'])
  .merge({
    type: 'checkbox',
    name: $context.name,
    id: $context.id,
    class: classes,
    checked: $context.oldValue && $context.oldValue.includes($props.get('value')),
  })
  .toAttrs() }} />
```

- [ ] **Step 13: Migrate radio/control.edge**

```edge
@assign($context.counter = $context.counter + 1)
@let(classes = ['size-4', 'border', 'border-neutral-300', 'accent-primary'])

<input {{ $props
  .except(['type'])
  .merge({
    type: 'radio',
    id: $context.id,
    name: $context.name,
    class: classes,
    checked: $context.oldValue && $context.oldValue === $props.get('value'),
  })
  .toAttrs() }} />
```

Note: `form/index.edge`, `field/root.edge`, `checkbox/group.edge`, and `radio/group.edge` have no visual styling — they are pure logic components. No changes needed.

- [ ] **Step 14: Commit**

```bash
git add resources/views/components/
git commit -m "feat: migrate all Edge components to Tailwind CSS"
```

---

### Task 5: Migrate Partials to Tailwind

**Files:**
- Modify: `resources/views/partials/header.edge`
- Modify: `resources/views/partials/flash_alerts.edge`

- [ ] **Step 1: Migrate header.edge**

```edge
<header class="mx-auto max-w-7xl px-8">
  <div class="flex h-16 items-center justify-between">
    <div>
      @link({ route: 'home', text: 'Home' })
        <svg width="auto" height="18" viewBox="0 0 413 38" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M382.5 37.5v-30h7.5V0h15v7.5h7.5v30H405v-15h-15v15h-7.5ZM390 15h15V7.8h-15V15ZM360 37.5V0h7.5v37.5H360ZM315 37.5V0h22.5v7.5h7.5V30h-7.5v7.5H315Zm7.5-7.5h14.7V7.5h-14.7V30ZM277.5 37.5V0H300v7.5h-15V15h15v7.5h-15V30h15v7.5h-22.5ZM225 37.5V0h7.5v7.5h7.5V15h7.5v7.5H240V15h-7.5v22.5H225Zm30 0V15h-7.5V7.5h7.5V0h7.5v37.5H255ZM180 37.5V0h22.5v7.5h7.5V15h-7.5v15h7.5v7.5h-7.5V30H195v-7.5h-7.5v15H180Zm7.5-22.5h14.7V7.5h-14.7V15ZM142.5 37.5V0H165v7.5h-15V15h15v7.5h-15V30h15v7.5h-22.5ZM97.5 37.5V0H120v7.5h7.5V15H120v7.5h-15v15h-7.5ZM105 15h14.7V7.5H105V15ZM60 37.5V15h-7.5V7.5H45V0h7.5v7.5H60V15h7.5v22.5H60Zm15-30V0h7.5v7.5H75ZM67.5 15V7.5H75V15h-7.5ZM0 37.5V0h7.5v15h15V0H30v37.5h-7.5v-15h-15v15H0Z" fill="currentColor"/></svg>
      @end
    </div>
    <div>
      <nav class="flex items-center gap-6">
        @if(auth.user)
          @!avatar({ initials: auth.user.initials })
          @form({ route: 'session.destroy', method: 'POST' })
            @!button({ text: 'Logout' })
          @end
        @else
          @!link({ route: 'new_account.create', text: 'Signup' })
          @!link({ route: 'session.create', text: 'Login' })
        @end
      </nav>
    </div>
  </div>
</header>
```

- [ ] **Step 2: Migrate flash_alerts.edge**

```edge
<div class="fixed top-20 left-0 right-0 z-50 flex flex-col items-center">
  @if(flashMessages.has('error'))
    @alert.root({ variant: 'destructive', autoDismiss: true })
      @!alert.description({ text: flashMessages.get('error') })
    @end
  @end
  @if(flashMessages.has('success'))
    @alert.root({ variant: 'success', autoDismiss: true })
      @!alert.description({ text: flashMessages.get('success') })
    @end
  @end
</div>
```

- [ ] **Step 3: Commit**

```bash
git add resources/views/partials/
git commit -m "feat: migrate partials (header, flash_alerts) to Tailwind CSS"
```

---

### Task 6: Migrate Existing Pages to Use Base Layout

**Files:**
- Modify: `resources/views/pages/home.edge`
- Modify: `resources/views/pages/auth/login.edge`
- Modify: `resources/views/pages/auth/signup.edge`
- Delete: `resources/views/components/layout.edge`

All pages currently use `@layout()` which resolves to `components/layout.edge`. They need to switch to `@layout('layouts/base')` and include the header/flash_alerts partials themselves (since the base layout only provides the HTML shell).

- [ ] **Step 1: Migrate home.edge**

```edge
@layout('layouts/base')
  @include('partials/header')
  <main class="mx-8 flex min-h-[calc(100vh-65px)] flex-col justify-between border border-neutral-200 bg-surface">
    @include('partials/flash_alerts')
    <div class="max-w-4xl px-12 py-24">
      <h1 class="mb-4 text-5xl font-semibold leading-tight tracking-tight text-on-surface-strong">It works — welcome to the simplicity of a Hypermedia app</h1>
      <p class="text-xl text-on-surface">A lightweight foundation for building modern web interfaces — straightforward, flexible, and true to the web's core simplicity.</p>
    </div>

    <div class="grid grid-cols-3 border-t border-neutral-200">
      <a href="https://insiders.adonisjs.com/docs/v7-alpha/introduction" target="_blank" class="border-r border-neutral-200 px-10 py-8 transition-colors first:border-l hover:bg-surface-alt">
        <h3 class="mb-2 text-xl font-semibold tracking-tight text-on-surface-strong">Official Docs &nbsp;›</h3>
        <p class="text-on-surface">Comprehensive reference for building with AdonisJS</p>
      </a>

      <a href="https://adocasts.com/" target="_blank" class="border-r border-neutral-200 px-10 py-8 transition-colors hover:bg-surface-alt">
        <h3 class="mb-2 text-xl font-semibold tracking-tight text-on-surface-strong">Adocasts &nbsp;›</h3>
        <p class="text-on-surface">Guided video tutorials for everyday development</p>
      </a>

      <a href="https://discord.gg/vDcEjq6" target="_blank" class="px-10 py-8 transition-colors hover:bg-surface-alt">
        <h3 class="mb-2 text-xl font-semibold tracking-tight text-on-surface-strong">Discord &nbsp;›</h3>
        <p class="text-on-surface">Connect with developers building with AdonisJS every day</p>
      </a>
    </div>
  </main>
@end
```

- [ ] **Step 2: Migrate login.edge**

```edge
@layout('layouts/base')
  @include('partials/header')
  <main class="mx-8 flex min-h-[calc(100vh-65px)] border border-neutral-200 bg-surface">
    @include('partials/flash_alerts')
    <div class="m-auto flex w-full max-w-md flex-col justify-center">
      <div class="mb-8">
        <h1 class="mb-1 text-3xl font-semibold tracking-tight text-on-surface-strong">Login</h1>
        <p class="text-lg text-on-surface">Enter your email and password below to log in</p>
      </div>

      <div>
        @form({ route: 'session.store', method: 'POST' })
          <div class="flex flex-col gap-6">
            <div>
              @field.root({ name: 'email' })
                @!field.label({ text: 'Email' })
                @!input.control({ type: 'email' })
                @!field.error()
              @end
            </div>

            <div>
              @field.root({ name: 'password' })
                @!field.label({ text: 'Password' })
                @!input.control({ type: 'password' })
                @!field.error()
              @end
            </div>

            <div>
              @!button({ text: 'Login', type: 'submit' })
            </div>
          </div>
        @end
      </div>
    </div>
  </main>
@end
```

- [ ] **Step 3: Migrate signup.edge**

```edge
@layout('layouts/base')
  @include('partials/header')
  <main class="mx-8 flex min-h-[calc(100vh-65px)] border border-neutral-200 bg-surface">
    @include('partials/flash_alerts')
    <div class="m-auto flex w-full max-w-md flex-col justify-center py-12">
      <div class="mb-8">
        <h1 class="mb-1 text-3xl font-semibold tracking-tight text-on-surface-strong">Signup</h1>
        <p class="text-lg text-on-surface">Create your company account</p>
      </div>

      <div>
        @form({ route: 'new_account.store', method: 'POST' })
          <div class="flex flex-col gap-6">
            <div>
              @field.root({ name: 'companyName' })
                @!field.label({ text: 'Company name' })
                @!input.control({ placeholder: 'Your transport company' })
                @!field.error()
              @end
            </div>

            <div>
              @field.root({ name: 'firstName' })
                @!field.label({ text: 'First name' })
                @!input.control()
                @!field.error()
              @end
            </div>

            <div>
              @field.root({ name: 'lastName' })
                @!field.label({ text: 'Last name' })
                @!input.control()
                @!field.error()
              @end
            </div>

            <div>
              @field.root({ name: 'email' })
                @!field.label({ text: 'Email' })
                @!input.control({ type: 'email', autocomplete: 'email' })
                @!field.error()
              @end
            </div>

            <div>
              @field.root({ name: 'password' })
                @!field.label({ text: 'Password' })
                @!input.control({ type: 'password', autocomplete: 'new-password' })
                @!field.error()
              @end
            </div>

            <div>
              @field.root({ name: 'passwordConfirmation' })
                @!field.label({ text: 'Confirm password' })
                @!input.control({ type: 'password', autocomplete: 'new-password' })
                @!field.error()
              @end
            </div>

            <div>
              @!button({ text: 'Sign up', type: 'submit' })
            </div>
          </div>
        @end
      </div>
    </div>
  </main>
@end
```

- [ ] **Step 4: Delete the old layout component**

```bash
rm resources/views/components/layout.edge
```

- [ ] **Step 5: Verify all pages render correctly**

Start the server and navigate to:
- `GET /` — home page with hero + cards
- `GET /login` — login form
- `GET /signup` — signup form

Confirm all pages render with Tailwind styling, no broken layouts, no missing styles.

- [ ] **Step 6: Commit**

```bash
git add resources/views/pages/ resources/views/components/layout.edge
git commit -m "feat: migrate home, login, signup pages to Tailwind and base layout"
```

---

### Task 7: Create Dashboard Controller

**Files:**
- Create: `app/controllers/dashboard_controller.ts`

- [ ] **Step 1: Create the dashboard controller**

Create `app/controllers/dashboard_controller.ts`:

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import PermissionResolver from '#services/permission_resolver'

export default class DashboardController {
  async index({ view, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const resolver = new PermissionResolver(user)
    const permissions = await resolver.permissions()

    return view.render('pages/dashboard/index', {
      permissions: [...permissions],
    })
  }
}
```

Note: We pass permissions as an array so Edge can use `.includes()` for checks.

- [ ] **Step 2: Add dashboard route to the existing auth group**

In `start/routes.ts`, add the dashboard route **inside the existing authenticated group** (the one that already has `router.post('logout', ...)`). Do NOT create a new group:

```typescript
router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])
    router.get('dashboard', [controllers.Dashboard, 'index']).as('dashboard.index')
  })
  .use(middleware.auth())
```

- [ ] **Step 3: Update SessionController to redirect to dashboard after login**

In `app/controllers/session_controller.ts`, change the redirect after login from `home` to `dashboard.index`:

```typescript
// In store() method, change:
response.redirect().toRoute('home')
// To:
response.redirect().toRoute('dashboard.index')
```

- [ ] **Step 4: Commit**

```bash
git add app/controllers/dashboard_controller.ts app/controllers/session_controller.ts start/routes.ts
git commit -m "feat: add dashboard controller with permission resolution and login redirect"
```

---

### Task 8: Create Dashboard Layout with Collapsible Sidebar

**Files:**
- Create: `resources/views/layouts/dashboard.edge`

This is the core layout. It extends `layouts/base` and provides the sidebar + content area.

- [ ] **Step 1: Create the dashboard layout**

Create `resources/views/layouts/dashboard.edge`:

```edge
@layout('layouts/base')
  <div x-data="{ sidebarCollapsed: false, mobileSidebarOpen: false }" class="flex min-h-screen">

    {{-- Mobile backdrop --}}
    <div
      x-show="mobileSidebarOpen"
      x-transition.opacity
      x-on:click="mobileSidebarOpen = false"
      x-cloak
      class="fixed inset-0 z-40 bg-black/50 lg:hidden"
    ></div>

    {{-- Sidebar --}}
    <aside
      x-cloak
      :class="[
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-60',
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]"
      class="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-neutral-200 bg-surface transition-all duration-200 lg:static lg:z-auto"
    >

      {{-- Logo / App Name --}}
      <div class="flex h-14 items-center border-b border-neutral-200 px-4">
        <a href="/" class="flex items-center gap-2 overflow-hidden">
          <span class="text-lg font-bold text-on-surface-strong" x-show="!sidebarCollapsed" x-cloak>Voyager</span>
          <span class="text-lg font-bold text-on-surface-strong" x-show="sidebarCollapsed" x-cloak>V</span>
        </a>

        {{-- Collapse toggle (desktop only) --}}
        <button
          x-on:click="sidebarCollapsed = !sidebarCollapsed"
          class="ml-auto hidden cursor-pointer text-on-surface hover:text-on-surface-strong lg:block"
        >
          <template x-if="sidebarCollapsed">
            @svg('tabler:chevrons-right', { class: 'size-5' })
          </template>
          <template x-if="!sidebarCollapsed">
            @svg('tabler:chevrons-left', { class: 'size-5' })
          </template>
        </button>

        {{-- Close button (mobile only) --}}
        <button
          x-on:click="mobileSidebarOpen = false"
          class="ml-auto cursor-pointer text-on-surface hover:text-on-surface-strong lg:hidden"
        >
          @svg('tabler:x', { class: 'size-5' })
        </button>
      </div>

      {{-- Navigation --}}
      <nav class="flex-1 overflow-y-auto px-3 py-4">
        <ul class="space-y-1">
          @!component('layouts/partials/sidebar_item', {
            href: route('dashboard.index'),
            icon: 'tabler:layout-dashboard',
            label: 'Dashboard',
          })
          @!component('layouts/partials/sidebar_item', {
            href: '#',
            icon: 'tabler:bus',
            label: 'Véhicules',
          })
          @!component('layouts/partials/sidebar_item', {
            href: '#',
            icon: 'tabler:route',
            label: 'Routes',
          })
          @!component('layouts/partials/sidebar_item', {
            href: '#',
            icon: 'tabler:map-pin',
            label: 'Arrêts',
          })
          @!component('layouts/partials/sidebar_item', {
            href: '#',
            icon: 'tabler:steering-wheel',
            label: 'Conducteurs',
          })
        </ul>

        {{-- Administration (role-gated) --}}
        @if(permissions.includes('user:read') || permissions.includes('role:read'))
          <div class="mt-6">
            <p
              class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-on-surface"
              x-show="!sidebarCollapsed"
              x-cloak
            >Administration</p>
            <ul class="space-y-1">
              @!component('layouts/partials/sidebar_item', {
                href: '#',
                icon: 'tabler:users',
                label: 'Utilisateurs',
              })
              @!component('layouts/partials/sidebar_item', {
                href: '#',
                icon: 'tabler:shield',
                label: 'Rôles',
              })
              @!component('layouts/partials/sidebar_item', {
                href: '#',
                icon: 'tabler:settings',
                label: 'Paramètres',
              })
            </ul>
          </div>
        @end
      </nav>

      {{-- User section (pinned to bottom) --}}
      <div class="border-t border-neutral-200 px-3 py-3">
        <div class="flex items-center gap-3 overflow-hidden">
          @!avatar({ initials: auth.user.initials })
          <div x-show="!sidebarCollapsed" x-cloak class="min-w-0">
            <p class="truncate text-sm font-medium text-on-surface-strong">{{ auth.user.firstName }} {{ auth.user.lastName }}</p>
            <p class="truncate text-xs text-on-surface">{{ auth.user.email }}</p>
          </div>
        </div>
        <div x-show="!sidebarCollapsed" x-cloak class="mt-2">
          @form({ route: 'session.destroy', method: 'POST' })
            <button type="submit" class="flex w-full cursor-pointer items-center gap-2 rounded-radius px-3 py-2 text-sm text-on-surface transition-colors hover:bg-surface-alt hover:text-on-surface-strong">
              @svg('tabler:logout', { class: 'size-4' })
              Déconnexion
            </button>
          @end
        </div>
      </div>
    </aside>

    {{-- Main content area --}}
    <div class="flex flex-1 flex-col" :class="sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-0'">

      {{-- Mobile header --}}
      <header class="flex h-14 items-center border-b border-neutral-200 bg-surface px-4 lg:hidden">
        <button
          x-on:click="mobileSidebarOpen = true"
          class="cursor-pointer text-on-surface hover:text-on-surface-strong"
        >
          @svg('tabler:menu-2', { class: 'size-5' })
        </button>
        <span class="ml-3 text-lg font-bold text-on-surface-strong">Voyager</span>
      </header>

      {{-- Page content --}}
      <main class="flex-1 bg-surface-alt p-6">
        @include('partials/flash_alerts')
        {{{ await $slots.main() }}}
      </main>
    </div>
  </div>
@end
```

- [ ] **Step 2: Create the sidebar_item partial**

Create `resources/views/layouts/partials/sidebar_item.edge`:

```edge
@let(isActive = request.url() === $props.get('href'))
@let(activeClasses = isActive
  ? 'bg-surface-alt text-on-surface-strong font-medium'
  : 'text-on-surface hover:bg-surface-alt hover:text-on-surface-strong'
)

<li>
  <a
    href="{{ $props.get('href') }}"
    class="flex items-center gap-3 rounded-radius px-3 py-2 text-sm transition-colors {{ activeClasses }}"
  >
    @svg($props.get('icon'), { class: 'size-5 shrink-0' })
    <span x-show="!sidebarCollapsed" x-cloak>{{ $props.get('label') }}</span>
  </a>
</li>
```

- [ ] **Step 3: Commit**

```bash
git add resources/views/layouts/dashboard.edge resources/views/layouts/partials/sidebar_item.edge
git commit -m "feat: create dashboard layout with collapsible sidebar"
```

---

### Task 9: Create Dashboard Page and Wire Route

**Files:**
- Create: `resources/views/pages/dashboard/index.edge`

- [ ] **Step 1: Create the dashboard index page**

Create `resources/views/pages/dashboard/index.edge`:

```edge
@layout('layouts/dashboard')
  <div>
    <h1 class="text-2xl font-semibold text-on-surface-strong">Dashboard</h1>
    <p class="mt-1 text-sm text-on-surface">Bienvenue sur votre tableau de bord</p>
  </div>
@end
```

- [ ] **Step 2: Verify the dashboard renders**

Start the server, log in with a valid account, then navigate to `/dashboard`.
Expected: Sidebar with navigation items, collapsible on desktop, empty content area with "Dashboard" heading.

- [ ] **Step 3: Verify sidebar collapse**

Click the chevron button at the top of the sidebar.
Expected: Sidebar collapses to icon-only (w-16), labels disappear, chevron icon flips direction.

- [ ] **Step 4: Verify mobile drawer**

Resize browser to < 1024px width.
Expected: Sidebar hidden, hamburger menu visible in top bar. Clicking hamburger opens sidebar as overlay. Clicking backdrop or X closes it.

- [ ] **Step 5: Verify role-gated admin section**

Log in as admin → Administration section visible.
Log in as lecteur → Administration section hidden (if user lacks `user:read` and `role:read`).

- [ ] **Step 6: Commit**

```bash
git add resources/views/pages/dashboard/
git commit -m "feat: add dashboard index page"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Run the full app and verify all pages**

Start the server:
```bash
node ace serve --hmr
```

Navigate to each page and verify:
- `GET /` — Home page renders with Tailwind styling
- `GET /signup` — Signup form renders correctly, validation errors display with Tailwind styles
- `GET /login` — Login form renders correctly
- `POST /login` → `GET /dashboard` — After login, redirected to dashboard
- `GET /dashboard` — Sidebar + content layout renders
- Sidebar collapse works
- Mobile drawer works
- Admin section is role-gated
- Flash alerts appear and auto-dismiss
- `POST /logout` — Logout works

- [ ] **Step 2: Run existing tests**

```bash
node ace test
```

Expected: All existing tests pass. If browser tests reference CSS classes, update them.

- [ ] **Step 3: Fix any issues found**

Address any visual or functional issues discovered during verification.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address post-migration issues"
```
