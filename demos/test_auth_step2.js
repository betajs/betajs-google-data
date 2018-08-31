Scoped = require("../node_modules/betajs-scoped/dist/scoped.js");
BetaJS = require("../node_modules/betajs/dist/beta-noscoped.js");
require("../node_modules/betajs-data/dist/betajs-data-noscoped.js");
require("../dist/betajs-google-data.js");

var C = require("../local-credentials.js");

var google = BetaJS.Data.Google.Helpers.Google.oauth2(C.apiCredentials.client_id, C.apiCredentials.client_secret, "http://localhost:5000/callbacks/google/oauth");

var code = process.argv[2];

BetaJS.Data.Google.Helpers.Google.oauth2GetToken(google, code).callback(function (error, token) {
    console.log(error, token);
});