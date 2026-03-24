import factory from '@adonisjs/lucid/factories'
import Payment from '#models/payment'

// NOTE: Always .merge({ amount }) to match the booking's totalAmount.
// DB CHECK constraint requires amount > 0.
export const PaymentFactory = factory
  .define(Payment, async ({ faker }) => {
    const method = faker.helpers.arrayElement(['cash', 'mobile_money', 'card'] as const)
    return {
      amount: 5000,
      paymentMethod: method,
      operator: method === 'mobile_money'
        ? faker.helpers.arrayElement(['Orange Money', 'MTN MoMo'])
        : null,
      status: 'pending' as const,
      paidAt: null,
      externalReference: null,
    }
  })
  .build()
