'use strict';

const axios = require('axios');

const BASE_URL = process.env.BASE_NIKO_CLI_URL ? process.env.BASE_NIKO_CLI_URL : 'http://localhost:7001';

const request = axios.create({
    baseURL: BASE_URL,
  timeout: 1000,
})

request.interceptors.response.use(
    response => {
        return response.data;
    },
    error => {
        return Promise.reject(error);
    }
)

module.exports = request;