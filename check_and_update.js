'use strict';

var timeoutHandle,
  Bromise = require('bluebird'),
  request = require('request-promise'),
  _ = require('underscore'),
  moment = require('moment'),
  ENABLED = 'enabled',
  DISABLED = 'disabled';

require('moment-timezone');

function updatePagerDuty (requiredStatus) {
  var services = process.env.SERVICES.toLowerCase().split();
  return Bromise.resolve()
    .then(function () {
      return request({
        method: 'GET',
        uri: 'https://' + process.env.COMPANY_NAME + '.pagerduty.com/api/v1/services/',
        headers: {
          'Content-type': 'application/json',
          'Authorization': 'Token token=' + process.env.PAGERDUTY_API_KEY
        }
      });
    })
    .then(function (response) {
      return _.chain(JSON.parse(response).services)
        .filter(function (serviceData) {
          return _.contains(services, serviceData.name.toLowerCase());
        })
        .value();
    })
    .map(function (service) {
      if ((ENABLED === requiredStatus && service.status === 'active') || (DISABLED === requiredStatus && service.status === 'disabled')) {
        console.log('No action required.  Service name: ' + service.name + ', required service status: ' + requiredStatus + ', actual service status: ' + service.status);
        return;
      }

      console.log('Changing service status.  Service name: ' + service.name + ', required service status: ' + requiredStatus + ', actual service status: ' + service.status);

      var uri = 'https://' + process.env.COMPANY_NAME + '.pagerduty.com/api/v1/services/' + service.id + '/' + (requiredStatus === ENABLED ? 'enable' : 'disable');
      return request({
        method: 'PUT',
        uri: uri,
        headers: {
          'Content-type': 'application/json',
          'Authorization': 'Token token=' + process.env.PAGERDUTY_API_KEY
        },
        json: {requester_id: process.env.REQUESTER_ID}
      });
    });
}

function getNextEnableDisable () {
  var now = moment().tz('America/Los_Angeles'),
    enableAt = moment.tz(now.format('YYYY-MM-DD ') + process.env.ENABLE_SERVICE_AT, 'America/Los_Angeles'),
    disableAt = moment.tz(now.format('YYYY-MM-DD ') + process.env.DISABLE_SERVICE_AT, 'America/Los_Angeles');

  if (enableAt < now) {
    enableAt = enableAt.add(1, 'days');
  }

  if (disableAt < now) {
    disableAt = disableAt.add(1, 'days');
  }

  return {enable: enableAt, disable: disableAt, next: enableAt < disableAt ? enableAt : disableAt};
}

function shouldEnableOrDisable () {
  var enableDisable = getNextEnableDisable(),
    enable = enableDisable.enable,
    disable = enableDisable.disable;

  return enable < disable ? Bromise.resolve(DISABLED) : Bromise.resolve(ENABLED);
}

module.exports = function () {
  shouldEnableOrDisable()
    .then(updatePagerDuty)
    .catch(function (err) {
      console.error('ERROR: ', err);
    })
    .then(function () {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      var next = getNextEnableDisable().next,
        diff = next.add(10, 'seconds').diff(moment().tz('America/Los_Angeles'));
      timeoutHandle = setTimeout(module.exports, diff);
      console.log('Next service toggle in ', moment.duration(diff).humanize());
    });
};
