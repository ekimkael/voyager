import router from '@adonisjs/core/services/router'

const SearchController = () => import('#controllers/search_controller')

router.get('/trips', [SearchController, 'index']).as('public.globalTrips.index')

router
  .group(() => {
    router.get('/', [SearchController, 'companyShow']).as('public.companies.show')
    router.get('/trips', [SearchController, 'index']).as('public.trips.index')
  })
  .prefix(':companySlug')
