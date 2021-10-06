'use strict';
/* eslint-disable no-console */

const FastBootHeaders = require('./fastboot-headers');

class FastbootResponse {
  constructor(response) {
    this.headers = new FastBootHeaders(response.getHeaders());
    this.statusCode = 200;
  }
}

module.exports = FastbootResponse;
