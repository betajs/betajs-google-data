Scoped.define("module:Stores.GooglePeopleStore", [
    "data:Stores.BaseStore",
    "data:Queries",
    "base:Promise",
    "base:Objs",
    "base:Strings"
], function(BaseStore, Queries, Promise, Objs, Strings, scoped) {

    var FIELDS = [
        "addresses",
        "ageRanges",
        "biographies",
        "birthdays",
        "braggingRights",
        "coverPhotos",
        "emailAddresses",
        "events",
        "genders",
        "imClients",
        "interests",
        "locales",
        "memberships",
        "metadata",
        "names",
        "nicknames",
        "occupations",
        "organizations",
        "phoneNumbers",
        "photos",
        "relations",
        "relationshipInterests",
        "relationshipStatuses",
        "residences",
        "skills",
        "taglines",
        "urls"
    ];

    return BaseStore.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(google) {
                inherited.constructor.call(this);
                this.__people = require("googleapis").google.people("v1");
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
                var promise = Promise.create();
                this.__people.contactGroups.get(Objs.extend({
                    auth: this.__google,
                    resourceName: "contactGroups/all",
                    maxMembers: options.limit || 100
                }, query), promise.asyncCallbackFunc());
                return promise.mapSuccess(function(data) {
                    var promise = Promise.create();
                    this.__people.people.getBatchGet({
                        auth: this.__google,
                        resourceNames: data.data.memberResourceNames || [],
                        personFields: FIELDS
                    }, promise.asyncCallbackFunc());
                    return promise.mapSuccess(function(data) {
                        return data.data.responses.filter(function(response) {
                            return response.httpStatusCode === 200;
                        }).map(this._decodePerson, this);
                    }, this);
                }, this);
            },

            _get: function(id) {
                var promise = Promise.create();
                this.__people.people.get({
                    auth: this.__google,
                    resourceName: this._encodePersonId(id),
                    personFields: FIELDS
                }, promise.asyncCallbackFunc());
                return promise.mapSuccess(this._decodePerson, this);
            },

            _encodePersonId: function(id) {
                return "people/" + Strings.strip_start(id, "people/");
            },

            _decodePersonId: function(id) {
                return Strings.strip_start(id, "people/");
            },

            _decodePerson: function(data) {
                var person = data.person || data;
                var result = {
                    id: this._decodePersonId(person.resourceName),
                    emailAddresses: (person.emailAddresses || []).map(function(emailAddress) {
                        return emailAddress.value.toLowerCase();
                    }).filter(function(emailAddress) {
                        return Strings.is_email_address(emailAddress);
                    }),
                    gender: person.genders ? person.genders[0].value : undefined,
                    displayName: person.names ? person.names[0].displayName : undefined,
                    familyName: person.names ? person.names[0].familyName : undefined,
                    givenName: person.names ? person.names[0].givenName : undefined,
                    organization: person.organizations ? person.organizations[0].name : undefined,
                    title: person.organizations ? person.organizations[0].title : undefined,
                    photos: (person.photos || []).map(function(photo) {
                        return photo.url;
                    }).filter(function(photo) {
                        return !!photo;
                    })
                };
                result.name = result.displayName;
                result.email = result.emailAddresses[0];
                return result;
            }

        };
    });
});