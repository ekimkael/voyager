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
