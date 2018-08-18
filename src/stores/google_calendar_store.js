Scoped.define("module:Stores.GoogleRawCalendarStore", [
    "data:Stores.BaseStore",
    "data:Queries",
    "base:Promise",
    "base:Objs",
    "base:Time"
], function(BaseStore, Queries, Promise, Objs, Time, scoped) {
    return BaseStore.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(google, calendarId) {
                inherited.constructor.call(this);
                this.__calendar = require("googleapis").google.calendar("v3");
                this.__google = google;
                this.__calendarId = calendarId;
            },

            _query_capabilities: function() {
                return {
                    limit: true,
                    skip: false,
                    sort: true,
                    query: Queries.fullQueryCapabilities()
                };
            },

            _query: function(query, options) {
                if (query.id) {
                    return this.get(query.id).mapSuccess(function(json) {
                        return [json];
                    });
                }
                var promise = Promise.create();
                var googleQuery = Objs.extend({
                    auth: this.__google,
                    calendarId: this.__calendarId,
                    maxResults: options.limit || 100,
                    singleEvents: true,
                    timeZone: "UTC"
                }, query);
                this.__calendar.events.list(googleQuery, promise.asyncCallbackFunc());
                return promise.mapSuccess(function(json) {
                    return json.data.items;
                }, this);
            },

            _get: function(id) {
                var promise = Promise.create();
                this.__calendar.events.get({
                    auth: this.__google,
                    calendarId: this.__calendarId,
                    eventId: id
                }, promise.asyncCallbackFunc());
                return promise;
            },

            _remove: function(id) {
                var promise = Promise.create();
                this.__calendar.events["delete"]({
                    auth: this.__google,
                    calendarId: this.__calendarId,
                    eventId: id
                }, promise.asyncCallbackFunc());
                return promise;
            },

            _update: function(id, data) {
                // For now, we don't do anything updating it. We gracefully ignore the request.
                return Promise.value(data);
            },

            _insert: function(data) {
                var promise = Promise.create();
                this.__calendar.events.quickAdd({
                    auth: this.__google,
                    calendarId: this.__calendarId,
                    text: data.value
                }, promise.asyncCallbackFunc());
                return promise.mapSuccess(function(result) {
                    return {
                        id: result.eventId,
                        value: data.value,
                        start_date_utc: Time.now(),
                        start_date_utc_time_difference: null
                    };
                });
            }

        };
    });
});



Scoped.define("module:Stores.GoogleCalendarStore", [
    "data:Stores.TransformationStore",
    "data:Queries",
    "module:Stores.GoogleRawCalendarStore",
    "base:Objs",
    "base:Strings"
], function(TransformationStore, Queries, GoogleRawCalendarStore, Objs, Strings, scoped) {
    return TransformationStore.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(google, calendarId) {
                inherited.constructor.call(this, new GoogleRawCalendarStore(google, calendarId), {
                    destroy_store: true
                });
            },

            _query_capabilities: function() {
                var capabilities = inherited._query_capabilities.call(this);
                capabilities.sort = true;
                return capabilities;
            },

            _encodeData: function(data) {
                var result = {};
                Objs.iter(data, function(value, key) {
                    if (key == "date")
                        result.Date = value;
                    else
                        result[key] = value;
                }, this);
                return result;
            },

            _decodeData: function(json) {
                if (json.value)
                    return json;
                var result = {
                    id: json.id,
                    value: json.summary,
                    start_date_utc: null,
                    start_date_utc_time_difference: null
                };
                if (json.start && json.start.dateTime) {
                    var components = Strings.last_after(json.start.dateTime, "-").split(":");
                    result.start_date_utc = (new Date(json.start.dateTime)).getTime();
                    result.start_date_utc_time_difference = parseInt(components[0], 10) * 60 + parseInt(components[1], 10);
                }
                return result;
            },

            _encodeQuery: function(query, options) {
                //var encoded = inherited._encodeQuery.call(this, query, options);
                var encoded = {};

                function tree(q) {
                    Objs.iter(q, function(value, key) {
                        switch (key) {
                            case "start_date_utc":
                                var ge = value.$gte || value.$gt;
                                var lt = value.$lte || value.$lt;
                                if (ge)
                                    encoded.timeMin = (new Date(ge)).toISOString();
                                if (lt)
                                    encoded.timeMax = (new Date(lt)).toISOString();
                                break;
                            case "value":
                                encoded.q = value;
                                break;
                            default:
                                tree(value);
                        }
                    });
                }
                tree(query);
                return {
                    query: encoded,
                    options: options
                };
            }

        };
    });
});