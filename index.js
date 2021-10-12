var controller = require('./controller.js');
var express = require('express');
var bodyParser = require('body-parser');
var hbs = require('express-handlebars').create();
var updater = require('./update_opendata.js');
//var csvMigrator = require('./migrate_csv.js');
var sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database('./logs/data.db');
var app = express();

function tokenMiddleware(correct) {
    return function (req, res, n) {
        if (req.query.token !== undefined) {
            let db = new sqlite3.Database('./logs/data.db');

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
app.set('port', process.env.PORT || 3002);

//set up static folder
app.use(express.static(__dirname + '/public'));
app.get("/data.db", tokenMiddleware(express.static(__dirname + '/logs')));

//set body-parser to read post request data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//set up dispatcher
controller.dispatcher(app);

//set up handlebars
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// Update opendata on launch
updater.checkForOpendataUpdates();

/**
 * Create DB tables and migrate CSV
 */
db.run("CREATE TABLE IF NOT EXISTS enrollments (id TEXT, date INTEGER, type TEXT, course TEXT, year INTEGER, curriculum TEXT)");
db.run("CREATE TABLE IF NOT EXISTS requested_lectures (enrollment_id TEXT, lecture_id TEXT)");
db.run("CREATE TABLE IF NOT EXISTS hits (date INTEGER, enrollment_id TEXT, user_agent TEXT)");
db.run("CREATE TABLE IF NOT EXISTS token(id TEXT, description TEXT)");
//csvMigrator.migrate(db);
db.close()

//start server
app.listen(app.get('port'), '127.0.0.1', function () {
    console.log('UniboClendar started on http://127.0.0.1:' +
        app.get('port') + '; press Ctrl-C to terminate.');
});