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
        course_id = course_plan_url.split('/')[8];
    }
    return "unibo.c." + course_id + ".p." + curriculum;
}

async function getTeachingIdsInCourse(type, name, year, curriculum) {
    let url = "https://corsi.unibo.it/" + type + "/" + name + "/" + language[type] + "/@@orario_reale_json?anno=" + year + "&curricula=" + curriculum;
    let apiResp = await fetch(url).then(x => x.json());
    let resp = {};
    for (let i = 0; i < apiResp.length; i++) {
        resp[apiResp[i].extCode] = "unibo.t." + apiResp[i].cod_modulo;
    }
    return resp;
}

function promisify(fn, query, params) {
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
    let courses_old = await promisify(db.all.bind(db), "SELECT DISTINCT type, course, curriculum, year FROM enrollments;");
    let lectures_old = await promisify(db.all.bind(db), "SELECT enrollment_id, type, course, year, lecture_id FROM enrollments, requested_lectures WHERE enrollment_id = id;");
    let lectures_lookup = {};
    console.log("[Lectures] Building lookup table");
    for (let i = 0; i < courses_old.length; i++) {
        process.stdout.write("\r" + "░".repeat(i / courses_old.length * process.stdout.columns));
        lectures_lookup[courses_old[i].type + courses_old[i].course + courses_old[i].year.toString()] =
            await getTeachingIdsInCourse(courses_old[i].type, courses_old[i].course, courses_old[i].year.toString(), courses_old[i].curriculum);
        await new Promise(function (r, _) { setInterval(r, 300) }); // Don't DDOS UniBo
    }

    console.log(lectures_lookup);

    console.log("\n[Enrollments] Started migration");
    let updates = []
    for (let i = 0; i < courses_old.length; i++) {
        process.stdout.write("\r" + "░".repeat(i / courses_old.length * process.stdout.columns));
        let course_id = await getTeclaIdFromTypeAndCourse(courses_old[i].type, courses_old[i].course, courses_old[i].curriculum);
        await new Promise(function (r, _) { setInterval(r, 300) }); // Don't DDOS UniBo
        updates.push(promisify(db.run.bind(db), "UPDATE enrollments SET curriculum = ? WHERE course = ? AND type = ? AND curriculum = ?;", [course_id, courses_old[i].course, courses_old[i].type, courses_old[i].curriculum]));
    }
    await Promise.all(updates);
    console.log("\n[Enrollments] Finished migration");

    updates = [];
    console.log("[Requested lectures] Started migration");
    await promisify(db.run.bind(db), "DELETE FROM requested_lectures;");
    for (let i = 0; i < lectures_old.length; i++) {
        process.stdout.write("\r" + "░".repeat(i / lectures_old.length * process.stdout.columns));
        let lecture_id = lectures_lookup[lectures_old[i].type + lectures_old[i].course + lectures_old[i].year.toString()][lectures_old[i].lecture_id];
        updates.push(promisify(db.run.bind(db),
            "INSERT INTO requested_lectures VALUES(?, ?)",
            [lectures_old[i].enrollment_id, lecture_id]
        ));
    }
    await Promise.all(updates);
    console.log("\n[Requested lectures] Finished migration");

    //await promisify(db.run.bind(db), "ALTER TABLE enrollments DROP COLUMN type;");
    //await promisify(db.run.bind(db), "ALTER TABLE enrollments DROP COLUMN course;");
    await promisify(db.run.bind(db), "COMMIT;");
    db.close();
}

migrate();
