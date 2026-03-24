import vine from '@vinejs/vine'

const passengerSchema = vine.object({
  firstName: vine.string().trim().minLength(2).maxLength(80),
  lastName: vine.string().trim().minLength(2).maxLength(80),
  phone: vine.string().trim().maxLength(20).optional(),
})

export const storePassengersValidator = vine.compile(
  vine.object({
    passengers: vine.array(passengerSchema).minLength(1),
  })
)

export const storeCustomerValidator = vine.compile(
  vine.object({
    firstName: vine.string().trim().minLength(2).maxLength(80),
    lastName: vine.string().trim().minLength(2).maxLength(80),
    phone: vine.string().trim().maxLength(20),
    email: vine.string().trim().email().maxLength(150).optional(),
  })
)

export const processPaymentValidator = vine.compile(
  vine.object({
    paymentMethod: vine.enum(['cash', 'mobile_money', 'card'] as const),
    operator: vine.string().trim().maxLength(50).optional(),
  })
)

export const agentBookingValidator = vine.compile(
  vine.object({
    tripId: vine.string().uuid(),
    customer: vine.object({
      firstName: vine.string().trim().minLength(2).maxLength(80),
      lastName: vine.string().trim().minLength(2).maxLength(80),
      phone: vine.string().trim().maxLength(20),
      email: vine.string().trim().email().maxLength(150).optional(),
    }),
    passengers: vine.array(passengerSchema).minLength(1),
  })
)

export const updateBookingValidator = vine.compile(
  vine.object({
    passengers: vine
      .array(
        vine.object({
          id: vine.string().uuid(),
          firstName: vine.string().trim().minLength(2).maxLength(80),
          lastName: vine.string().trim().minLength(2).maxLength(80),
          phone: vine.string().trim().maxLength(20).optional(),
        })
      )
      .minLength(1),
  })
)

export const verifyBookingValidator = vine.compile(
  vine.object({
    phone: vine.string().trim().maxLength(20),
    code: vine.string().trim().maxLength(6),
  })
)
