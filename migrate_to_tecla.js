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
    return "unibo.c." + course_id + ".p." + curriculum;
}


var db = new sqlite3.Database('./logs/data.db');
db.close()
