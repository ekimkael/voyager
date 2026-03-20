/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

router.on('/').render('pages/home').as('home')

import '#start/routes/auth'
import '#start/routes/dashboard'
import '#start/routes/cities'
import '#start/routes/transport_routes'
import '#start/routes/buses'
import '#start/routes/drivers'
import '#start/routes/trips'
