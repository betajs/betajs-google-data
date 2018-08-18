var PubSub = require('@google-cloud/pubsub');
var C = require("../local-credentials.js");

// Creates a client
var pubsub = new PubSub({
    projectId: C.pubSub,
    credentials: {
        "private_key": C.pubSub.private_key,
        "client_email": C.pubSub.client_email
    }
});

var subscriptionName = 'projects/' + C.pubSub.project_id + '/subscriptions/' + C.pubSub.subscription_name;
var timeout = 60;

var subscription = pubsub.subscription(subscriptionName);

subscription.on("message", function (message) {
    console.log(message.id, message.data, message.attributes);
    // 1234567890, {"emailAddress":"foobar@gmail.com", "historyId":1234567}, {...}
    message.ack();
});