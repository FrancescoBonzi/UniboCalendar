const fetch = require('node-fetch');
const csv = require('csv-parser');
const fs = require('fs');
const iCalendar = require('./icalendar');
const UniboEventClass = require('./UniboEventClass');
var sqlite3 = require('sqlite3');
const rb = require("randombytes");
const b32 = require('base32.js');
const TeclaClient = require('./tecla-clients/js/index');

const tecla = new TeclaClient.Tecla("https://tecla.eutampieri.eu");

const language = {
    "magistralecu": "orario-lezioni",
    "magistrale": "orario-lezioni",
    "laurea": "orario-lezioni",
    "singlecycle": "timetable",
    "1cycle": "timetable",
    "2cycle": "timetable"
}

var data_file = './opendata/corsi.csv';
const db_file = './logs/data.db';

// Generate random id
function generateId(length) {
    var encoder = new b32.Encoder({ type: "crockford", lc: true });
    return encoder.write(rb(length === undefined ? 3 : length)).finalize();
}

// Writing logs
function log_hit(id, ua) {
    var db = new sqlite3.Database(db_file);
    let query = "INSERT INTO hits VALUES (?, ?, ?)";
    db.run(query, new Date().getTime(), id, ua);
    db.close();
}

// Writing logs
function log_enrollment(params, lectures) {
    var db = new sqlite3.Database(db_file);
    // CREATE TABLE enrollments (id TEXT, date INTEGER, type TEXT, course TEXT, year INTEGER, curriculum TEXT, institution_id TEXT)
    let enrollment_query = "INSERT INTO enrollments VALUES(?, ?, NULL, NULL, ?, ?, ?)";
    db.run(enrollment_query, params);
    let lectures_query = "INSERT INTO requested_lectures VALUES(?, ?)";
    for (let i = 0; i < lectures.length; i++) {
        db.run(lectures_query, params[0], lectures[i]);
    }
    db.close();
}

function getAreas(callback) {
    //Reading csv file and building an array of unique values
    var results = [];
    fs.createReadStream(data_file)
        .pipe(csv())
        .on('data', (data) => {
            if (data.ambiti != '') {
                results.push(data)
            }
        })
        .on('end', () => {
            var areas = results.map(
                function ({ ambiti }) {
                    return ambiti;
                }
            );
            areas = Array.from(new Set(areas)).sort();
            callback(areas);
        });
}

function getCoursesGivenArea(area, callback) {
    var results = [];
    fs.createReadStream(data_file)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            courses = []
            for (i = 0; i < results.length; i++) {
                if (results[i].ambiti === area) {
                    var course = new Object();
                    course.code = results[i].corso_codice;
                    course.description = results[i].corso_descrizione;
                    course.url = results[i].url;
                    course.duration = results[i].durata;
                    course.type = results[i].tipologia;
                    courses.push(course);
                }
            }
            callback(courses);
        });
}

function getTimetable(uni, year, curriculum, callback) {
    uni.getTeachingsForCurriculum(curriculum, year)
        .then(function (teachings) {
            lectures_form = '<button class="btn btn-secondary" id="select_or_deselect_all" onclick="return selectOrDeselectAll();">Deseleziona tutti</button>';
            lectures_form += '<div class="container">';
            lectures_form += '<form id="select_lectures" action="/get_calendar_url" method="post"><div class="row"><table>';
            for (i = 0; i < teachings.length; i++)
                lectures_form += '<tr><th><input type="checkbox" class="checkbox" name="lectures" value="' + teachings[i].id + '" checked/></th><th><label>' + teachings[i].name + '</label></th></tr>';
            lectures_form += '</table></div><input type="hidden" name="uni_id" value="' + uni.id + '"/>';
            lectures_form += '<input type="hidden" name="year" value="' + year + '"/>';
            lectures_form += '<input type="hidden" name="curriculum" value="' + curriculum + '"/>';
            lectures_form += '</div>';
            lectures_form += '<input type="submit" class="btn btn-primary" value="Ottieni Calendario"/></form>';
            /*
            fs.writeFile("./labels.html", labels, function (err) {
                if (err)
                    return console.log(err);
                console.log("labels saved!");
            });
            */
            callback(lectures_form);
        })
        .catch(function (err) {
            console.log(err);
            callback('<h5 style="color: #dc3545;">Errore! L\'indirizzo non è valido...</h5>');
        });
};

