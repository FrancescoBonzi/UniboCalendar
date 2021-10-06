var sqlite3 = require('sqlite3').verbose();

function getTeclaIdFromTypeAndCourse(type, name, curriculum) {
    let course_id = "8165";
    return "unibo.c." + course_id + ".p." + curriculum;
}

var db = new sqlite3.Database('./logs/data.db');
db.close()
