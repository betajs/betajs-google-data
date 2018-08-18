QUnit.test("index google mail", function (assert) {
	var C = require(__dirname + "/../../local-credentials.js");
	var Google = require("googleapis");
	var google = new Google.google.auth.OAuth2(C.apiCredentials.client_id, C.apiCredentials.client_secret);
	google.setCredentials(C.userCredentials);
	var mailStore = new BetaJS.DataSupport.Stores.GoogleMailStore(google);
	var done = assert.async();
	mailStore.query({}, {limit: 10}).success(function (iter) {
		var items = iter.asArray();
        assert.ok(true);
		done();
	});
});

QUnit.test("google mail get", function (assert) {
	var C = require(__dirname + "/../../local-credentials.js");
	var Google = require("googleapis");
	var google = new Google.google.auth.OAuth2(C.apiCredentials.client_id, C.apiCredentials.client_secret);
	google.setCredentials(C.userCredentials);
	var mailStore = new BetaJS.DataSupport.Stores.GoogleMailStore(google);

    var done = assert.async();
    mailStore.query({}, {limit: 1}).success(function (iter) {
		var item = iter.next();
		var id = mailStore.id_of(item);
		mailStore.get(id).success(function (itemx) {
            assert.equal(item.subject, itemx.subject);
			done();
		});
	});
});

QUnit.test("google mail send", function (assert) {
	var C = require(__dirname + "/../../local-credentials.js");
	var Google = require("googleapis");
	var google = new Google.google.auth.OAuth2(C.apiCredentials.client_id, C.apiCredentials.client_secret);
	google.setCredentials(C.userCredentials);
	var mailStore = new BetaJS.DataSupport.Stores.GoogleMailStore(google);
    var done = assert.async();
	mailStore.insert({
		to: C.userEmail,
		subject: "Unit Test Send",
		text_body: "This is a unit test email."
	}).success(function (result) {
        assert.ok (true);
		done();
	});
});

QUnit.test("google draft send", function (assert) {
	var C = require(__dirname + "/../../local-credentials.js");
	var Google = require("googleapis");
	var google = new Google.google.auth.OAuth2(C.apiCredentials.client_id, C.apiCredentials.client_secret);
	google.setCredentials(C.userCredentials);
	var mailStore = new BetaJS.DataSupport.Stores.GoogleMailStore(google);
    var done = assert.async();
	mailStore.insert({
		to: C.userEmail,
		subject: "Unit Test Draft Convert",
		text_body: "This is a unit test email.",
		draft: true
	}).success(function (result) {
		mailStore.update(result.id, {draft: false}).success(function (updated) {
            assert.ok (updated.id != result.id);
			done();
		});
	});
});
