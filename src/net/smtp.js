Scoped.define("module:Net.Smtp", [
    "base:Strings",
    "base:Promise"
], function(Strings, Promise) {
    return {

        send: function(config, message) {
            var email = require("emailjs");
            message.from = Strings.email_get_email(message.from);
            message.to = Strings.email_get_email(message.to);
            if (message.text_body) {
                message.text = message.text_body;
                delete message.text_body;
            }
            var promise = Promise.create();
            email.server.connect(config).send(email.message.create(message), promise.asyncCallbackFunc());
            return promise;
        }

    };
});