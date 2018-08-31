Scoped = require("../node_modules/betajs-scoped/dist/scoped.js");
BetaJS = require("../node_modules/betajs/dist/beta-noscoped.js");
require("../node_modules/betajs-data/dist/betajs-data-noscoped.js");

require("../dist/betajs-google-data.js");
var C = require("../local-credentials.js");

var Google = require("googleapis");
var google = new Google.google.auth.OAuth2(C.apiCredentials.client_id, C.apiCredentials.client_secret);
google.setCredentials(C.userCredentials);

var store = new BetaJS.Data.Google.Stores.GoogleMailStore(google);

store.insert({
	to: C.userEmail,
	subject: "Unit Test",
	text_body: "This is a unit test email."
}).success(function (doodad) {
	console.log(doodad);
});