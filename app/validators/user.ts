import vine from '@vinejs/vine'

const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

export const signupValidator = vine.compile(
  vine.object({
    companyName: vine.string().trim().minLength(2).maxLength(255),
    firstName: vine.string().trim().minLength(1).maxLength(255),
    lastName: vine.string().trim().minLength(1).maxLength(255),
    email: email(),
    password: password().confirmed({
      confirmationField: 'passwordConfirmation',
    }),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email: email(),
    password: vine.string(),
  })
)
