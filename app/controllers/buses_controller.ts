import type { HttpContext } from '@adonisjs/core/http'
import Bus from '#models/bus'
import Trip from '#models/trip'
import { createBusValidator, updateBusValidator } from '#validators/bus'

export default class BusesController {
  async index({ view, tenant }: HttpContext) {
    const buses = await Bus.query()
      .where('tenantId', tenant!.id)
      .where('active', true)
      .orderBy('licensePlate')

    return view.render('pages/buses/index', { buses })
  }

  async create({ view }: HttpContext) {
    return view.render('pages/buses/form')
  }

  async store({ request, response, session, tenant }: HttpContext) {
    const payload = await request.validateUsing(createBusValidator)

    try {
      await Bus.create({
        tenantId: tenant!.id,
        licensePlate: payload.licensePlate,
        brand: payload.brand,
        model: payload.model,
        capacity: payload.capacity,
        year: payload.year,
        status: payload.status,
        nextMaintenanceDate: payload.nextMaintenanceDate || null,
      })
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Un véhicule avec cette immatriculation existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Véhicule créé avec succès')
    return response.redirect().toRoute('buses.index')
  }

  async edit({ params, view, tenant }: HttpContext) {
    const bus = await Bus.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    return view.render('pages/buses/form', { bus })
  }

  async update({ params, request, response, session, tenant }: HttpContext) {
    const bus = await Bus.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const payload = await request.validateUsing(updateBusValidator)

    try {
      bus.merge({
        licensePlate: payload.licensePlate,
        brand: payload.brand,
        model: payload.model,
        capacity: payload.capacity,
        year: payload.year,
        status: payload.status,
        nextMaintenanceDate: payload.nextMaintenanceDate || null,
      })
      await bus.save()
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Un véhicule avec cette immatriculation existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Véhicule mis à jour avec succès')
    return response.redirect().toRoute('buses.index')
  }

  async destroy({ params, response, session, tenant }: HttpContext) {
    const bus = await Bus.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const activeTrips = await Trip.query()
      .where('busId', bus.id)
      .whereIn('status', ['scheduled', 'in_progress'])
      .count('* as total')

    if (Number(activeTrips[0].$extras.total) > 0) {
      session.flash('error', 'Impossible de désactiver un véhicule ayant des voyages actifs.')
      return response.redirect().toRoute('buses.index')
    }

    bus.active = false
    await bus.save()

    session.flash('success', 'Véhicule désactivé avec succès')
    return response.redirect().toRoute('buses.index')
  }
}
