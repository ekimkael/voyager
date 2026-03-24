import vine from '@vinejs/vine'

const firstName = () => vine.string().trim().minLength(2).maxLength(80)
const lastName = () => vine.string().trim().minLength(2).maxLength(80)
const phone = () => vine.string().trim().maxLength(20).optional()

export const updateProfileValidator = vine.compile(
  vine.object({
    firstName: firstName(),
    lastName: lastName(),
    phone: phone(),
  })
)

export const changeEmailValidator = vine.compile(
  vine.object({
    currentPassword: vine.string(),
    newEmail: vine.string().trim().email().maxLength(254),
  })
)

export const updatePasswordValidator = vine.compile(
  vine.object({
    currentPassword: vine.string(),
    newPassword: vine.string().minLength(8).maxLength(32).confirmed({
      confirmationField: 'newPasswordConfirmation',
    }),
  })
)
