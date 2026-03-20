import Alpine from 'alpinejs'
import { Transmit } from '@adonisjs/transmit-client'

const transmit = new Transmit({
  baseUrl: window.location.origin,
})

window.__transmit = transmit

Alpine.data('alert', function () {
  return {
    isVisible: false,
    dismiss() {
      this.isVisible = false
    },
    init() {
      setTimeout(() => {
        this.isVisible = true
      }, 80)
      setTimeout(() => {
        this.dismiss()
      }, 5000)
    },
  }
})

Alpine.start()
