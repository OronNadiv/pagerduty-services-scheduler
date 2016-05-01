'use strict'

let timeoutHandle
const _ = require('underscore')
const moment = require('moment')
const Promise = require('bluebird')
const request = require('request-promise')
const ENABLED = 'enabled'
const DISABLED = 'disabled'

require('moment-timezone')

const updatePagerDuty = (requiredStatus) => {
  const services = process.env.SERVICES.toLowerCase().split()
  return Promise.resolve()
    .then(function () {
      return request({
        method: 'GET',
        uri: `https://${process.env.COMPANY_NAME}.pagerduty.com/api/v1/services/`,
        headers: {
          'Content-type': 'application/json',
          'Authorization': `Token token=${process.env.PAGERDUTY_API_KEY}`
        }
      })
    })
    .then(function (response) {
      return _.chain(JSON.parse(response).services)
        .filter(function (serviceData) {
          return _.contains(services, serviceData.name.toLowerCase())
        })
        .value()
    })
    .map(function (service) {
      if ((ENABLED === requiredStatus && service.status === 'active') || (DISABLED === requiredStatus && service.status === 'disabled')) {
        console.log(`No action required.  Service name: ${service.name}, required service status: ${requiredStatus}, actual service status: ${service.status}`)
        return
      }

      console.log(`Changing service status.  Service name: ${service.name}, required service status: ${requiredStatus}, actual service status: ${service.status}`)

      const uri = `https://${process.env.COMPANY_NAME}.pagerduty.com/api/v1/services/${service.id}/${requiredStatus === ENABLED ? 'enable' : 'disable'}`
      return request({
        method: 'PUT',
        uri: uri,
        headers: {
          'Content-type': 'application/json',
          'Authorization': `Token token=${process.env.PAGERDUTY_API_KEY}`
        },
        json: {requester_id: process.env.REQUESTER_ID}
      })
    })
}

const getNextEnableDisable = () => {
  const now = moment().tz('America/Los_Angeles')
  let enableAt = moment.tz(now.format('YYYY-MM-DD ') + process.env.ENABLE_SERVICE_AT, 'America/Los_Angeles')
  let disableAt = moment.tz(now.format('YYYY-MM-DD ') + process.env.DISABLE_SERVICE_AT, 'America/Los_Angeles')

  while (enableAt < now || enableAt.day() === 0 || enableAt.day() === 6) {
    enableAt = enableAt.add(1, 'days')
  }

  while (disableAt < now || disableAt.day() === 0 || disableAt.day() === 6) {
    disableAt = disableAt.add(1, 'days')
  }

  return {
    enable: enableAt,
    disable: disableAt,
    next: enableAt < disableAt ? enableAt : disableAt
  }
}

const shouldEnableOrDisable = () => {
  const enableDisable = getNextEnableDisable()
  const {disable, enable} = enableDisable

  return enable < disable
    ? Promise.resolve(DISABLED)
    : Promise.resolve(ENABLED)
}

module.exports = () => {
  shouldEnableOrDisable()
    .then(updatePagerDuty)
    .catch(function (err) {
      console.error('ERROR: ', err)
    })
    .then(function () {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
      }
      const next = getNextEnableDisable().next
      const diff = next.add(10, 'seconds').diff(moment().tz('America/Los_Angeles'))

      timeoutHandle = setTimeout(module.exports, diff)
      console.log(`Next service toggle in ${moment.duration(diff).humanize()}`)
    })
}
