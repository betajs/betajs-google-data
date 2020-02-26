// https://support.google.com/mail/answer/7190?hl=en

Scoped.define("module:Stores.GoogleRawMailStore", [
    "data:Stores.BaseStore",
    "data:Queries",
    "base:Promise",
    "base:Objs",
    "base:Time",
    "base:Types"
], function(BaseStore, Queries, Promise, Objs, Time, Types, scoped) {

    return BaseStore.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(google) {
                inherited.constructor.call(this);
                this.__gmail = require("googleapis").google.gmail("v1");
                this.__google = google;
            },

            _query_capabilities: function() {
                return {
                    limit: true,
                    skip: false,
                    sort: true,
                    query: {
                        atom: true,
                        conditions: {
                            "$ct": true,
                            "$ctic": true,
                            "$sw": true,
                            "$swic": true
                        }
                    }
                };
            },

            __gmailExecute: function(method, endpoint, data, resilience) {
                return Promise.resilience(function() {
                    var promise = Promise.create();
                    var ep = this.__gmail.users;
                    endpoint.split(".").forEach(function(e) {
                        ep = ep[e];
                    });
                    ep[method](Objs.extend({
                        auth: this.__google,
                        userId: "me"
                    }, data), promise.asyncCallbackFunc());
                    return promise;
                }, this, resilience || 5);
            },

            __isDraft: function(id) {
                return id.indexOf("r") === 0;
            },

            _get: function(id) {
                var draft = this.__isDraft(id);
                return this.__gmailExecute("get", draft ? "drafts" : "messages", {
                    id: id,
                    format: "full"
                }).mapSuccess(function(result) {
                    var myResult = draft ? result.data.message : result.data;
                    myResult.id = id;
                    return myResult;
                });
            },

            getAttachment: function(messageId, attachmentId) {
                return this.__gmailExecute("get", "messages.attachments", {
                    messageId: messageId,
                    id: attachmentId
                });
            },

            __rawMessageByData: function(data) {
                var mailcomposer = require("mailcomposer");
                var objs = Objs.filter({
                    to: data.to,
                    cc: data.cc,
                    bcc: data.bcc,
                    "in-reply-to": data["In-Reply-To"],
                    references: data.References,
                    subject: data.subject,
                    text: data.text_body,
                    attachments: data.attachments
                }, function(value) {
                    return !!value;
                });
                var mail = mailcomposer(objs);
                var promise = Promise.create();
                mail.build(function(err, value) {
                    promise.asyncSuccess(value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_'));
                });
                return promise;
            },

            _insert: function(data) {
                var draft = data.draft;
                if (data.threadId && data.threadId.indexOf("-") >= 0)
                    delete data.threadId;
                return this.__rawMessageByData(data).mapSuccess(function(raw) {
                    return this.__gmailExecute(draft ? "create" : "send", draft ? "drafts" : "messages", {
                        resource: draft ? {
                            message: {
                                threadId: data.threadId,
                                raw: raw
                            }
                        } : {
                            threadId: data.threadId,
                            raw: raw
                        }
                    }).mapSuccess(function(result) {
                        return this.get(result.data.id);
                    }, this);
                }, this);
            },

            _query: function(query, options) {
                if (query.id) {
                    return this.get(query.id).mapSuccess(function(json) {
                        return [json.data || json];
                    });
                }
                var promise = null;
                if (query.threadId) {
                    promise = this.__gmailExecute("get", "threads", {
                        id: query.threadId,
                        maxResults: options.limit || 100
                    });
                } else {
                    var q = [];
                    Objs.iter(query, function(value, key) {
                        if (Types.is_object(value)) {
                            Objs.iter(value, function(condval, cond) {
                                if (cond === "$ct" || cond === "$ctic")
                                    q.push(key + ":*" + condval + "*");
                                if (cond === "$sw" || cond === "$swic")
                                    q.push(key + ":" + condval + "*");
                            });
                        } else if (key !== "sent" && key !== "in_inbox" && key !== "draft" && key !== "starred" && key !== "archived")
                            q.push(key + ":" + value);
                    });
                    var labelids = [];
                    if (query.in_inbox)
                        labelids.push("INBOX");
                    if ("archived" in query && !query.archived)
                        labelids.push("INBOX");
                    if (query.sent)
                        labelids.push("SENT");
                    if (query.draft)
                        labelids.push("DRAFT");
                    if (query.starred)
                        labelids.push("STARRED");
                    var google_query = {
                        maxResults: options.limit || 100
                    };
                    if (labelids.length > 0)
                        google_query.labelIds = labelids;
                    if (q.length > 0)
                        google_query.q = q.join(" ");
                    promise = this.__gmailExecute("list", "messages", google_query);
                }
                return promise.mapSuccess(function(json) {
                    var promise = Promise.and();
                    Objs.iter(json.data.messages, function(msg) {
                        promise = promise.and(this.get(msg.id));
                    }, this);
                    var emailsPromise = promise.end();
                    var draftsPromise = this.__allDrafts();
                    return draftsPromise.mapError(function() {
                        return emailsPromise;
                    }).mapSuccess(function(drafts) {
                        var draftMap = {};
                        drafts.forEach(function(draft) {
                            draftMap[draft.message.id] = draft.id;
                        });
                        return emailsPromise.mapSuccess(function(emails) {
                            return emails.map(function(email) {
                                if (draftMap[email.id])
                                    email.id = draftMap[email.id];
                                return email;
                            });
                        });
                    });
                }, this);
            },

            _remove: function(id) {
                return this.__gmailExecute("delete", "messages", {
                    id: id,
                    format: "full"
                });
            },

            __allDrafts: function() {
                return this.__gmailExecute("list", "drafts", {}).mapSuccess(function(result) {
                    return result.data.drafts || [];
                });
            },

            __draftByMsgId: function(id) {
                return this.__allDrafts().mapSuccess(function(result) {
                    for (var i = 0; i < result.length; ++i) {
                        if (result[i].message.id === id)
                            return result[i];
                    }
                    return Promise.error("Not found");
                }, this);
            },

            __draftByDraftId: function(id) {
                return this.__gmailExecute("list", "drafts", {}).mapSuccess(function(result) {
                    for (var i = 0; i < result.data.drafts.length; ++i) {
                        if (result.data.drafts[i].id === id)
                            return result.data.drafts[i];
                    }
                    return Promise.error("Not found");
                }, this);
            },

            _update: function(id, data) {
                if (data.threadId && data.threadId.indexOf("-") >= 0)
                    delete data.threadId;
                if ("draft" in data && !data.draft) {
                    if (Objs.count(data) > 1) {
                        delete data.draft;
                        return this._update(id, data).mapSuccess(function() {
                            return this._update(id, {
                                draft: false
                            });
                        }, this);
                    }
                    return this.__draftByDraftId(id).mapSuccess(function(draft) {
                        return this.__gmailExecute("send", "drafts", {
                            resource: {
                                id: draft.id,
                                message: draft.message
                            }
                        }).mapSuccess(function(result) {
                            return this.get(result.data.id);
                        }, this);
                    }, this);
                }
                if (this.__isDraft(id)) {
                    return this._get(id).mapSuccess(function(draftData) {
                        Objs.iter(draftData.payload.headers, function(item) {
                            if (!(item.name.toLowerCase() in data))
                                data[item.name.toLowerCase()] = item.value;
                        });
                        if (!("text_body" in data) && draftData.payload.body && draftData.payload.body.data) {
                            var buf = new Buffer(draftData.payload.body.data, "base64");
                            data.text_body = buf.toString();
                        }
                        if (data.attachments) {
                            data.addAttachments = data.attachments;
                            data.attachments = [];
                        } else {
                            data.attachments = [];
                            var processParts = function(parts) {
                                Objs.iter(parts, function(part) {
                                    try {
                                        switch (part.mimeType) {
                                            case "text/plain":
                                                if (!("text_body" in data))
                                                    data.text_body = new Buffer(part.body.data, 'base64').toString();
                                                break;
                                            case "text/html":
                                                break;
                                            case "multipart/alternative":
                                                processParts(part.parts);
                                                break;
                                            default:
                                                if (part.body && part.body.attachmentId) {
                                                    data.attachments.push({
                                                        type: part.mimeType,
                                                        name: part.filename,
                                                        id: part.body.attachmentId
                                                    });
                                                }
                                                break;
                                        }
                                    } catch (e) {}
                                });
                            };
                            processParts(draftData.payload.parts || [draftData.payload]);
                        }
                        return Promise.and(data.attachments.map(function(attachment) {
                            return this.getAttachment(id, attachment.id).mapSuccess(function(attachmentData) {
                                return {
                                    contentType: attachment.type,
                                    filename: attachment.name,
                                    content: new Buffer(attachmentData.data.data, "base64")
                                };
                            });
                        }, this)).end().mapSuccess(function(attachments) {
                            data.attachments = attachments;
                            if (data.attachmentsAdd) {
                                data.attachments = data.attachments.concat(data.attachmentsAdd.map(function(attachment) {
                                    return {
                                        filename: attachment.name,
                                        content: attachment.data
                                    };
                                }));
                                delete data.attachmentsAdd;
                            }
                            return this.__rawMessageByData(Objs.extend(draftData, data)).mapSuccess(function(raw) {
                                return this.__gmailExecute("update", "drafts", {
                                    id: id,
                                    resource: {
                                        message: {
                                            raw: raw
                                        }
                                    }
                                }).mapSuccess(function(result) {
                                    return this.get(result.data.id);
                                }, this);
                            }, this);
                        }, this);
                    }, this);
                } else {
                    var addLabelIds = [];
                    var removeLabelIds = [];
                    if ("in_inbox" in data)
                        (data.in_inbox ? addLabelIds : removeLabelIds).push("INBOX");
                    if ("archived" in data)
                        (!data.archived ? addLabelIds : removeLabelIds).push("INBOX");
                    if ("read" in data)
                        (!data.read ? addLabelIds : removeLabelIds).push("UNREAD");
                    /*
                    if ("sent" in data)
                        (data.sent ? addLabelIds : removeLabelIds).push("SENT");
                    if ("draft" in data)
                        (data.draft ? addLabelIds : removeLabelIds).push("DRAFT");
                     */
                    if ("starred" in data)
                        (data.starred ? addLabelIds : removeLabelIds).push("STARRED");
                    if (addLabelIds.length + removeLabelIds.length > 0) {
                        return this.__gmailExecute("modify", "messages", {
                            id: id,
                            resource: {
                                addLabelIds: addLabelIds,
                                removeLabelIds: removeLabelIds
                            }
                        });
                    } else
                        return Promise.value({});
                }
            }

        };
    });
});


