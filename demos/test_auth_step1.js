Scoped = require("../node_modules/betajs-scoped/dist/scoped.js");
BetaJS = require("../node_modules/betajs/dist/beta-noscoped.js");
require("../node_modules/betajs-data/dist/betajs-data-noscoped.js");
require("../dist/betajs-google-data.js");

var C = require("../local-credentials.js");

var google = BetaJS.DataSupport.Helpers.Google.oauth2(C.apiCredentials.client_id, C.apiCredentials.client_secret, "http://localhost:5000/callbacks/google/oauth");
console.log(BetaJS.DataSupport.Helpers.Google.oauth2Url(google, [
    "profile",
    "email",
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/calendar",
    /*
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.compose"
    */

    "https://mail.google.com",
    "https://www.googleapis.com/auth/contacts",
    "https://www.googleapis.com/auth/pubsub",
    "https://www.google.com/m8/feeds"
]));