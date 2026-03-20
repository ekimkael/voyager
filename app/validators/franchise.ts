import vine from '@vinejs/vine'

const name = () => vine.string().trim().minLength(2).maxLength(100)
const cityId = () => vine.string().uuid()
const address = () => vine.string().trim().minLength(5)
const phone = () => vine.string().trim().maxLength(20).optional()

export const createFranchiseValidator = vine.compile(
  vine.object({
    name: name(),
    cityId: cityId(),
    address: address(),
    phone: phone(),
  })
)

export const updateFranchiseValidator = vine.compile(
  vine.object({
    name: name(),
    cityId: cityId(),
    address: address(),
    phone: phone(),
  })
)
