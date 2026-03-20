import vine from '@vinejs/vine'

const code = () => vine.string().trim().minLength(1).maxLength(50)
const cityId = () => vine.string().uuid()
const distanceKm = () => vine.number().positive().decimal([0, 2])
const estimatedDuration = () => vine.string().regex(/^\d{2}:\d{2}$/)
const status = () => vine.enum(['active', 'inactive'] as const)

export const createRouteValidator = vine.compile(
  vine.object({
    code: code(),
    departureCityId: cityId(),
    arrivalCityId: cityId(),
    distanceKm: distanceKm(),
    estimatedDuration: estimatedDuration(),
    status: status(),
  })
)

export const updateRouteValidator = vine.compile(
  vine.object({
    code: code(),
    departureCityId: cityId(),
    arrivalCityId: cityId(),
    distanceKm: distanceKm(),
    estimatedDuration: estimatedDuration(),
    status: status(),
  })
)
