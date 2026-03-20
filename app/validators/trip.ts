import vine from '@vinejs/vine'

const routeId = () => vine.string().uuid()
const busId = () => vine.string().uuid()
const driverId = () => vine.string().uuid()
const departureTime = () => vine.string().trim()
const arrivalTime = () => vine.string().trim()
const travelClass = () => vine.enum(['standard', 'vip'] as const)
const price = () => vine.number().min(0).decimal([0, 2])

export const createTripValidator = vine.compile(
  vine.object({
    routeId: routeId(),
    busId: busId(),
    driverId: driverId(),
    departureTime: departureTime(),
    arrivalTime: arrivalTime(),
    travelClass: travelClass(),
    price: price(),
  })
)

export const updateTripValidator = vine.compile(
  vine.object({
    routeId: routeId(),
    busId: busId(),
    driverId: driverId(),
    departureTime: departureTime(),
    arrivalTime: arrivalTime(),
    travelClass: travelClass(),
    price: price(),
  })
)
