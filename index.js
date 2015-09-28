'use strict';

var moment = require('moment'),
  checkAndUpdate = require('./check_and_update'),
  interval = process.env.CHECK_INTERVALIN_MINUTES ? parseInt(process.env.CHECK_INTERVALIN_MINUTES) * 60 * 1000 : moment.duration(30, 'minutes').asMilliseconds();

setInterval(checkAndUpdate, interval);
checkAndUpdate();
