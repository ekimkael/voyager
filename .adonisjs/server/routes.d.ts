import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'password.forgot': { paramsTuple?: []; params?: {} }
    'password.sendResetLink': { paramsTuple?: []; params?: {} }
    'password.reset': { paramsTuple?: []; params?: {} }
    'password.update': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'dashboard.index': { paramsTuple?: []; params?: {} }
    'cities.index': { paramsTuple?: []; params?: {} }
    'cities.create': { paramsTuple?: []; params?: {} }
    'cities.store': { paramsTuple?: []; params?: {} }
    'cities.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'cities.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'cities.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'routes.index': { paramsTuple?: []; params?: {} }
    'routes.create': { paramsTuple?: []; params?: {} }
    'routes.store': { paramsTuple?: []; params?: {} }
    'routes.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'routes.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'routes.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'buses.index': { paramsTuple?: []; params?: {} }
    'buses.create': { paramsTuple?: []; params?: {} }
    'buses.store': { paramsTuple?: []; params?: {} }
    'buses.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'buses.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'buses.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'drivers.index': { paramsTuple?: []; params?: {} }
    'franchises.performance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'franchises.index': { paramsTuple?: []; params?: {} }
    'franchises.create': { paramsTuple?: []; params?: {} }
    'franchises.store': { paramsTuple?: []; params?: {} }
    'franchises.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'franchises.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'franchises.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'employees.index': { paramsTuple?: []; params?: {} }
    'employees.create': { paramsTuple?: []; params?: {} }
    'employees.store': { paramsTuple?: []; params?: {} }
    'employees.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'employees.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'employees.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'employees.roles': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'employees.assignRole': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'employees.revokeRole': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'assignmentId': ParamValue} }
    'trips.index': { paramsTuple?: []; params?: {} }
    'trips.create': { paramsTuple?: []; params?: {} }
    'trips.store': { paramsTuple?: []; params?: {} }
    'trips.history': { paramsTuple?: []; params?: {} }
    'trips.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'trips.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'trips.transition': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'trips.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.initiate': { paramsTuple?: []; params?: {} }
    'public.bookings.passengers': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.storePassengers': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.customer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.storeCustomer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.summary': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.confirm': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.payment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.processPayment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.completed': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.failed': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.verify': { paramsTuple?: []; params?: {} }
    'public.bookings.verifySubmit': { paramsTuple?: []; params?: {} }
    'public.tickets.download': { paramsTuple: [ParamValue,ParamValue]; params: {'bookingId': ParamValue,'passengerId': ParamValue} }
    'dashboard.bookings.index': { paramsTuple?: []; params?: {} }
    'dashboard.bookings.create': { paramsTuple?: []; params?: {} }
    'dashboard.bookings.store': { paramsTuple?: []; params?: {} }
    'dashboard.bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dashboard.bookings.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dashboard.bookings.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dashboard.bookings.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dashboard.tickets.download': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'passengerId': ParamValue} }
    'dashboard.boarding.index': { paramsTuple?: []; params?: {} }
    'dashboard.boarding.validate': { paramsTuple?: []; params?: {} }
    'public.globalTrips.index': { paramsTuple?: []; params?: {} }
    'public.tenants.show': { paramsTuple: [ParamValue]; params: {'tenantSlug': ParamValue} }
    'public.trips.index': { paramsTuple: [ParamValue]; params: {'tenantSlug': ParamValue} }
    'roles.index': { paramsTuple?: []; params?: {} }
    'roles.create': { paramsTuple?: []; params?: {} }
    'roles.store': { paramsTuple?: []; params?: {} }
    'roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'roles.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'roles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'roles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'roles.syncPermissions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'profile.email.store': { paramsTuple?: []; params?: {} }
    'security.show': { paramsTuple?: []; params?: {} }
    'security.update': { paramsTuple?: []; params?: {} }
    'email.confirm': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'password.forgot': { paramsTuple?: []; params?: {} }
    'password.reset': { paramsTuple?: []; params?: {} }
    'dashboard.index': { paramsTuple?: []; params?: {} }
    'cities.index': { paramsTuple?: []; params?: {} }
    'cities.create': { paramsTuple?: []; params?: {} }
    'cities.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'routes.index': { paramsTuple?: []; params?: {} }
    'routes.create': { paramsTuple?: []; params?: {} }
    'routes.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'buses.index': { paramsTuple?: []; params?: {} }
    'buses.create': { paramsTuple?: []; params?: {} }
    'buses.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'drivers.index': { paramsTuple?: []; params?: {} }
    'franchises.performance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'franchises.index': { paramsTuple?: []; params?: {} }
    'franchises.create': { paramsTuple?: []; params?: {} }
    'franchises.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'employees.index': { paramsTuple?: []; params?: {} }
    'employees.create': { paramsTuple?: []; params?: {} }
    'employees.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'employees.roles': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'trips.index': { paramsTuple?: []; params?: {} }
    'trips.create': { paramsTuple?: []; params?: {} }
    'trips.history': { paramsTuple?: []; params?: {} }
    'trips.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.passengers': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.customer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.summary': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.payment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.completed': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.failed': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.verify': { paramsTuple?: []; params?: {} }
    'public.tickets.download': { paramsTuple: [ParamValue,ParamValue]; params: {'bookingId': ParamValue,'passengerId': ParamValue} }
    'dashboard.bookings.index': { paramsTuple?: []; params?: {} }
    'dashboard.bookings.create': { paramsTuple?: []; params?: {} }
    'dashboard.bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dashboard.bookings.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dashboard.tickets.download': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'passengerId': ParamValue} }
    'dashboard.boarding.index': { paramsTuple?: []; params?: {} }
    'public.globalTrips.index': { paramsTuple?: []; params?: {} }
    'public.tenants.show': { paramsTuple: [ParamValue]; params: {'tenantSlug': ParamValue} }
    'public.trips.index': { paramsTuple: [ParamValue]; params: {'tenantSlug': ParamValue} }
    'roles.index': { paramsTuple?: []; params?: {} }
    'roles.create': { paramsTuple?: []; params?: {} }
    'roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'roles.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'security.show': { paramsTuple?: []; params?: {} }
    'email.confirm': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'password.forgot': { paramsTuple?: []; params?: {} }
    'password.reset': { paramsTuple?: []; params?: {} }
    'dashboard.index': { paramsTuple?: []; params?: {} }
    'cities.index': { paramsTuple?: []; params?: {} }
    'cities.create': { paramsTuple?: []; params?: {} }
    'cities.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'routes.index': { paramsTuple?: []; params?: {} }
    'routes.create': { paramsTuple?: []; params?: {} }
    'routes.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'buses.index': { paramsTuple?: []; params?: {} }
    'buses.create': { paramsTuple?: []; params?: {} }
    'buses.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'drivers.index': { paramsTuple?: []; params?: {} }
    'franchises.performance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'franchises.index': { paramsTuple?: []; params?: {} }
    'franchises.create': { paramsTuple?: []; params?: {} }
    'franchises.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'employees.index': { paramsTuple?: []; params?: {} }
    'employees.create': { paramsTuple?: []; params?: {} }
    'employees.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'employees.roles': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'trips.index': { paramsTuple?: []; params?: {} }
    'trips.create': { paramsTuple?: []; params?: {} }
    'trips.history': { paramsTuple?: []; params?: {} }
    'trips.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.passengers': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.customer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.summary': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.payment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.completed': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.failed': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.verify': { paramsTuple?: []; params?: {} }
    'public.tickets.download': { paramsTuple: [ParamValue,ParamValue]; params: {'bookingId': ParamValue,'passengerId': ParamValue} }
    'dashboard.bookings.index': { paramsTuple?: []; params?: {} }
    'dashboard.bookings.create': { paramsTuple?: []; params?: {} }
    'dashboard.bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dashboard.bookings.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dashboard.tickets.download': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'passengerId': ParamValue} }
    'dashboard.boarding.index': { paramsTuple?: []; params?: {} }
    'public.globalTrips.index': { paramsTuple?: []; params?: {} }
    'public.tenants.show': { paramsTuple: [ParamValue]; params: {'tenantSlug': ParamValue} }
    'public.trips.index': { paramsTuple: [ParamValue]; params: {'tenantSlug': ParamValue} }
    'roles.index': { paramsTuple?: []; params?: {} }
    'roles.create': { paramsTuple?: []; params?: {} }
    'roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'roles.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'security.show': { paramsTuple?: []; params?: {} }
    'email.confirm': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'password.sendResetLink': { paramsTuple?: []; params?: {} }
    'password.update': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'cities.store': { paramsTuple?: []; params?: {} }
    'routes.store': { paramsTuple?: []; params?: {} }
    'buses.store': { paramsTuple?: []; params?: {} }
    'franchises.store': { paramsTuple?: []; params?: {} }
    'employees.store': { paramsTuple?: []; params?: {} }
    'employees.assignRole': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'trips.store': { paramsTuple?: []; params?: {} }
    'public.bookings.initiate': { paramsTuple?: []; params?: {} }
    'public.bookings.storePassengers': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.storeCustomer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.confirm': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.processPayment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.bookings.verifySubmit': { paramsTuple?: []; params?: {} }
    'dashboard.bookings.store': { paramsTuple?: []; params?: {} }
    'dashboard.boarding.validate': { paramsTuple?: []; params?: {} }
    'roles.store': { paramsTuple?: []; params?: {} }
    'roles.syncPermissions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.email.store': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'cities.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'routes.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'buses.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'franchises.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'employees.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'trips.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'trips.transition': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dashboard.bookings.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'roles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'security.update': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'cities.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'routes.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'buses.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'franchises.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'employees.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'employees.revokeRole': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'assignmentId': ParamValue} }
    'trips.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dashboard.bookings.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'roles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'franchises.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'employees.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'roles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}