
QUnit.test("index google contacts", function (assert) {
	var done = assert.async();
	var C = require(__dirname + "/../../local-credentials.js");
	var Google = require("googleapis");
	var google = new Google.google.auth.OAuth2(C.apiCredentials.client_id, C.apiCredentials.client_secret);
	google.setCredentials(C.userCredentials);
    var store = new BetaJS.Data.Google.Stores.GoogleContactsStore(google);

    store.query({}, {limit: 10}).success(function (iter) {
		var items = iter.asArray();
        assert.ok(items.length > 0);
		done();
	}).error(function (e) {
		console.log(e);
		assert.ok(false);
		done();
	});
});
