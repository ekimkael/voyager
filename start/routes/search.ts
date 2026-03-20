import router from '@adonisjs/core/services/router'

const SearchController = () => import('#controllers/search_controller')

router
  .group(() => {
    router.get('/trips', [SearchController, 'index']).as('public.trips.index')
    router.get('/trips/:id', [SearchController, 'show']).as('public.trips.show')
  })
  .prefix(':tenantSlug')
