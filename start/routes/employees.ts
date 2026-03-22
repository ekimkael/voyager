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

router
  .get('employees/:id/roles', [EmployeesController, 'roles'])
  .as('employees.roles')
  .use(middleware.auth())
  .use(middleware.permission({ keys: ['role:assign'] }))

router
  .post('employees/:id/roles', [EmployeesController, 'assignRole'])
  .as('employees.assignRole')
  .use(middleware.auth())
  .use(middleware.permission({ keys: ['role:assign'] }))

router
  .delete('employees/:id/roles/:assignmentId', [EmployeesController, 'revokeRole'])
  .as('employees.revokeRole')
  .use(middleware.auth())
  .use(middleware.permission({ keys: ['role:assign'] }))
