"use strict";

var db = require(__dirname + "/../db");
var hash = require(__dirname + "/../hash");
var RconServer = require(__dirname + "/../rconserver");

/**
 * The view
 * @param {WebSocketUser} user
 * @param {object} messageData
 * @param {function} callback
 * @constructor
 */
var View = function (user, messageData, callback) {
    // access denied for everyone except admin
    if (!user.userData || !user.userData.admin) {
        callback({redirect: "index", "note": ["access.denied", "danger"]});
        return;
    }
    var deeperCallback = function (sendMessageData) {
        sendMessageData.servers = db.get("servers").cloneDeep().value();
        if (messageData.id) {
            sendMessageData.editData = sendMessageData.servers[messageData.id];
        }
        callback(sendMessageData);
    }
    var servers = null;
    // on delete
    if (messageData.form == "servers" && messageData.btn == "delete") {
        RconServer.get(messageData.id, function (server) {
            server.removeInstance(true);
            servers = db.get("servers").getState();
            delete servers[messageData.id];
            db.get("servers").setState(servers);
            deeperCallback({
                "note": ["deleted", "success"],
                "redirect": "servers",
                "resetForm": true
            });
        });
        return;
    }
    // on save
    if (messageData.form == "servers" && messageData.btn == "save") {
        var formData = messageData.formData;
        var id = messageData.id || hash.random(32);
        servers = db.get("servers").cloneDeep().value();
        var serverData = servers[id] || {};
        serverData.id = id;
        serverData.game = formData.game;
        serverData.name = formData.name;
        serverData.host = formData.host;
        serverData.port = parseInt(formData.port);
        serverData.users = formData.users.replace(/\s/ig, "");
        serverData.rcon_port = parseInt(formData.rcon_port);
        serverData.rcon_password = formData.rcon_password;
        db.get("servers").set(id, serverData).value();

        // reload server if edited
        if (messageData.id) {
            user.getServerById(messageData.id, function (server) {
                if (server) {
                    server.removeInstance(true);
                    RconServer.connectAll();
                }
            });
        }
        deeperCallback({
            "note": ["saved", "success"],
            "redirect": "servers"
        });
        return;
    }
    // just pipe to frontend
    deeperCallback({});
};

module.exports = View;