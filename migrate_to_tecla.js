const fetch = require('node-fetch');
var sqlite3 = require('sqlite3').verbose();

const language = {
    "magistralecu": "orario-lezioni",
    "magistrale": "orario-lezioni",
    "laurea": "orario-lezioni",
    "singlecycle": "timetable",
    "1cycle": "timetable",
    "2cycle": "timetable"
}

async function getTeclaIdFromTypeAndCourse(type, name, curriculum) {
    let url = "https://corsi.unibo.it/" + type + "/" + name + "/" + language[type] + "/@@available_curricula";
    let res = await fetch(url).then(x => x.json());
    let course_id = res[0].label.split(" - ")[0];
    if (isNaN(parseInt(course_id))) {
        let language_lookup = {
            "magistralecu": "insegnamenti",
            "magistrale": "insegnamenti",
            "laurea": "insegnamenti",
            "singlecycle": "course-structure-diagram",
            "1cycle": "course-structure-diagram",
            "2cycle": "course-structure-diagram"
        }

        let course_plan_url = (
            await fetch("https://corsi.unibo.it/" + type + "/" + name + "/" + language_lookup[type])
                .then(x => x.text())
        ).match(/https:\/\/corsi\.unibo\.it\/[\/a-zA-Z\-0-9].*\/piano[\/a-zA-Z\-0-9].*/gm)[0];
        return course_plan_url.split('/')[8];
    }
    return "unibo.c." + course_id + ".p." + curriculum;
}

async function getTeachingIdsInCourse(type, name, year) {
    let url = "https://corsi.unibo.it/" + type + "/" + name + "/" + language[type] + "/@@orario_reale_json?anno=" + year;
    let apiResp = await fetch(url).then(x => x.json());
    let resp = {};
    for (let i = 0; i < apiResp.lenght; i++) {
        resp[apiResp[i].extCode] = apiResp[i].cod_modulo;
    }
    return resp;
}

function promisify(fn, query, params) {
    console.log(fn)
    return new Promise(function (res, rej) {
        fn(query, params, function (err, rows) {
            if (err === null) {
                res(rows);
            } else {
                rej(err);
            }
        });
    });
}

async function migrate() {
    var db = new sqlite3.Database('./logs/data.db');
    await promisify(db.run.bind(db), "BEGIN;");
    await promisify(db.run.bind(db), "ALTER TABLE enrollments ADD COLUMN institution_id TEXT");
    await promisify(db.run.bind(db), "UPDATE enrollments SET institution_id = \"unibo\"");
    await promisify(db.run.bind(db), "ALTER TABLE enrollments ADD COLUMN curriculum_id TEXT");
    let courses_old = await promisify(db.all.bind(db), "SELECT DISTINCT type, course, curriculum FROM enrollments;");
    //console.log(courses_old);
    for (let i = 0; i < courses_old.length; i++) {
        let course_id = await getTeclaIdFromTypeAndCourse(courses_old[i].type, courses_old[i].course, courses_old[i].curriculum);
        //console.log(course_id, courses_old[i]);
    }
    await promisify(db.run.bind(db), "COMMIT;");
    db.close();
}

migrate();
