var git     = require("nodegit");
var express = require("express");
var sqlite  = require("sqlite3");
var shortid = require("shortid");
var crypto  = require("crypto");
var sprintf = require("sprintf").sprintf;
var argv    = require("yargs").argv;

var web = express();
var db  = new sqlite.Database(__dirname + "/data.sqlite", function (err) {
    if(err) {
        console.err("An error occured: %s", err);
        process.exit(1);

        return;
    }

    db.serialize(function () {
        db.run("CREATE TABLE IF NOT EXISTS users ( name TEXT, mail TEXT, pass TEXT ) ;");
        db.run("CREATE TABLE IF NOT EXISTS hooks ( uid INTEGER, name TEXT, key TEXT, path TEXT, branch TEXT, UNIQUE (path, branch) ) ;");
        db.run("CREATE TABLE IF NOT EXISTS logs  ( event TEXT, date INTEGER ) ;");
    });
});

function log (text, args) {
    var t = Date.now();
    text  = sprintf(text, args || []);

    console.log(text);

    db.run("INSERT INTO logs VALUES ( ?, ? ) ;", [text, t]);
}

web.set("views", __dirname + "/www/views");
web.set("view engine", "jade");

web.all("/hook/:key/deploy", function (req, res) {
    db.get("SELECT name, path, branch FROM hooks WHERE key = ? ;", [req.params.key], function (err, row) {
        if(!err && row) {
            res.send("+ OK");
            log("Initiating pull of %s (branch=%s, path=%s)", [row.name, row.path, row.branch]);
        } else {
            res.send("- ERR: Not found or database failure !");
            log("Could not find a hook ! (key=%s)", [req.params.key]);
        }
    });
});

web.get("/", function (req, res) {
    db.all("SELECT * FROM hooks ORDER BY rowid ;", function (err, rows) {
        res.render("index", {
            host: req.headers.host,
            hooks: rows
        });
    });
});

web.all("/hook/:key/edit", function (req, res) {
    if(req.params.key === "+") {
        res.render("edithook", {
            hook: {},
            action: sprintf("/hook/%s/edit", [shortid.generate()])
        });
    } else {
        db.get("SELECT * FROM hooks WHERE key = ? ;", [req.params.key], function (err, row) {
            res.render("edithook", {
                hook: row,
                action: sprintf("/hook/%s/edit", [req.params.key])
            });
        });
    }
});

web.use(express.static(__dirname + "/www/static"));

var serv = web.listen(argv.port || 8808, argv.host || "0.0.0.0", function () {
    var a = serv.address();
    console.log("Listening on %s:%d", a.address, a.port)
});