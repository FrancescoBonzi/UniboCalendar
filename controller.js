const { time } = require('console');
const { type } = require('os');
const { parse } = require('path');
var model = require('./model.js')

function error404(req, res, next) {
    res.status(404);
    res.render('404');
}

function error500(err, req, res, next) {
    res.status(500);
    res.render('500');
}

function home_page(req, res, next) {
    res.render('home', { 'page': 'home' });
}

function course_page(req, res, next) {
    const timetable_url = req.body.url;
    const year = req.body.year;
    model.getTimetable(timetable_url, year, function (list) {
        res.render('course', { 'page': 'course', 'list': list, 'timetable_url': timetable_url, 'year': year });
    });
}

async function get_calendar_url(req, res, next) {
    const timetable_url = req.body.timetable_url;
    const year = req.body.year;
    var lectures = req.body.lectures;
    if (typeof lectures == 'string') {
        lectures = [lectures];
    }
    var url = await model.generateUrl(timetable_url, year, lectures);
    res.render('link', { 'page': 'link', 'url': url });
}

function get_ical(req, res, next) {
    const timetable_url = req.query.timetable_url;
    const year = req.query.year;
    let lectures;
    if (req.query.lectures === undefined) {
        lectures = [];
    } else if (req.query.lectures === '') {
        lectures = [];
    } else if (typeof lectures === 'string') {
        lectures = [lectures];
    } else {
        lectures = req.query.lectures;
    }
    let alert = req.query.alert === undefined ? null : parseInt(req.query.lectures);
    model.getICalendarEvents(timetable_url, year, lectures, alert, function (unibo_cal) {
        res.type("text/calendar");
        res.send(unibo_cal);
    });
}

exports.dispatcher = function (app) {
    app.get('/', home_page);
    app.post('/course', course_page);
    app.post('/get_calendar_url', get_calendar_url);
    app.get('/get_ical', get_ical);
    app.use(error404); // 404 catch-all handler (middleware)
    app.use(error500); // 500 error handler (middleware)
}