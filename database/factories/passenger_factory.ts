import factory from '@adonisjs/lucid/factories'
import { randomUUID } from 'node:crypto'
import Passenger from '#models/passenger'

const firstNames = [
  'Alain', 'Berthe', 'Charles', 'Denise', 'Étienne',
  'Félicité', 'Gaston', 'Hélène', 'Isidore', 'Joséphine',
  'Lambert', 'Monique', 'Norbert', 'Odette', 'Pascal',
]

const lastNames = [
  'Mbarga', 'Essomba', 'Atangana', 'Owona', 'Mvondo',
  'Messi', 'Belinga', 'Nkoulou', 'Abena', 'Ekotto',
  'Biya', 'Onana', 'Nkodo', 'Elong', 'Manga',
]

let passengerCounter = 0

export const PassengerFactory = factory
  .define(Passenger, async ({ faker }) => {
    passengerCounter = (passengerCounter + 1) % 1000
    return {
      firstName: faker.helpers.arrayElement(firstNames),
      lastName: faker.helpers.arrayElement(lastNames),
      phone: faker.helpers.maybe(
        () => `+237 6${faker.string.numeric(2)} ${faker.string.numeric(3)} ${faker.string.numeric(3)}`,
        { probability: 0.5 }
      ) ?? null,
      seatNumber: 1,
      code: `P${faker.string.alphanumeric({ length: 5, casing: 'upper' })}`,
      qrCode: randomUUID(),
      status: 'pending' as const,
      boardedAt: null,
    }
  })
  .build()
