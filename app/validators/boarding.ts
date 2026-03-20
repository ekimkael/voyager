import vine from '@vinejs/vine'

export const validateBoardingValidator = vine.compile(
  vine.object({
    code: vine.string().trim().maxLength(36),
  })
)
