import vine from '@vinejs/vine'

const name = () => vine.string().trim().minLength(2).maxLength(255)
const country = () => vine.string().trim().minLength(2).maxLength(255)

export const createCityValidator = vine.compile(
  vine.object({
    name: name(),
    country: country(),
  })
)

export const updateCityValidator = vine.compile(
  vine.object({
    name: name(),
    country: country(),
  })
)
