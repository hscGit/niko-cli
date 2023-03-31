'use strict';

const toType = require('..');
const assert = require('assert').strict;

assert.strictEqual(toType(), 'Hello from toType');
console.info("toType tests passed");
