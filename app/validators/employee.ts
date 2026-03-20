import vine from '@vinejs/vine'

const firstName = () => vine.string().trim().minLength(2).maxLength(80)
const lastName = () => vine.string().trim().minLength(2).maxLength(80)
const email = () => vine.string().trim().email()
const phone = () => vine.string().trim().maxLength(20).optional()
const franchiseId = () => vine.string().uuid()
const roleId = () => vine.string().uuid()

export const createEmployeeValidator = vine.compile(
  vine.object({
    firstName: firstName(),
    lastName: lastName(),
    email: email(),
    password: vine.string().minLength(8),
    phone: phone(),
    franchiseId: franchiseId(),
    roleId: roleId(),
  })
)

export const updateEmployeeValidator = vine.compile(
  vine.object({
    firstName: firstName(),
    lastName: lastName(),
    email: email(),
    phone: phone(),
    franchiseId: franchiseId(),
    roleId: roleId(),
    status: vine.enum(['active', 'inactive', 'suspended'] as const),
    password: vine.string().minLength(8).optional(),
  })
)
