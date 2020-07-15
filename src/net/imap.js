Scoped.define("module:Net.Imap", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Objs",
    "base:Async",
    "base:Promise",
    "base:Types"
], function(Class, EventsMixin, Objs, Async, Promise, Types, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(auth, options) {
                inherited.constructor.call(this);
                this.__quoted_printable = require("quoted-printable");
                this.__html_strip = require('string-strip-html');
                this.__auth = auth;
                options = options || {};
                this.__options = options;
                this.__count = 0;
                this.__Imap = require("imap");
                this.__connected = false;
                this.__imap = new this.__Imap(Objs.extend({
                    tls: true,
                    tlsOptions: {
                        rejectUnauthorized: false
                    }
                }, auth));
                var self = this;
                this.__imap.on("mail", function(mails) {
                    self.__count += mails;
                });
                this.__imap.on("error", function() {
                    self.trigger("error");
                    if (options.reconnect_on_error)
                        Async.eventually(self.reconnect, [], self);
                });
            },

            destroy: function() {
                this.disconnect();
                inherited.destroy.call(this);
            },

            connect: function() {
                if (this.__connected)
                    return Promise.value(true);
                this.__count = 0;
                var self = this;
                var promise = Promise.create();
                var f = function() {
                    promise.error(true);
                    self.off("error", f);
                };
                this.on("error", f);
                this.__imap.connect();
                this.__imap.once('ready', function() {
                    self.__connected = true;
                    var boxes = self.__options.mailbox || "INBOX";
                    if (!Types.is_array(boxes))
                        boxes = [boxes];
                    boxes = Objs.clone(boxes, 1);
                    var err = null;
                    var worker = function() {
                        if (boxes.length === 0) {
                            promise.error(err);
                            self.__connected = false;
                        }
                        var box = boxes.shift();
                        self.__imap.openBox(box, true, function(error, box) {
                            if (error) {
                                err = error;
                                worker();
                                return;
                            }
                            self.on("error", f);
                            self.__imap.on('mail', function(count) {
                                self.trigger("new_mail", count);
                            });
                            promise.asyncSuccess(true);
                        });
                    };
                    self.off("error", f);
                    worker();
                });
                return promise;
            },

            disconnect: function() {
                if (!this.__connected)
                    return;
                this.__imap.end();
                this.__connected = false;
            },

            reconnect: function() {
                this.disconnect();
                this.connect();
            },

            count: function() {
                return this.__count;
            },

            /*
             * body: boolean (= true)
             * headers: boolean (= true)
             * seq_from
             * seq_to
             * seq_count
             * reverse
             */
            fetch: function(options, callbacks) {
                options = options || {};
                var bodies = [];
                if (!("headers" in options) || options.headers)
                    bodies.push('HEADER.FIELDS (FROM TO SUBJECT DATE)');
                if (!("body" in options) || options.body)
                    bodies.push('TEXT');
                var seq_start = 1;
                var seq_end = 100;
                if (options.seq_count) {
                    if (options.seq_end) {
                        seq_end = options.seq_end;
                        seq_start = seq_end - options.seq_count + 1;
                    } else {
                        seq_start = options.seq_start || seq_start;
                        seq_end = seq_start + options.seq_count - 1;
                    }
                } else {
                    seq_start = options.seq_start || seq_start;
                    seq_end = options.seq_end || seq_start + 99;
                }
                if (options.reverse) {
                    var dist = seq_end - seq_start;
                    seq_end = this.__count - seq_start + 1;
                    seq_start = seq_end - dist;
                }
                var f = this.__imap.seq.fetch(seq_start + ":" + seq_end, {
                    bodies: bodies,
                    struct: true
                });
                return this.__query(f);
            },

            __query: function(f) {
                var self = this;
                var mails = [];
                f.on('message', function(msg, seqno) {
                    var attrs = {};
                    var header_buffer = '';
                    var body_buffer = '';
                    msg.on('body', function(stream, info) {
                        stream.on('data', function(chunk) {
                            if (info.which === 'TEXT')
                                body_buffer += chunk.toString('utf8');
                            else
                                header_buffer += chunk.toString('utf8');
                        });
                    });
                    msg.once('attributes', function(a) {
                        attrs = a;
                    });
                    msg.once('end', function() {
                        attrs.seqno = seqno;
                        try {
                            var mail = self.__parse(self.__Imap.parseHeader(header_buffer), body_buffer, attrs);
                            if (mail)
                                mails.push(mail);
                        } catch (e) {}
                    });
                });
                var promise = Promise.create();
                f.once('error', function(err) {
                    promise.asyncError(err);
                });
                f.once('end', function() {
                    promise.asyncSuccess(mails);
                });
                return promise;
            },

            __parse: function(header, body, attrs) {
                this.trigger("parse", header, body, attrs);
                var mail = {};
                /* Attrs */
                mail.uid = attrs.uid;
                mail.threadid = attrs['x-gm-thrid'];
                mail.id = attrs.uid;
                mail.seqid = attrs.seqno;
                /* Header */
                if (header && header.subject && header.subject.length > 0)
                    mail.subject = header.subject[0];
                if (header && header.to && header.to.length > 0)
                    mail.to = header.to[0];
                if (header && header.from && header.from.length > 0)
                    mail.from = header.from[0];
                if (header && header.date && header.date.length > 0) {
                    var d = new Date(header.date[0]);
                    mail.time = d.getTime();
                }
                if (body) {
                    /* Meta Body */
                    var struct = attrs.struct;
                    var parts = [];
                    if (struct.length > 1) {
                        var boundary = struct[0].params.boundary;
                        var rest = body;
                        var boundary_prefix = rest.indexOf(boundary);
                        for (var i = 1; i < struct.length; ++i) {
                            var obj = struct[i][0] || {};
                            // Remove everything before boundary
                            rest = rest.substring(rest.indexOf(boundary) + boundary.length);
                            // Remove everything before empty line
                            rest = rest.substring(rest.indexOf("\r\n\r\n") + "\r\n\r\n".length);
                            // Ignore attachments for now
                            if (obj.disposition || obj.type !== 'text')
                                continue;
                            var j = rest.indexOf(boundary) - boundary_prefix;
                            parts.push({
                                meta: obj,
                                body: j >= 0 ? rest.substring(0, j) : rest
                            });
                        }
                    } else
                        parts.push({
                            meta: struct[0],
                            body: body
                        });
                    var html_body = null;
                    var text_body = null;
                    for (var k = 0; k < parts.length; ++k) {
                        var encoded = parts[k].body;
                        var encoding = parts[k].meta.encoding.toLowerCase();
                        try {
                            if (encoding === "quoted-printable") {
                                encoded = this.__quoted_printable.decode(encoded).toString();
                            } else {
                                encoded = new Buffer(encoded, encoding).toString();
                            }
                        } catch (e) {}
                        if (parts[k].meta.subtype === "html")
                            html_body = encoded;
                        else
                            text_body = encoded;
                    }
                    if (!text_body && html_body) {
                        text_body = this.__html_strip(html_body
                            /*, {
                                                        include_script: false,
                                                        include_style: false,
                                                        compact_whitespace: true
                                                    }*/
                        );
                    }
                    mail.html_body = html_body;
                    mail.text_body = text_body;
                }
                return mail;
            }

        };
    }]);
});