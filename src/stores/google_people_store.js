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

    var QUERY_MAP = {
        CONTACT_GROUPS_ALL: "__queryViaContactGroupsAll",
        OTHER_CONTACTS: "__queryViaOtherContacts"
    };

    return BaseStore.extend({
        scoped: scoped
    }, function(inherited) {

        return {

            constructor: function(google, queryType) {
                inherited.constructor.call(this);
                this.__people = require("googleapis").google.people("v1");
                this.__google = google;
                this.__queryFunc = this[QUERY_MAP[queryType || "CONTACT_GROUPS_ALL"]];
            },

            _query_capabilities: function() {
                return {
                    limit: true,
                    skip: false,
                    sort: true,
                    query: Queries.fullQueryCapabilities()
                };
            },

            __execute: function(endpoint, method, data, resilience) {
                return Promise.resilience(function() {
                    var promise = Promise.create();
                    endpoint[method](Objs.extend({
                        auth: this.__google
                    }, data), promise.asyncCallbackFunc());
                    return promise;
                }, this, resilience || 5);
            },


            ___contactGroupsGet: function(resourceName, maxMembers) {
                return this.__execute(this.__people.contactGroups, "get", {
                    resourceName: resourceName,
                    maxMembers: maxMembers
                });
            },

            ___peopleGetBatchGet: function(resourceNames) {
                return this.__execute(this.__people.people, "getBatchGet", {
                    resourceNames: resourceNames || [],
                    personFields: FIELDS
                }).mapSuccess(function(data) {
                    return data.data.responses.filter(function(response) {
                        return response.httpStatusCode === 200;
                    });
                }, this);
            },

            ___otherContactsGet: function(maxMembers) {
                return this.__execute(this.__people.otherContacts, "list", {
                    pageSize: maxMembers,
                    readMask: ["emailAddresses", "names", "phoneNumbers"]
                });
            },

            __queryViaContactGroupsAll: function(query, options) {
                return this.___contactGroupsGet("contactGroups/all", options.limit || 50).mapSuccess(function(data) {
                    return this.___peopleGetBatchGet(data.data.memberResourceNames).mapSuccess(function(data) {
                        return data.map(this._decodePerson, this);
                    }, this);
                }, this);
            },

            __queryViaOtherContacts: function(query, options) {
                return this.___otherContactsGet(options.limit || 50).mapSuccess(function(data) {
                    return data.data.otherContacts.map(this._decodePerson, this);
                }, this);
            },

            _query: function(query, options) {
                if (query.id) {
                    return this.get(query.id).mapSuccess(function(json) {
                        return [json];
                    });
                }
                return this.__queryFunc.call(this, query, options);
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
                return "people/" + id.split("/").pop();
            },

            _decodePersonId: function(id) {
                return id.split("/").pop();
            },

            _decodePerson: function(data) {
                var person = data.person || data.data || data;
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