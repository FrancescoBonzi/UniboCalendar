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
    model.getAreas(function (areas) {
        res.render('home', { 'page': 'home', 'areas': areas });
    });
}

function course_page(req, res, next) {
    const unibo_url = req.body.courses;
    const year = req.body.years;
    const curriculum = req.body.curricula;
    var today = new Date();
    console.log(today + ' Request for: ' + unibo_url + ', year = ' + year + ', curriculum = ' + curriculum);
    model.getTimetable(unibo_url, year, curriculum, function (list) {
        res.render('course', { 'page': 'course', 'list': list });
    });
}

function get_calendar_url(req, res, next) {
    const timetable_url = req.body.timetable_url;
    const year = req.body.year;
    const curriculum = req.body.curriculum;
    var lectures = req.body.lectures;
    if (typeof lectures === undefined || lectures === '') {
        lectures = [];
    } else if (typeof lectures === 'string') {
        lectures = [lectures];
    }
    model.generateUrl(timetable_url, year, curriculum, lectures, function (url) {
        res.render('link', { 'page': 'link', 'url': url });
    });
}

function get_ical(req, res, next) {
    const timetable_url = req.query.timetable_url;
    const year = req.query.year;
    const curriculum = req.query.curricula;
    var lectures = req.query.lectures;
    if (req.query.lectures === undefined || req.query.lectures === '')
        lectures = [];
    else if (typeof lectures === 'string')
        lectures = [lectures];
        let alert = req.query.alert === undefined ? null : parseInt(req.query.lectures);
    model.getICalendarEvents(timetable_url, year, curriculum, lectures, alert, function (unibo_cal) {
        var today = new Date();
        console.log(today + ' Send Calendar of: ' + timetable_url + ' - year = ' + year + ', curriculum = ' + curriculum + ', with ' + lectures.length + ' lectures.');
        res.type("text/calendar");
        res.send(unibo_cal);
    });
}

function get_courses_given_area(req, res, next) {
    var area = req.query.area;
    model.getCoursesGivenArea(area, function(courses) {
        res.type("application/json");
        res.send(courses);
    });
}

function get_curricula_given_course(req, res, next) {
    var url = req.body.url;
    model.getCurriculaGivenCourseUrl(url, function (curricula) {
        res.type("application/json");
        res.send(JSON.stringify(curricula));
    })
}

exports.dispatcher = function (app) {
    app.get('/', home_page);
    app.post('/course', course_page);
    app.post('/get_calendar_url', get_calendar_url);
    app.get('/get_ical', get_ical);
    app.get('/get_courses_given_area', get_courses_given_area);
    app.post('/get_curricula_given_course', get_curricula_given_course);
    app.use(error404); // 404 catch-all handler (middleware)
    app.use(error500); // 500 error handler (middleware)
}