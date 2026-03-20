import type { HttpContext } from '@adonisjs/core/http'
import City from '#models/city'
import Route from '#models/route'
import { createCityValidator, updateCityValidator } from '#validators/city'

export default class CitiesController {
  async index({ view }: HttpContext) {
    const cities = await City.query().orderBy('country').orderBy('name')
    return view.render('pages/cities/index', { cities })
  }

  async create({ view }: HttpContext) {
    return view.render('pages/cities/form')
  }

  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(createCityValidator)

    try {
      await City.create(payload)
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Cette ville existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Ville créée avec succès')
    return response.redirect().toRoute('cities.index')
  }

  async edit({ params, view }: HttpContext) {
    const city = await City.findOrFail(params.id)
    return view.render('pages/cities/form', { city })
  }

  async update({ params, request, response, session }: HttpContext) {
    const city = await City.findOrFail(params.id)
    const payload = await request.validateUsing(updateCityValidator)

    try {
      city.merge(payload)
      await city.save()
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Cette ville existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Ville mise à jour avec succès')
    return response.redirect().toRoute('cities.index')
  }

  async destroy({ params, response, session }: HttpContext) {
    const city = await City.findOrFail(params.id)

    const routeCount = await Route.query()
      .where('departureCityId', city.id)
      .orWhere('arrivalCityId', city.id)
      .count('* as total')

    if (Number(routeCount[0].$extras.total) > 0) {
      session.flash('error', 'Impossible de supprimer cette ville car elle est utilisée par une ou plusieurs routes.')
      return response.redirect().toRoute('cities.index')
    }

    await city.delete()
    session.flash('success', 'Ville supprimée avec succès')
    return response.redirect().toRoute('cities.index')
  }
}
