Scoped.define("module:Stores.GoogleContactsStore", [
    "data:Stores.BaseStore",
    "data:Queries",
    "base:Promise",
    "base:Objs",
    "base:Strings"
], function(BaseStore, Queries, Promise, Objs, Strings, scoped) {

    return BaseStore.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(google) {
                inherited.constructor.call(this);
                this.__contacts = new(require('google-contacts').GoogleContacts)({
                    token: google.credentials.access_token
                });
                this.__google = google;
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

                options = options || {};
                var promise = Promise.create();
                this.__contacts.getContacts(promise.asyncCallbackFunc(), {
                    projection: "full",
                    "max-results": options.limit,
                    q: [query.name || "", query.email || ""].join(" ")
                });
                return promise.mapSuccess(function(data) {
                    return data.map(this._decodePerson, this);
                }, this);
            },

            _get: function(id) {
                var promise = Promise.create();
                this.__contacts.getContact(promise.asyncCallbackFunc(), {
                    id: id
                });
                return promise.mapSuccess(this._decodePerson, this);
            },

            _decodePerson: function(data) {
                data = data.entry || data;
                return {
                    id: data.id,
                    name: data.name,
                    email: data.email ? data.email.toLowerCase() : "",
                    phoneNumber: data.phoneNumber
                };
            }

        };
    });
});