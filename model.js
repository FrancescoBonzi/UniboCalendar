import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import { iCalendar } from './icalendar.js';
import { UniboEventClass } from './UniboEventClass.js';
import sqlite3 from 'sqlite3';
import rb from "randombytes";
import b32 from 'base32.js';

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
export function generateId(length) {
    var encoder = new b32.Encoder({ type: "crockford", lc: true });
    return encoder.write(rb(length === undefined ? 3 : length)).finalize();
}

// Writing logs
export function log_hit(id, ua) {
    var db = new sqlite3.Database(db_file);
    let query = "INSERT INTO hits VALUES (?, ?, ?)";
    db.run(query, new Date().getTime(), id, ua);
    db.close();
}

// Writing logs
export function log_enrollment(params, lectures) {
    var db = new sqlite3.Database(db_file);

    let enrollment_query = "INSERT INTO enrollments VALUES(?, ?, ?, ?, ?, ?)";
    db.run(enrollment_query, params);
    let lectures_query = "INSERT INTO requested_lectures VALUES(?, ?)";
    for (let i = 0; i < lectures.length; i++) {
        db.run(lectures_query, params[0], lectures[i]);
    }
    db.close();
}

export function getAreas(callback) {
    //Reading csv file and building an array of unique values
    var results = [];
    createReadStream(data_file)
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

export function getCoursesGivenArea(area, callback) {
    var results = [];
    createReadStream(data_file)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            let courses = []
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

// Finding "SITO DEL CORSO" from https://www.unibo.it/it/didattica/corsi-di-studio/corso/[year]/[code]
export function getTimetableUrlGivenUniboUrl(unibo_url, callback) {
    fetch(unibo_url).then(x => x.text())
        .then(function (html) {
            var $ = cheerio.load(html);
            var timetable_url = $('#u-content-preforemost .globe span a').first().attr('href');
            callback(timetable_url);
        })
        .catch(function (err) {
            console.log(err);
            callback(undefined);
        });
}

export function getCurriculaGivenCourseUrl(unibo_url, callback) {
    getTimetableUrlGivenUniboUrl(unibo_url, function (timetable_url) {
        const json_err = [{
            "selected": false,
            "value": undefined,
            "label": "NON SONO PRESENTI CURRICULA"
        }];
        if (timetable_url === undefined) {
            callback(json_err);
        }
        var type = timetable_url.split('/')[3];
        var curricula_url = timetable_url + '/' + language[type] + '/@@available_curricula';
        // ex. https://corsi.unibo.it/laurea/clei/orario-lezioni/@@available_curricula
        fetch(curricula_url).then(x => x.json())
            .then(function (json) {
                callback(json);
            })
            .catch(function (err) {
                console.log(err);
                callback(json_err);
            });
    })
}

export function getTimetable(unibo_url, year, curriculum, callback) {
    getTimetableUrlGivenUniboUrl(unibo_url, function (timetable_url) {
        var type = timetable_url.split('/')[3];
        var link = timetable_url + '/' + language[type] + '?anno=' + year + "&curricula=" + curriculum;
        fetch(link).then(x => x.text())
            .then(function (html) {
                var $ = load(html);
                var inputs = [];
                $('#insegnamenti-popup ul li input').each(function (index, element) {
                    inputs.push($(element).attr('value'));
                });
                var labels = [];
                $('#insegnamenti-popup ul li label').each(function (index, element) {
                    labels.push($(element).text());
                });
                let lectures_form = '<button class="btn btn-secondary" id="select_or_deselect_all" onclick="return selectOrDeselectAll();">Deseleziona tutti</button>';
                lectures_form += '<div class="container">';
                lectures_form += '<form id="select_lectures" action="/get_calendar_url" method="post"><div class="row"><table>';
                for (let i = 0; i < inputs.length; i++) {
                    lectures_form += '<tr><th><input type="checkbox" class="checkbox" name="lectures" value="' + inputs[i] + '" id="' + inputs[i] + '" checked/></th><th><label for="' + inputs[i] + '">' + labels[i] + '</label></th></tr>';
                }
                lectures_form += '</table></div><input type="hidden" name="timetable_url" value="' + timetable_url + '"/>';
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
    })
};

export function generateUrl(type, course, year, curriculum, lectures, callback) {

    //Creating URL to get the calendar
    const id = generateId()
    //unibocalendar.duckdns.org
    var url = "webcal://unibocalendar.it/get_ical?id=" + id

    // Writing logs
    var params = [id, new Date().getTime(), type, course, year, curriculum];
    log_enrollment(params, lectures);
    callback(url);
}

export function checkEnrollment(uuid_value, callback) {
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

export function getICalendarEvents(id, ua, alert, callback) {
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
                console.log(enrollments_info)
                let type = enrollments_info["type"]
                let course = enrollments_info["course"]
                let year = enrollments_info["year"]
                let curriculum = enrollments_info["curriculum"]
                var root = "https://corsi.unibo.it"
                var link = [root, type, course, language[type], '@@orario_reale_json?anno=' + year].join("/");
                if (curriculum !== undefined) {
                    link += '&curricula=' + curriculum;
                }
                // Adding only the selected lectures to the request
                console.log(link)
                let query_lectures = "SELECT lecture_id FROM requested_lectures WHERE enrollment_id = ?";
                db.all(query_lectures, id, function (e, lectures) {
                    for (var i = 0; i < lectures.length; i++) {
                        link += "&insegnamenti=" + lectures[i]["lecture_id"]
                    }
                    link += '&calendar_view=';
                    // Sending the request and parsing the response
                    fetch(link).then(x => x.text())
                        .then(function (json) {
                            json = JSON.parse(json);
                            let calendar = []
                            for (var l of json) {
                                const start = new Date(l.start);
                                const end = new Date(l.end);
                                var location = "Solo ONLINE";
                                if (l.aule.length > 0) {
                                    location = l.aule[0].des_risorsa + ", " + l.aule[0].des_indirizzo;
                                }
                                var url = 'Non è disponibile una aula virtuale';
                                if (!(l.teams === undefined) && !(l.teams === null)) {
                                    url = encodeURI(l.teams);
                                }
                                var prof = 'Non noto';
                                if (!(l.docente === undefined) && !(l.docente === null)) {
                                    prof = l.docente;
                                }
                                const event = new UniboEventClass(l.title, start, end, location, url, prof);
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
