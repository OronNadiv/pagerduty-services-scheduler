const moment = require('moment')
const Promise = require('bluebird')
const ENABLED = 'enabled'
const DISABLED = 'disabled'

require('moment-timezone')

class Scheduler {
  static getExpectedStatus () {
    const now = moment().tz('America/Los_Angeles')
    let enableAt = moment.tz(now.format('YYYY-MM-DD ') + process.env.ENABLE_SERVICE_AT, 'America/Los_Angeles')
    let disableAt = moment.tz(now.format('YYYY-MM-DD ') + process.env.DISABLE_SERVICE_AT, 'America/Los_Angeles')

    while (enableAt < now || enableAt.day() === 0 || enableAt.day() === 6) {
      enableAt = enableAt.add(1, 'days')
    }

    while (disableAt < now || disableAt.day() === 0 || disableAt.day() === 6) {
      disableAt = disableAt.add(1, 'days')
    }

    return enableAt < disableAt
      ? Promise.resolve(DISABLED)
      : Promise.resolve(ENABLED)
  }
}

module.exports = Scheduler
module.exports.ENABLED = ENABLED
module.exports.DISABLED = DISABLED