Scoped.define("module:Stores.GoogleMailStore", [
    "data:Stores.TransformationStore",
    "data:Queries",
    "module:Stores.GoogleRawMailStore",
    "base:Objs",
    "base:Promise"
], function(TransformationStore, Queries, GoogleRawMailStore, Objs, Promise, scoped) {
    return TransformationStore.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(google) {
                inherited.constructor.call(this, new GoogleRawMailStore(google), {
                    destroy_store: true
                });
            },

            _query_capabilities: function() {
                var capabilities = inherited._query_capabilities.call(this);
                capabilities.sort = true;
                return capabilities;
            },

            getAttachment: function(messageId, attachmentId) {
                return this._store().getAttachment(messageId, attachmentId);
            },

            addAttachments: function(messageId, attachments) {
                return this.update(messageId, {
                    attachmentsAdd: attachments
                }).mapSuccess(function(result) {
                    return result.attachments.slice(-attachments.length);
                });
            },

            _encodeData: function(data) {
                var result = {
                    labelIds: []
                };
                Objs.iter(data, function(value, key) {
                    if (value === null || value === undefined)
                        return;
                    switch (key) {
                        case "time":
                            result.Date = value;
                            break;
                        case "threadid":
                            result.threadId = value;
                            break;
                        case "in_reply_to":
                            result["In-Reply-To"] = value;
                            break;
                        case "to":
                        case "cc":
                        case "bcc":
                            result[key] = value.join ? value.join(",") : value;
                            break;
                        case "references":
                            result.References = value;
                            break;
                        default:
                            result[key] = value;
                    }
                }, this);
                if (result.labelIds.length === 0)
                    delete result.labelIds;
                return result;
            },

            _decodeData: function(json) {
                if (!json.payload)
                    return json;
                var result = {
                    id: json.id,
                    threadid: json.threadId,
                    snippet: json.snippet,
                    archived: !Objs.contains_value(json.labelIds, "INBOX"),
                    attachments: [],
                    to: [],
                    cc: [],
                    in_inbox: Objs.contains_value(json.labelIds, "INBOX"),
                    read: !Objs.contains_value(json.labelIds, "UNREAD"),
                    sent: Objs.contains_value(json.labelIds, "SENT"),
                    draft: Objs.contains_value(json.labelIds, "DRAFT"),
                    starred: Objs.contains_value(json.labelIds, "STARRED")
                };
                Objs.iter(json.labelIds, function(key) {
                    if (key.indexOf("CATEGORY_") === 0)
                        result.category = key.substring("CATEGORY_".length).toLowerCase();
                });
                Objs.iter(json.payload.headers, function(item) {
                    switch (item.name) {
                        case "To":
                            result.to.push(item.value);
                            break;
                        case "Cc":
                            result.cc.push(item.value);
                            break;
                        case "From":
                            result.from = item.value;
                            break;
                        case "Subject":
                            result.subject = item.value;
                            break;
                        case "Date":
                            result.creation_time = Date.parse(item.value);
                            break;
                        case "Message-Id":
                            result.messageid = item.value;
                            break;
                    }
                });
                var processParts = function(parts) {
                    Objs.iter(parts, function(part) {
                        try {
                            switch (part.mimeType) {
                                case "text/plain":
                                    result.text_body = new Buffer(part.body.data, 'base64').toString();
                                    break;
                                case "text/html":
                                    result.html_body = new Buffer(part.body.data, 'base64').toString();
                                    break;
                                case "multipart/alternative":
                                    processParts(part.parts);
                                    break;
                                default:
                                    if (part.body && part.body.attachmentId) {
                                        result.attachments.push({
                                            type: part.mimeType,
                                            filename: part.filename,
                                            id: part.body.attachmentId,
                                            size: part.body.size,
                                            internal: !!result.html_body && result.html_body.indexOf("cid:" + part.filename) >= 0
                                        });
                                    }
                                    break;
                            }
                        } catch (e) {}
                    });
                };
                processParts(json.payload.parts || [json.payload]);
                return result;
            }

        };
    });
});