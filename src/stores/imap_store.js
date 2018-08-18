Scoped.define("module:Stores.ImapStore", [
    "data:Stores.BaseStore",
    "data:Stores.StoreException",
    "base:Objs",
    "module:Net.Imap",
    "module:Net.Smtp"
], function(BaseStore, StoreException, Objs, Imap, Smtp, scoped) {
    return BaseStore.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                this.__imap = Objs.extend(Objs.clone(options.base, 1), options.imap);
                this.__smtp = Objs.extend(Objs.clone(options.base, 1), options.smtp);
                this.__imap_opts = options.imap_options || {};
                this.__imap_opts.reconnect_on_error = false;
            },

            test: function() {
                var imap = new Imap(this.__imap, this.__imap_opts);
                return imap.connect().callback(imap.destroy, imap);
            },

            _query_capabilities: function() {
                return {
                    skip: true,
                    limit: true
                };
            },

            _query: function(query, options) {
                var self = this;
                var imap = new Imap(this.__imap, this.__imap_opts);
                return imap.connect().mapSuccess(function() {
                    var opts = {};
                    if ("skip" in options)
                        opts.seq_start = options.skip + 1;
                    if ("limit" in options)
                        opts.seq_count = options.limit;
                    opts.reverse = true;
                    return imap.fetch(opts).success(function(mails) {
                        imap.destroy();
                    }, this);
                }, this);
            },

            _insert: function(mail) {
                Smtp.send(this.__smtp, {
                    from: mail.from,
                    to: mail.to,
                    subject: mail.subject,
                    text_body: mail.text_body
                }).mapCallback(function(err, msg) {
                    if (err)
                        return new StoreException(err);
                    mail.id = msg.header["message-id"];
                    return mail;
                });
            }

        };
    });
});

/*
Scoped.define("module:Stores.ImapListenerStore", [      
      "data:Stores.ListenerStore",
      "base:Objs",
      "module:Net.Imap"
  ], function (ListenerStore, Objs, Imap, scoped) {
  return ListenerStore.extend({scoped: scoped}, function (inherited) {
	return {
                                      			    
		constructor: function (options) {
			inherited.constructor.call(this, options);
			var opts = Objs.extend(Objs.clone(options.base, 1), options.imap);
			var imap = new Imap(opts, {reonnect_on_error: true});
			this._auto_destroy(imap);
			imap.on("new_mail", function (count) {
				imap.fetch({seq_count: count, reverse: true}).success(function (mails) {
					Objs.iter(mails, function (mail) {
						this._inserted(mail);
					}, this);
				}, this);
			}, this);
			imap.connect();
		}
		
	};
  });
});
*/