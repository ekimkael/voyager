/**
 * RBAC configuration.
 * Defines the global permissions catalog and system roles
 * that are auto-created for each new tenant.
 */

export const permissions = [
  // Vehicles
  { resource: 'vehicle', action: 'create', description: 'Create a vehicle' },
  { resource: 'vehicle', action: 'read', description: 'View vehicles' },
  { resource: 'vehicle', action: 'update', description: 'Update a vehicle' },
  { resource: 'vehicle', action: 'delete', description: 'Delete a vehicle', isSensitive: true },
  { resource: 'vehicle', action: 'assign', description: 'Assign a vehicle to a route' },

  // Routes
  { resource: 'route', action: 'create', description: 'Create a route' },
  { resource: 'route', action: 'read', description: 'View routes' },
  { resource: 'route', action: 'update', description: 'Update a route' },
  { resource: 'route', action: 'delete', description: 'Delete a route', isSensitive: true },

  // Stops
  { resource: 'stop', action: 'create', description: 'Create a stop' },
  { resource: 'stop', action: 'read', description: 'View stops' },
  { resource: 'stop', action: 'update', description: 'Update a stop' },
  { resource: 'stop', action: 'delete', description: 'Delete a stop', isSensitive: true },

  // Drivers
  { resource: 'driver', action: 'create', description: 'Register a driver' },
  { resource: 'driver', action: 'read', description: 'View drivers' },
  { resource: 'driver', action: 'update', description: 'Update driver info' },
  { resource: 'driver', action: 'delete', description: 'Remove a driver', isSensitive: true },
  { resource: 'driver', action: 'assign', description: 'Assign driver to a route' },

  // Users & Roles (tenant admin)
  { resource: 'user', action: 'create', description: 'Invite a user' },
  { resource: 'user', action: 'read', description: 'View users' },
  { resource: 'user', action: 'update', description: 'Update user info' },
  { resource: 'user', action: 'delete', description: 'Remove a user', isSensitive: true },
  { resource: 'role', action: 'create', description: 'Create a custom role' },
  { resource: 'role', action: 'read', description: 'View roles' },
  { resource: 'role', action: 'update', description: 'Update a role' },
  { resource: 'role', action: 'delete', description: 'Delete a role', isSensitive: true },
  { resource: 'role', action: 'assign', description: 'Assign a role to a user' },
] as const

/**
 * System roles created for each new tenant.
 * `permissions` is a list of `resource:action` keys from the catalog above.
 * `'*'` means all permissions.
 */
export const systemRoles = [
  {
    name: 'Admin',
    permissions: '*' as const,
  },
  {
    name: 'Dispatcher',
    permissions: [
      'route:create', 'route:read', 'route:update', 'route:delete',
      'stop:create', 'stop:read', 'stop:update', 'stop:delete',
      'driver:read', 'driver:assign',
      'vehicle:read', 'vehicle:assign',
    ],
  },
  {
    name: 'Chauffeur',
    permissions: [
      'route:read',
      'stop:read',
      'driver:read', 'driver:update',
      'vehicle:read',
    ],
  },
  {
    name: 'Lecteur',
    permissions: [
      'vehicle:read',
      'route:read',
      'stop:read',
      'driver:read',
      'user:read',
      'role:read',
    ],
  },
]
