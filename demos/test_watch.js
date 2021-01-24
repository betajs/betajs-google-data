Scoped = require("../node_modules/betajs-scoped/dist/scoped.js");
BetaJS = require("../node_modules/betajs/dist/beta-noscoped.js");
require("../node_modules/betajs-data/dist/betajs-data-noscoped.js");

require("../dist/betajs-google-data.js");

var C = require("../local-credentials.js");

var Google = require("googleapis");
var google = new Google.google.auth.OAuth2(C.apiCredentials.client_id, C.apiCredentials.client_secret);
google.setCredentials(C.userCredentials);

var Gmail = Google.google.gmail("v1");

BetaJS.Data.Google.Helpers.Google.gmailWatch(google, C.pubSub).callback(function (err, res) {
    console.log(err, res);
});


BetaJS.Data.Google.Helpers.Google.pubsubSubscribe(C.pubSub, function (err, res) {
    console.log(err, res);
});
