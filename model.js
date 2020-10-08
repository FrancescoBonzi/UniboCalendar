var rp = require('request-promise');
var cheerio = require('cheerio');
var fs = require('fs');
var ics = require('ics');
const UniboEventClass = require('./UniboEventClass');

function getTimetable(timetable_url, year, callback) {
    var link = timetable_url + '?anno=' + year;
    rp(link)
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
            lectures_form = '<form id="select_lectures" action="/get_calendar_url" method="post">';
            for (i = 0; i < inputs.length; i++)
                lectures_form += '<div class="row"><input type="checkbox" name="lectures" value="' + inputs[i] + '" checked/><label>' + labels[i] + '</label></div></br>';
            lectures_form += '<input type="hidden" name="timetable_url" value="' + timetable_url + '"/>';
            lectures_form += '<input type="hidden" name="year" value="' + year + '"/>';
            lectures_form += '<input type="submit" class="btn btn-primary" value="Ottieni URL"/></form>';
            /*
            fs.writeFile("./labels.html", labels, function (err) {
                if (err)
                    return console.log(err);
                console.log("labels saved!");
            });

            fs.writeFile("./inputs.html", inputs, function (err) {
                if (err)
                    return console.log(err);
                console.log("inputs saved!");
            });
            */
            callback(lectures_form);
        })
        .catch(function (err) {
            callback('<h5 style="color: #dc3545;">Errore! L\'indirizzo non è valido...</h5>');
            console.log(err);
        });
};

function generateUrl(timetable_url, year, lectures) {
    var url = "http://unibocalendar.duckdns.org/get_ical?" +
        "timetable_url=" + timetable_url + "&" +
        "year=" + year;
    for (const l of lectures.values())
        url += '&lectures=' + l;
    return url;
}

function castDateInICalendarFormat(date) {
    var [year, month, day] = date.toLocaleDateString().split(/[-/]/);
    var [hour, minute, second] = date.toLocaleTimeString().slice(0,7).split(":");
    if(minute == "00") minute = "0";
    if(second == "00") second = "0";
    const formatted_data = [year, month, day, hour, minute, second];
    //console.log(formatted_data);
    return formatted_data;
}

function getICalendarEvents(timetable_url, year, lectures, callback) {
    var link = timetable_url + '/@@orario_reale_json?anno=' + year + '&amp;curricula=&amp;';
    // Adding only the selected lectures to the request
    for (var l of lectures.values())
        link += 'insegnamenti=' + l + '&amp;';
    link += 'calendar_view=';
    console.log('sending request of orario vero!:\n' + link);
    // Send the request and parse the response
    rp(link)
        .then(function (json) {
            json = JSON.parse(json);
            calendar = []
            for (var l of json) {
                const start = castDateInICalendarFormat(new Date(l.start));
                const end = castDateInICalendarFormat(new Date(l.end));
                const event = new UniboEventClass(l.title, start, end);
                console.log(event);
                calendar.push(event);
            }
            ics.createEvents(calendar, (error, value) => {
                if (error) {
                    console.log(error);
                    throw "Calendar format not valid! ending...";
                } else {
                    console.log(value);
                }
               callback(value);
            });
        })
        .catch(function (err) {
            callback("An error occurred while creating the calendar.");
            console.log(err);
        });
}

module.exports.getTimetable = getTimetable;
module.exports.generateUrl = generateUrl;
module.exports.getICalendarEvents = getICalendarEvents;