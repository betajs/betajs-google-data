Scoped.define("module:Helpers.Google", [
    "base:Promise",
    "base:Time"
], function(Promise, Time) {

    var Google = require("googleapis");
    var PubSub = require('@google-cloud/pubsub').PubSub;

    return {

        getUserProfile: function(google) {
            var promise = Promise.create();
            Google.google.gmail("v1").users.getProfile({
                auth: google,
                userId: "me"
            }, promise.asyncCallbackFunc());
            return promise.mapSuccess(function(profile) {
                return profile.data;
            });
        },

        oauth2: function(clientId, clientSecret, redirectUri) {
            return new(Google.google.auth.OAuth2)(clientId, clientSecret, redirectUri);
        },

        oauth2WithCredentials: function(clientId, clientSecret, credentials) {
            var oauth2 = this.oauth2(clientId, clientSecret);
            oauth2.setCredentials(credentials);
            return oauth2;
        },

        oauth2RefreshRequired: function(oauth2) {
            return oauth2.credentials.expiry_date < Time.now();
        },

        oauth2ForceRefresh: function(oauth2) {
            var promise = Promise.create();
            oauth2.refreshAccessToken(promise.asyncCallbackFunc());
            return promise;
        },

        oauth2EnsureRefreshed: function(oauth2) {
            return this.oauth2RefreshRequired(oauth) ? this.oauth2ForceRefresh(oauth2) : Promise.value(true);
        },

        oauth2GetToken: function(oauth2, code) {
            var promise = Promise.create();
            oauth2.getToken(code, promise.asyncCallbackFunc());
            return promise;
        },

        oauth2Url: function(oauth2, scopes) {
            return oauth2.generateAuthUrl({
                access_type: 'offline',
                prompt: "consent",
                scope: scopes
            });
        },

        gmailWatch: function(oauth2, pubSubCreds) {
            var promise = Promise.create();
            Google.google.gmail("v1").users.watch({
                userId: 'me',
                auth: oauth2,
                resource: {
                    labelIds: ['INBOX'],
                    topicName: 'projects/' + pubSubCreds.project_id + '/topics/' + pubSubCreds.topic_name
                }
            }, promise.asyncCallbackFunc());
            return promise;
        },

        pubsubSubscribe: function(pubSubCreds, callback, callbackCtx) {
            var pubsub = new PubSub({
                projectId: pubSubCreds.project_id,
                credentials: {
                    "private_key": pubSubCreds.private_key,
                    "client_email": pubSubCreds.client_email
                }
            });
            var subscriptionName = 'projects/' + pubSubCreds.project_id + '/subscriptions/' + pubSubCreds.subscription_name;
            var subscription = pubsub.subscription(subscriptionName);
            subscription.on("message", function(message) {
                // 1234567890, {"emailAddress":"foobar@gmail.com", "historyId":1234567}, {...}
                try {
                    callback.call(callbackCtx, message.id, JSON.parse(message.data), message.attributes);
                } catch (e) {
                    console.log(e);
                }
                message.ack();
            });
        }

    };
});