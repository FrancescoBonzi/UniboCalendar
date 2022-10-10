import { router } from "./controller.js";
import express, { json, urlencoded } from "express";
import "express-handlebars";
import { checkForOpendataUpdates } from "./update_opendata.js";
//var csvMigrator = require("./migrate_csv.js");
import sqlite3 from "sqlite3";
import { __dirname } from "./utils.js";
import * as hbs from "express-handlebars";

var db = new sqlite3.Database("./logs/data.db");
var app = express();

function tokenMiddleware(correct) {
    return function (req, res, n) {
        if (req.query.token !== undefined) {
            let db = new sqlite3.Database("./logs/data.db");

            db.all("SELECT * FROM token WHERE id = ?", [req.query.token], (e, r) => {
                if (r.length == 0) {
                    return n();
                } else { return correct(req, res, n); }
            });
        } else {
            return n();
        }
    }
}

//set up port
app.set("port", process.env.PORT || 3002);

//set up static folder
app.use(express.static(__dirname + "/public"));
app.get("/data.db", tokenMiddleware(express.static(__dirname + "/logs")));

//set body-parser to read post request data
app.use(json());
app.use(urlencoded({ extended: true }));

//set up router
app.use("/", router);

//set up handlebars
app.engine("handlebars", hbs.engine());
app.set("view engine", "handlebars");

// Update opendata on launch
checkForOpendataUpdates();

/**
 * Create DB tables and migrate CSV
 */
db.run("CREATE TABLE IF NOT EXISTS enrollments (id TEXT, date INTEGER, type TEXT, course TEXT, year INTEGER, curriculum TEXT)");
db.run("CREATE TABLE IF NOT EXISTS requested_lectures (enrollment_id TEXT, lecture_id TEXT)");
db.run("CREATE TABLE IF NOT EXISTS hits (date INTEGER, enrollment_id TEXT, user_agent TEXT)");
db.run("CREATE TABLE IF NOT EXISTS token(id TEXT, description TEXT)");
//csvMigrator.migrate(db);
db.close()

app.get("/", (r, res, n) => { console.log("AADF"); res.send("AAA") })
//start server
app.listen(app.get("port"), "127.0.0.1", function () {
    console.log(`UniboClendar started on http://127.0.0.1:${app.get("port")}; press Ctrl-C to terminate.`);
});