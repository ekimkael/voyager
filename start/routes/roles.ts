import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const RolesController = () => import('#controllers/roles_controller')

router
  .group(() => {
    router
      .resource('roles', RolesController)
      .use(['index', 'show'], middleware.permission({ keys: ['role:read'] }))
      .use(['create', 'store'], middleware.permission({ keys: ['role:create'] }))
      .use(['edit', 'update'], middleware.permission({ keys: ['role:update'] }))
      .use(['destroy'], middleware.permission({ keys: ['role:delete'] }))

    router
      .post('/roles/:id/sync-permissions', [RolesController, 'syncPermissions'])
      .as('roles.syncPermissions')
      .use(middleware.permission({ keys: ['role:update'] }))
  })
  .prefix('dashboard')
  .use(middleware.auth())
