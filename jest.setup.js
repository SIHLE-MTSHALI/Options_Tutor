// Polyfill fetch for Node.js test environment
global.fetch = require('node-fetch');
global.Headers = require('node-fetch').Headers;
global.Request = require('node-fetch').Request;
global.Response = require('node-fetch').Response;