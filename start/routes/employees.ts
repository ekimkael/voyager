import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const EmployeesController = () => import('#controllers/employees_controller')

router
  .resource('employees', EmployeesController)
  .except(['show'])
  .use('*', middleware.auth())
  .use(['index'], middleware.permission({ keys: ['user:read'] }))
  .use(['create', 'store'], middleware.permission({ keys: ['user:create'] }))
  .use(['edit', 'update'], middleware.permission({ keys: ['user:update'] }))
  .use(['destroy'], middleware.permission({ keys: ['user:delete'] }))
