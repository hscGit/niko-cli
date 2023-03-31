'use strict';

const request = require('@niko-cli/request');

module.exports = function () {
    return request({
        url: '/project/template'
    })
}