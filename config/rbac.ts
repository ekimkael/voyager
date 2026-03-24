/**
 * RBAC configuration.
 * Defines the global permissions catalog and system roles
 * that are auto-created for each new company.
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

  // Cities
  { resource: 'city', action: 'create', description: 'Create a city' },
  { resource: 'city', action: 'read', description: 'View cities' },
  { resource: 'city', action: 'update', description: 'Update a city' },
  { resource: 'city', action: 'delete', description: 'Delete a city', isSensitive: true },

  // Franchises
  { resource: 'franchise', action: 'create', description: 'Create a franchise' },
  { resource: 'franchise', action: 'read', description: 'View franchises' },
  { resource: 'franchise', action: 'update', description: 'Update a franchise' },
  { resource: 'franchise', action: 'delete', description: 'Delete a franchise', isSensitive: true },

  // Stops
  { resource: 'stop', action: 'create', description: 'Create a stop' },
  { resource: 'stop', action: 'read', description: 'View stops' },
  { resource: 'stop', action: 'update', description: 'Update a stop' },
  { resource: 'stop', action: 'delete', description: 'Delete a stop', isSensitive: true },

  // Trips
  { resource: 'trip', action: 'create', description: 'Schedule a trip' },
  { resource: 'trip', action: 'read', description: 'View trips' },
  { resource: 'trip', action: 'update', description: 'Update a trip' },
  { resource: 'trip', action: 'delete', description: 'Delete a trip', isSensitive: true },

  // Booking permissions
  { resource: 'booking', action: 'create', description: 'Create bookings' },
  { resource: 'booking', action: 'read', description: 'View bookings' },
  { resource: 'booking', action: 'update', description: 'Modify booking passenger info' },
  { resource: 'booking', action: 'delete', description: 'Cancel bookings', isSensitive: true },

  // Boarding permissions
  { resource: 'boarding', action: 'validate', description: 'Validate passenger boarding' },

  // Users & Roles (company admin)
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
 * System roles created for each new company.
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
      'city:read',
      'franchise:read',
      'route:create',
      'route:read',
      'route:update',
      'route:delete',
      'stop:create',
      'stop:read',
      'stop:update',
      'stop:delete',
      'vehicle:read',
      'vehicle:assign',
      'trip:create',
      'trip:read',
      'trip:update',
      'trip:delete',
      'booking:create',
      'booking:read',
      'booking:update',
    ],
  },
  {
    name: 'Chauffeur',
    permissions: [
      'city:read',
      'franchise:read',
      'user:read',
      'route:read',
      'stop:read',
      'vehicle:read',
      'trip:read',
      'boarding:validate',
    ],
  },
  {
    name: 'Lecteur',
    permissions: [
      'city:read',
      'franchise:read',
      'vehicle:read',
      'route:read',
      'stop:read',
      'user:read',
      'role:read',
      'trip:read',
    ],
  },
]
