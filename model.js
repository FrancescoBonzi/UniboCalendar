const cheerio = require('cheerio');
const fetch = require('node-fetch');
const csv = require('csv-parser');
const fs = require('fs');
const iCalendar = require('./icalendar');
const UniboEventClass = require('./UniboEventClass');

const language = {
    "magistralecu": "orario-lezioni",
    "magistrale": "orario-lezioni",
    "laurea": "orario-lezioni",
    "singlecycle": "timetable",
    "1cycle": "timetable",
    "2cycle": "timetable"
}

var data_file = './opendata/corsi.csv';

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

// Finding "SITO DEL CORSO" from https://www.unibo.it/it/didattica/corsi-di-studio/corso/[year]/[code]
function getTimetableUrlGivenUniboUrl(unibo_url, callback) {
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

function getCurriculaGivenCourseUrl(unibo_url, callback) {
    getTimetableUrlGivenUniboUrl(unibo_url, function (timetable_url) {
        const json_err = [{
            "selected": false,
            "value": undefined,
            "label": "NON SONO PRESENTI CURRICULA"
        }];
        if(timetable_url === undefined) {
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

function getTimetable(unibo_url, year, curriculum, callback) {
    getTimetableUrlGivenUniboUrl(unibo_url, function (timetable_url) {
        var type = timetable_url.split('/')[3];
        var link = timetable_url + '/' + language[type] + '?anno=' + year + "&curricula=" + curriculum;
        fetch(link).then(x => x.text())
            .then(function (html) {
                var $ = cheerio.load(html);
                var inputs = [];
                $('#insegnamenti-popup ul li input').each(function (index, element) {
                    inputs.push($(element).attr('value'));
                });
                var labels = [];
                $('#insegnamenti-popup ul li label').each(function (index, element) {
                    labels.push($(element).text());
                });
                lectures_form = '<button class="btn btn-secondary" id="select_or_deselect_all" onclick="return selectOrDeselectAll();">Deseleziona tutti</button>';
                lectures_form += '<div class="container">';
                lectures_form += '<form id="select_lectures" action="/get_calendar_url" method="post"><div class="row"><table>';
                for (i = 0; i < inputs.length; i++)
                    lectures_form += '<tr><th><input type="checkbox" class="checkbox" name="lectures" value="' + inputs[i] + '" checked/></th><th><label>' + labels[i] + '</label></th></tr>';
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

function generateUrl(timetable_url, year, curriculum, lectures, callback) {
    var url = "http://unibocalendar.duckdns.org/get_ical?" +
        "timetable_url=" + timetable_url + "&" +
        "year=" + year + "&" +
        "curricula=" + curriculum;
    for (const l of lectures.values()) {
        url += '&lectures=' + l;
    }
    fetch("https://shorties.cloud/shlnk/save.php?url=" + encodeURIComponent(url)).then(x => x.text())
        .then(function (response) {
            if (response === undefined || response == '') {
                callback(url);
            } else {
                callback(response);
            }
        })
        .catch(function (err) {
            console.log(err);
            callback(url);
        });;
}

function getICalendarEvents(timetable_url, year, curriculum, lectures, alert, callback) {
    var type = timetable_url.split('/')[3]
    var link = timetable_url + '/' + language[type] + '/@@orario_reale_json?anno=' + year + '&curricula=' + curriculum;
    // Adding only the selected lectures to the request
    for (var l of lectures.values())
        link += '&insegnamenti=' + l;
    link += '&calendar_view=';
    // Send the request and parse the response
    fetch(link).then(x => x.text())
        .then(function (json) {
            json = JSON.parse(json);
            calendar = []
            for (var l of json) {
                const start = new Date(l.start);
                const end = new Date(l.end);
                var location = "solo ONLINE";
                if (l.aule.length > 0) {
                    location = l.aule[0].des_risorsa + ", " + l.aule[0].des_indirizzo;
                }
                var url = 'Non è disponibile una aula virtuale';
                if (!(l.teams === undefined) && !(l.teams === null)) {
                    url = encodeURIComponent(l.teams);
                }
                var prof = '-';
                if (!(l.docente === undefined) && !(l.docente === null)) {
                    prof = l.docente;
                }
                const event = new UniboEventClass(l.title, start, end, location, url, prof);
                calendar.push(event);
            }
            let factory = new iCalendar(alert);
            let vcalendar = factory.ical(calendar);
            callback(vcalendar);
        })
        .catch(function (err) {
            console.log(err);
            callback("An error occurred while creating the calendar.");
        });
}

module.exports.getAreas = getAreas;
module.exports.getCoursesGivenArea = getCoursesGivenArea;
module.exports.getCurriculaGivenCourseUrl = getCurriculaGivenCourseUrl;
module.exports.getTimetable = getTimetable;
module.exports.generateUrl = generateUrl;
module.exports.getICalendarEvents = getICalendarEvents;