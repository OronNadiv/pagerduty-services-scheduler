'use strict'

const checkAndUpdate = require('./check_and_update')
const interval = parseInt(process.env.CHECK_INTERVALIN_MINUTES || 30) * 60 * 1000

setInterval(checkAndUpdate, interval)
checkAndUpdate()
