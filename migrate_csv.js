const fs = require('fs');

function parse_datetime(date, time) {
    let date_parts = date.split("/");
    let time_parts = time.split(":");
    if (date_parts.length != 3 && time_parts != 3) {
        return undefined;
    } else {
        return new Date(date_parts[2], date_parts[1], date_parts[0]).getTime();
    }
}

function migrate_enrollments(db) {
    const enrollments_file = "./logs/enrollments.csv"
    if (fs.existsSync(enrollments_file)) {
        let csv = fs.readFileSync(enrollments_file).toString();
        let rows = csv.split("\n");
        let enrollment_query = "INSERT INTO enrollments VALUES(?, ?, ?, ?, ?, ?)";
        let lectures_query = "INSERT INTO requested_lectures VALUES(?, ?)";
        for (var i = 0; i < rows.length; i++) {
            let fields = rows[i].split(",");
            if (fields.length < 2) {
                console.error("Skipping row " + rows[i]);
                continue;
            }
            let date = parse_datetime(fields[0], fields[1]);
            let enrollment_id = fields[2];
            if (date === undefined) {
                console.error("Skipping row " + rows[i]);
                continue;
            }
            db.run(enrollment_query, enrollment_id, date, fields[3], fields[4], fields[5], fields[6]);
            for (var j = 7; j < fields.length; j++) {
                db.run(lectures_query, enrollment_id, fields[j]);
            }

        }
        fs.copyFileSync(enrollments_file, enrollments_file + ".old");
        fs.unlink(enrollments_file, function () { });
    }
}
function migrate_hits(db) {
    const hits_file = "./logs/iCal.csv"
    if (fs.existsSync(hits_file)) {
        let csv = fs.readFileSync(hits_file).toString();
        let rows = csv.split("\n");
        let query = "INSERT INTO hits VALUES (?, ?, ?)";
        for (var i = 0; i < rows.length; i++) {
            let fields = rows[i].split(",");
            if (fields.length < 2) {
                console.error("Skipping row " + rows[i]);
                continue;
            }
            let date = parse_datetime(fields[0], fields[1]);
            let enrollment_id = fields[2];
            if (date === undefined) {
                console.error("Skipping row " + rows[i]);
                continue;
            }
            let ua = null;
            if (fields.length > 3) {
                ua = fields[3];
            }
            db.run(query, date, enrollment_id, ua);

        }
        fs.copyFileSync(hits_file, hits_file + ".old");
        fs.unlink(hits_file, function () { });
    }
}

module.exports.migrate = function (db) {
    migrate_enrollments(db);
    migrate_hits(db);
}
