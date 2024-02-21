import * as cheerio from "cheerio";
import fetch from "node-fetch";
import csv from "csv-parser";
import * as fs from "fs";
import { iCalendar } from "./icalendar.js";
import sqlite3 from "sqlite3";
import rb from "randombytes";
import b32 from "base32.js";
import { Tecla } from "./tecla.js";

const LANGUAGE = {
    "magistralecu": "orario-lezioni",
    "magistrale": "orario-lezioni",
    "laurea": "orario-lezioni",
    "singlecycle": "timetable",
    "1cycle": "timetable",
    "2cycle": "timetable"
}
const ONE_UNIX_DAY = 24 * 3600;
const DATA_FILE = "./opendata/corsi.csv";
const DB_FILE = "./logs/data.db";

// Create a single instance of the database connection
const db = new sqlite3.Database(DB_FILE);
process.on("exit", () => {
    db.close();
});

class UniboEventClass {
    constructor(title, start, end, location, url, docente) {
        this.title = title;
        this.start = start;
        this.end = end;
        this.location = location;
        this.url = url;
        this.organizer = docente;
    }
}

// Generate random id
export function generateId(length) {
    var encoder = new b32.Encoder({ type: "crockford", lc: true });
    return encoder.write(rb(length === undefined ? 3 : length)).finalize();
}

