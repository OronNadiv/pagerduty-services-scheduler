const info = require('debug')('pss:index:info')
const error = require('debug')('pss:index:error')

const Promise = require('bluebird')
const Pagerduty = require('./pagerduty')

const Scheduler = require('./scheduler')

const services = process.env.SERVICES.toLowerCase().split()

Scheduler.getExpectedStatus()
  .then((expectedStatus) =>
    Promise.map(services, (serviceName) =>
      Pagerduty.getStatus(serviceName)
        .then((service) => {
          if ((Scheduler.ENABLED === expectedStatus && service.status === 'active') || (Scheduler.DISABLED === expectedStatus && service.status === 'disabled')) {
            info(`No action required.  Service name: ${service.name}, expected service status: ${expectedStatus}, actual service status: ${service.status}`)
            return
          }
          return Pagerduty.setStatus(service, expectedStatus)
        })
    )
  )
  .catch((err) => {
    error(err)
    process.exit(1)
  })
  .finally(() => {
    info('done')
    process.exit(0)
  })
