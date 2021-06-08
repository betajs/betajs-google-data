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
		console.log("   ", subject, mail.labelIds);
	})
}


var run = function (ident, maxResults, labelIds, includeSpamTrash, q) {
	console.log(ident, labelIds, q);
	return query(maxResults, labelIds, includeSpamTrash, q).success(printAll)
}



var queries = [{
	ident: "Plain",
	labelIds: [],
	q: ""
}, {
	ident: "Sent",
	labelIds: ["SENT"],
	q: ""
}, {
	ident: "Primary",
	labelIds: [],
	q: "category:primary"
}, {
	ident: "Inbox",
	labelIds: ["INBOX"],
	q: ""
}, {
	ident: "Important",
	labelIds: ["IMPORTANT"],
	q: ""
}, {
	ident: "Unread",
	labelIds: ["UNREAD"],
	q: ""
}, {
	ident: "Archived",
	labelIds: [],
	q: "-category:inbox"
}, {
	ident: "Pseudo Primary",
	labelIds: [],
	q: "-category:promotions -category:updates -category:sent -category:social"
}];


var iter = function () {
	if (queries.length > 0) {
		var q = queries.shift();
		run(q.ident, 10, q.labelIds, false, q.q).callback(iter);
	}
}

iter();