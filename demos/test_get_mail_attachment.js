Scoped = require("../node_modules/betajs-scoped/dist/scoped.js");
BetaJS = require("../node_modules/betajs/dist/beta-noscoped.js");
require("../node_modules/betajs-data/dist/betajs-data-noscoped.js");

require("../dist/betajs-google-data.js");
var C = require("../local-credentials.js");

var Google = require("googleapis");
var google = new Google.google.auth.OAuth2(C.apiCredentials.client_id, C.apiCredentials.client_secret);
google.setCredentials(C.userCredentials);

var store = new BetaJS.Data.Google.Stores.GoogleMailStore(google);
//var store = new BetaJS.Data.Google.Stores.GoogleCalendarStore(google, C.userEmail);

store.getAttachment(process.argv[2], process.argv[3]).success(function (iter) {
	console.log(iter);
}).error(function (e) {
	console.log(e);
});