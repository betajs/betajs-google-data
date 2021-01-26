Scoped = require("../node_modules/betajs-scoped/dist/scoped.js");
BetaJS = require("../node_modules/betajs/dist/beta-noscoped.js");
require("../node_modules/betajs-data/dist/betajs-data-noscoped.js");
require("../dist/betajs-google-data.js");
var C = require("../local-credentials.js");

var Google = require("googleapis");
var google = new Google.google.auth.OAuth2(C.apiCredentials.client_id, C.apiCredentials.client_secret);
google.setCredentials(C.userCredentials);

var store = new BetaJS.Data.Google.Stores.GoogleRawMailStore(google);

var query = function (maxResults, labelIds, includeSpamTrash, q) {
	return store.__gmailExecute("list", "messages", {
		maxResults: maxResults || 20,
		labelIds: labelIds || [],
		includeSpamTrash: includeSpamTrash || false,
		q: q || ""
	}).mapSuccess(function (json) {
		var promise = BetaJS.Promise.and();
		BetaJS.Objs.iter(json.data.messages, function(msg) {
			promise = promise.and(store.get(msg.id));
		}, this);
		return promise.end();
	})
}

var printAll = function (mails) {
	mails.forEach(function (mail) {
		var subject = "";
		mail.payload.headers.forEach(function (item) {
			if (item.name === "Subject")
				subject = item.value;
		})
		console.log(subject, mail.labelIds);
	})
}



//query(10, ["SENT"]).success(printAll);

query(10, ["INBOX"], false, "category:primary").success(printAll);

