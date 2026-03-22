import vine from '@vinejs/vine'

export const createRoleValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(80),
    parentRoleId: vine.string().uuid().optional(),
  })
)

export const updateRoleValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(80),
    parentRoleId: vine.string().uuid().optional().nullable(),
  })
)

export const syncPermissionsValidator = vine.compile(
  vine.object({
    permissions: vine.array(vine.string().uuid()),
  })
)

export const assignRoleValidator = vine.compile(
  vine.object({
    roleId: vine.string().uuid(),
    expiresAt: vine.date({ formats: ['YYYY-MM-DD'] }).afterOrEqual('today').optional(),
  })
)
