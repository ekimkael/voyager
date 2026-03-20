import vine from '@vinejs/vine'

const licensePlate = () => vine.string().trim().minLength(1).maxLength(20)
const brand = () => vine.string().trim().minLength(1).maxLength(80)
const busModel = () => vine.string().trim().minLength(1).maxLength(80)
const capacity = () => vine.number().min(1).withoutDecimals()
const year = () => vine.number().min(1990).max(2035).withoutDecimals()
const status = () => vine.enum(['available', 'on_trip', 'maintenance', 'out_of_service'] as const)
const nextMaintenanceDate = () => vine.string().optional()

export const createBusValidator = vine.compile(
  vine.object({
    licensePlate: licensePlate(),
    brand: brand(),
    model: busModel(),
    capacity: capacity(),
    year: year(),
    status: status(),
    nextMaintenanceDate: nextMaintenanceDate(),
  })
)

export const updateBusValidator = vine.compile(
  vine.object({
    licensePlate: licensePlate(),
    brand: brand(),
    model: busModel(),
    capacity: capacity(),
    year: year(),
    status: status(),
    nextMaintenanceDate: nextMaintenanceDate(),
  })
)