export function log_hit(id, ua) {
    let query = "INSERT INTO hits VALUES (?, ?, ?)";
    return new Promise((resolve, reject) => {
        db.run(query, new Date().getTime(), id, ua, function (error) {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

export function log_enrollment(params, lectures) {
    let enrollment_query = "INSERT INTO enrollments VALUES(?, ?, ?, ?, ?, ?)";
    let lectures_query = "INSERT INTO requested_lectures VALUES(?, ?)";

    return new Promise((resolve, reject) => {
        db.run(enrollment_query, params, function (error) {
            if (error) {
                reject(error);
            } else {
                // Use Promise.all to handle multiple asynchronous calls
                Promise.all(
                    lectures.map((lecture) =>
                        new Promise((res, rej) => {
                            db.run(lectures_query, params[0], lecture, function (err) {
                                if (err) {
                                    rej(err);
                                } else {
                                    res();
                                }
                            });
                        })
                    )
                )
                    .then(resolve)
                    .catch(reject);
            }
        });
    });
}

export function getAreas() {
    //Reading csv file and building an array of unique values
    var results = [];
    return new Promise((res, rej) => {
        fs.createReadStream(DATA_FILE)
            .pipe(csv())
            .on("data", (data) => {
                if (data.ambiti != "") {
                    results.push(data)
                }
            })
            .on("end", () => {
                var areas = results.map(
                    function ({ ambiti }) {
                        return ambiti;
                    }
                );
                areas = Array.from(new Set(areas)).sort();
                res(areas);
            });
    });
}

export function getCoursesGivenArea(area) {
    var results = [];
    return new Promise((res, rej) => {
        fs.createReadStream(DATA_FILE)
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", () => {
                let courses = []
                for (let i = 0; i < results.length; i++) {
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
                res(courses);
            });
    });
}

// Finding "SITO DEL CORSO" from https://www.unibo.it/it/didattica/corsi-di-studio/corso/[year]/[code]
export async function getTimetableUrlGivenUniboUrl(unibo_url, callback) {
    return await fetch(unibo_url).then(x => x.text())
        .then(function (html) {
            var $ = cheerio.load(html);
            var timetable_url = $("#u-content-preforemost .globe span a").first().attr("href");
            return timetable_url;
        })
        .catch(function (err) {
            console.log(err);
            return undefined;
        });
}

export async function getCurriculaGivenCourseUrl(unibo_url) {
    let timetable_url = await getTimetableUrlGivenUniboUrl(unibo_url);
    const json_err = [{
        "selected": false,
        "value": undefined,
        "label": "NON SONO PRESENTI CURRICULA"
    }];
    if (timetable_url === undefined) {
        return json_err;
    }
    var type = timetable_url.split("/")[3];
    var curricula_url = timetable_url + "/" + LANGUAGE[type] + "/@@available_curricula";
    // ex. https://corsi.unibo.it/laurea/clei/orario-lezioni/@@available_curricula
    return await fetch(curricula_url).then(x => x.json())
        .catch(function (err) {
            console.log(err);
            return json_err;
        });
}

export async function getTimetable(universityId, curriculum, year) {
    let university = Tecla.getUniversityById(universityId);
    return university.getTeachingsForCurriculum(curriculum, year)
        .then(function (teachings) {

            let lectures_form = '<button class="btn btn-secondary" id="select_or_deselect_all" onclick="return selectOrDeselectAll();">Deseleziona tutti</button>';
            lectures_form += '<div class="container">';
            lectures_form += '<form id="select_lectures" action="/get_calendar_url" method="post"><div class="row"><table>';
            for (let i = 0; i < teachings.length; i++) {
                lectures_form += '<tr><th><input type="checkbox" class="checkbox" name="lectures" value="' + teachings[i].id + '" id="' + teachings[i].id + '" checked/></th><th><label for="' + teachings[i].id + '">' + teachings[i].name + '</label></th></tr>';
            }
            lectures_form += '</table></div><input type="hidden" name="universityId" value="' + universityId + '"/>';
            lectures_form += '<input type="hidden" name="year" value="' + year + '"/>';
            lectures_form += '<input type="hidden" name="curriculum" value="' + curriculum + '"/>';
            lectures_form += '</div>';
            lectures_form += '<input type="submit" class="btn btn-primary" value="Ottieni Calendario"/></form>';
            return lectures_form
        })
        .catch(function (err) {
            console.log(err);
            return '<h5 style="color: #dc3545;">Errore! L\'indirizzo non è valido...</h5>';
        });
};

export function generateUrl(universityId, curriculum, year, lectures) {

    //Creating URL to get the calendar
    const id = generateId()
    //unibocalendar.duckdns.org
    var url = "webcal://unibocalendar.it/get_ical?id=" + id

    // Writing logs
    var params = [id, new Date().getTime(), universityId, "course", year, curriculum];
    log_enrollment(params, lectures);
    return url;
}

export function checkEnrollment(uuid_value) {
    if (uuid_value === undefined || uuid_value === null) {
        return new Promise((res) => res(false));
    } else {
        let query = "SELECT * FROM enrollments WHERE id = ?";
        return new Promise((res) => {
            db.get(query, uuid_value, function (e, x) {
                res(x !== undefined);
            });
        });
    }
}

export async function getICalendarEvents(id, ua, alert) {
    try {
        let isEnrolled = await checkEnrollment(id);

        if (!isEnrolled) {
            const start = new Date();
            const day = 864e5;
            const end = new Date(+start + day / 24);
            const ask_for_update_event = new UniboEventClass("Aggiorna BeeCal!", start, end, "unknown", "https://unibocalendar.it", "");
            var factory = new iCalendar(alert);
            return factory.ical([ask_for_update_event]);
        } else {
            // Use the existing database connection
            db.run("DELETE FROM cache WHERE expiration < strftime('%s', 'now')");
            let cache_check_promise = new Promise((res, rej) =>
                db.get("SELECT value FROM cache WHERE id = ?", id, function (e, result) {
                    if (result === undefined) {
                        res(false);
                    } else {
                        res(result["value"]);
                    }
                })
            );
            let vcalendar = await cache_check_promise;

            if (vcalendar === false) {
                let query_enrollments = "SELECT * FROM enrollments WHERE id = ?";
                let enrollment_promise = new Promise((res, rej) =>
                    db.get(query_enrollments, id, function (e, enrollments_info) {
                        res(enrollments_info);
                    })
                );
                let enrollments_info = await enrollment_promise;
                let university = enrollments_info["type"];
                let course = enrollments_info["course"];
                let year = enrollments_info["year"];
                let curriculum = enrollments_info["curriculum"];

                let tecla = Tecla.getUniversityById(university);

                let query_lectures = "SELECT lecture_id FROM requested_lectures WHERE enrollment_id = ?";
                let lectures = await new Promise((res, rej) => db.all(query_lectures, id, (e, lectures) => { res(lectures) }));

                let timetable = await tecla.getTimetableWithTeaching(curriculum, lectures.map((x) => x["lecture_id"]), year)

                let calendar = [];
                console.log(timetable);
                for (var l of timetable) {
                    const start = new Date(l.start);
                    const end = new Date(l.end);
                    var location = l.venue;
                    var url = l.online_class_url || null;
                    var prof = l.teacher;
                    const event = new UniboEventClass(l.teaching.name, start, end, location, url, prof);
                    calendar.push(event);
                }

                var factory = new iCalendar(alert);
                vcalendar = factory.ical(calendar);

                db.run(`INSERT INTO cache VALUES(?, ?, strftime("%s", "now") + ${ONE_UNIX_DAY})`, id, vcalendar);
            }

            log_hit(id, ua);
            return vcalendar;
        }
    } catch (error) {
        console.error("Error in getICalendarEvents:", error);
        throw error;
    }
}
