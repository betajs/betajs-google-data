
QUnit.test("index google calendar", function (assert) {
	var done = assert.async();
	var C = require(__dirname + "/../../local-credentials.js");
	var Google = require("googleapis");
	var google = new Google.google.auth.OAuth2(C.apiCredentials.client_id, C.apiCredentials.client_secret);
	google.setCredentials(C.userCredentials);
	var calendarStore = new BetaJS.DataSupport.Stores.GoogleCalendarStore(google, C.userEmail);

	calendarStore.query({}, {limit: 10}).success(function (iter) {
		var items = iter.asArray();
        assert.ok(items.length > 0);
		done();
	});
});

/*
test("google calendar get", function () {
	var C = require(__dirname + "/../../local-credentials.js");
	delete global.define;
	var Google = require("googleapis");
	var google = new Google.google.auth.OAuth2(C.apiCredentials.client_id, C.apiCredentials.client_secret);
	google.setCredentials(C.userCredentials);
	var calendarStore = new BetaJS.DataSupport.Stores.GoogleCalendarStore(google, C.userEmail);

	calendarStore.query({}, {limit: 1}).success(function (iter) {
		var item = iter.next();
		var id = calendarStore.id_of(item);
		calendarStore.get(id).success(function (itemx) {
			QUnit.equal(item.body, itemx.body);
			start();
		}).error(function (e) {
			ok(false, e);
			start();
		});
	});
	stop();
});
*/
/* CUD */