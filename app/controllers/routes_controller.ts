import type { HttpContext } from '@adonisjs/core/http'
import Route from '#models/route'
import City from '#models/city'
import { createRouteValidator, updateRouteValidator } from '#validators/route'

export default class RoutesController {
  async index({ view, tenant }: HttpContext) {
    const routes = await Route.query()
      .where('tenantId', tenant!.id)
      .preload('departureCity')
      .preload('arrivalCity')
      .orderBy('code')

    return view.render('pages/dashboard/routes/index', { routes })
  }

  async create({ view }: HttpContext) {
    const cities = await City.query().orderBy('country').orderBy('name')
    return view.render('pages/dashboard/routes/form', { cities })
  }

  async store({ request, response, session, tenant }: HttpContext) {
    const payload = await request.validateUsing(createRouteValidator)
    const [hours, minutes] = payload.estimatedDuration.split(':').map(Number)

    try {
      await Route.create({
        tenantId: tenant!.id,
        code: payload.code,
        departureCityId: payload.departureCityId,
        arrivalCityId: payload.arrivalCityId,
        distanceKm: payload.distanceKm,
        estimatedDurationMinutes: hours * 60 + minutes,
        status: payload.status,
      })
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Une route avec ce code existe déjà.')
        return response.redirect().back()
      }
      if (error.code === '23514') {
        session.flash('error', "La ville de départ et la ville d'arrivée doivent être différentes.")
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Route créée avec succès')
    return response.redirect().toRoute('routes.index')
  }

  async edit({ params, view, tenant }: HttpContext) {
    const transportRoute = await Route.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const cities = await City.query().orderBy('country').orderBy('name')
    return view.render('pages/dashboard/routes/form', { transportRoute, cities })
  }

  async update({ params, request, response, session, tenant }: HttpContext) {
    const transportRoute = await Route.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const payload = await request.validateUsing(updateRouteValidator)
    const [hours, minutes] = payload.estimatedDuration.split(':').map(Number)

    try {
      transportRoute.merge({
        code: payload.code,
        departureCityId: payload.departureCityId,
        arrivalCityId: payload.arrivalCityId,
        distanceKm: payload.distanceKm,
        estimatedDurationMinutes: hours * 60 + minutes,
        status: payload.status,
      })
      await transportRoute.save()
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Une route avec ce code existe déjà.')
        return response.redirect().back()
      }
      if (error.code === '23514') {
        session.flash('error', "La ville de départ et la ville d'arrivée doivent être différentes.")
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Route mise à jour avec succès')
    return response.redirect().toRoute('routes.index')
  }

  async destroy({ params, response, session, tenant }: HttpContext) {
    const transportRoute = await Route.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    await transportRoute.delete()
    session.flash('success', 'Route supprimée avec succès')
    return response.redirect().toRoute('routes.index')
  }
}
