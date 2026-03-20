/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import transmit from '@adonisjs/transmit/services/main'

transmit.registerRoutes()

router.on('/').render('pages/home').as('home')

import '#start/routes/auth'
import '#start/routes/dashboard'
import '#start/routes/cities'
import '#start/routes/transport_routes'
import '#start/routes/buses'
import '#start/routes/drivers'
import '#start/routes/franchises'
import '#start/routes/employees'
import '#start/routes/trips'
import '#start/routes/search'
import '#start/routes/bookings'
import '#start/routes/dashboard/bookings'
import '#start/routes/dashboard/boarding'
