var C = require("../local-credentials.js");

var Google = require("googleapis");
var google = new Google.google.auth.OAuth2(C.apiCredentials.client_id, C.apiCredentials.client_secret);
google.setCredentials(C.userCredentials);

var Gmail = Google.google.gmail("v1");


var options = {
    userId: 'me',
    auth: google,
    resource: {
        labelIds: ['INBOX'],
        topicName: 'projects/' + C.pubSub.project_id + '/topics/' + C.pubSub.topic_name
    }
};

Gmail.users.watch(options, function (err, res) {
    console.log(err, res);
});