import type { HttpContext } from '@adonisjs/core/http'
import Franchise from '#models/franchise'
import City from '#models/city'
import User from '#models/user'
import { createFranchiseValidator, updateFranchiseValidator } from '#validators/franchise'

export default class FranchisesController {
  async index({ view, company, request }: HttpContext) {
    const page = request.input('page', 1)

    const franchises = await Franchise.query()
      .where('companyId', company!.id)
      .where('active', true)
      .preload('city')
      .orderBy('name')
      .paginate(page, 20)

    franchises.baseUrl('/franchises')

    return view.render('pages/dashboard/franchises/index', { franchises })
  }

  async create({ view }: HttpContext) {
    const cities = await City.query().orderBy('name')
    return view.render('pages/dashboard/franchises/edit', { cities })
  }

  async store({ request, response, session, company }: HttpContext) {
    const payload = await request.validateUsing(createFranchiseValidator)

    try {
      await Franchise.create({
        companyId: company!.id,
        name: payload.name,
        cityId: payload.cityId,
        address: payload.address,
        phone: payload.phone || null,
      })
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Une franchise avec ce nom existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Franchise créée avec succès')
    return response.redirect().toRoute('franchises.index')
  }

  async edit({ params, view, company }: HttpContext) {
    const franchise = await Franchise.query()
      .where('id', params.id)
      .where('companyId', company!.id)
      .firstOrFail()

    const cities = await City.query().orderBy('name')

    return view.render('pages/dashboard/franchises/edit', { franchise, cities })
  }

  async update({ params, request, response, session, company }: HttpContext) {
    const franchise = await Franchise.query()
      .where('id', params.id)
      .where('companyId', company!.id)
      .firstOrFail()

    const payload = await request.validateUsing(updateFranchiseValidator)

    try {
      franchise.merge({
        name: payload.name,
        cityId: payload.cityId,
        address: payload.address,
        phone: payload.phone || null,
      })
      await franchise.save()
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Une franchise avec ce nom existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Franchise mise à jour avec succès')
    return response.redirect().toRoute('franchises.index')
  }

  async destroy({ params, response, session, company }: HttpContext) {
    const franchise = await Franchise.query()
      .where('id', params.id)
      .where('companyId', company!.id)
      .firstOrFail()

    const activeUsers = await User.query()
      .where('franchiseId', franchise.id)
      .where('status', 'active')
      .count('* as total')

    if (Number(activeUsers[0].$extras.total) > 0) {
      session.flash(
        'error',
        'Impossible de désactiver cette franchise car elle a des employés actifs.'
      )
      return response.redirect().toRoute('franchises.index')
    }

    franchise.active = false
    await franchise.save()

    session.flash('success', 'Franchise désactivée avec succès')
    return response.redirect().toRoute('franchises.index')
  }

  async performance({ params, view, company }: HttpContext) {
    const franchise = await Franchise.query()
      .where('id', params.id)
      .where('companyId', company!.id)
      .preload('city')
      .firstOrFail()

    return view.render('pages/dashboard/franchises/performance', { franchise })
  }
}
