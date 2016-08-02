const debug = require('debug')('pss:pagerduty:debug')

const Scheduler = require('./scheduler')
const http = require('http-as-promised')

class Pagerduty {
  static getStatus (serviceName) {
    return http({
      url: `https://${process.env.COMPANY_NAME}.pagerduty.com/api/v1/services/`,
      method: 'GET',
      headers: {
        'Content-type': 'application/json',
        'Authorization': `Token token=${process.env.PAGERDUTY_API_KEY}`
      },
      resolve: 'body',
      json: true
    })
      .then((body) =>
        body.services.find((serviceData) =>
          serviceData.name.toLowerCase() === serviceName
        )
      )
  }

  static setStatus (service, status) {
    debug(`Changing service status.
Service name: ${service.name}, expected status: ${status},
actual service status: ${service.status}`)

    const url = `https://${process.env.COMPANY_NAME}.pagerduty.com/api/v1/services/${service.id}/${status === Scheduler.ENABLED ? 'enable' : 'disable'}`
    return http({
      method: 'PUT',
      url,
      headers: {
        'Content-type': 'application/json',
        'Authorization': `Token token=${process.env.PAGERDUTY_API_KEY}`
      },
      form: {
        requester_id: process.env.REQUESTER_ID
      }
    })
  }
}

module.exports = Pagerduty