function generateUrl(institution_id, year, curriculum, lectures, callback) {

    //Creating URL to get the calendar
    const id = generateId()
    //unibocalendar.duckdns.org
    var url = "webcal://unibocalendar.it/get_ical?id=" + id

    // Writing logs
    var params = [id, new Date().getTime(), year, curriculum, institution_id];
    log_enrollment(params, lectures);
    callback(url);
}

function checkEnrollment(uuid_value, callback) {
    if (uuid_value === undefined || uuid_value === null) {
        callback(false);
    } else {
        var db = new sqlite3.Database(db_file);
        let query = "SELECT * FROM enrollments WHERE id = ?";
        db.get(query, uuid_value, function (e, x) {
            callback(x !== undefined);
        });
        db.close();
    }
}

function getICalendarEvents(unis, id, ua, callback) {
    let alert = null
    checkEnrollment(id, function (isEnrolled) {
        if (!isEnrolled) {
            const start = new Date();
            const day = 864e5;
            const end = new Date(+start + day / 24);
            const ask_for_update_event = new UniboEventClass('Aggiorna UniboCalendar!', start, end, 'unknown', 'https://unibocalendar.it', '');
            var factory = new iCalendar(alert);
            var vcalendar = factory.ical([ask_for_update_event]);
            callback(vcalendar);
        } else {
            var db = new sqlite3.Database(db_file);
            let query_enrollments = "SELECT * FROM enrollments WHERE id = ?";
            db.get(query_enrollments, id, function (e, enrollments_info) {
                //console.log(enrollments_info)
                let year = enrollments_info["year"]
                let curriculum = enrollments_info["curriculum"]
                let uni = unis[enrollments_info["institution_id"]];
                let query_lectures = "SELECT lecture_id FROM requested_lectures WHERE enrollment_id = ?";
                db.all(query_lectures, id, function (e, lectures) {
                    let lectures_list = lectures.map((l) => l["lecture_id"]);
                    // Sending the request and parsing the response
                    uni.getTimetableWithTeaching(curriculum, lectures_list, year)
                        .then(function (data) {
                            calendar = []
                            for (var l of data) {
                                const start = new Date(l.start);
                                const end = new Date(l.end);
                                var location = "Solo ONLINE";
                                if (l.venue != null) {
                                    location = l.venue
                                }
                                var url = 'Non è disponibile una aula virtuale';
                                if (!(l.online_class_url === undefined) && !(l.online_class_url === null)) {
                                    url = encodeURI(l.online_class_url);
                                }
                                const event = new UniboEventClass(l.teaching.name, start, end, location, url, l.teacher);
                                calendar.push(event);
                            }
                            var factory = new iCalendar(alert);
                            var vcalendar = factory.ical(calendar);
                            callback(vcalendar);
                        })
                        .catch(function (err) {
                            console.log(err);
                            callback("An error occurred while creating the calendar.");
                        });
                    log_hit(id, ua);
                });
            });
        }
    })
}

module.exports.getAreas = getAreas;
module.exports.getCoursesGivenArea = getCoursesGivenArea;
module.exports.getTimetable = getTimetable;
module.exports.generateUrl = generateUrl;
module.exports.getICalendarEvents = getICalendarEvents;
module.exports.getUnis = async function () {
    let client = new TeclaClient.Tecla("https://tecla.eutampieri.eu");
    let unis = await client.getLearningInstitutions();
    let res = {};
    for (var i = 0; i < unis.length; i++) {
        res[unis[i].id] = unis[i];
    }
    return res;
};
