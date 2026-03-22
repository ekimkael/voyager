import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const RolesController = () => import('#controllers/roles_controller')

router
  .resource('roles', RolesController)
  .use('*', middleware.auth())
  .use(['index', 'show'], middleware.permission({ keys: ['role:read'] }))
  .use(['create', 'store'], middleware.permission({ keys: ['role:create'] }))
  .use(['edit', 'update'], middleware.permission({ keys: ['role:update'] }))
  .use(['destroy'], middleware.permission({ keys: ['role:delete'] }))

router
  .post('/roles/:id/sync-permissions', [RolesController, 'syncPermissions'])
  .as('roles.syncPermissions')
  .use(middleware.auth())
  .use(middleware.permission({ keys: ['role:update'] }))
