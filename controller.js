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
    res.render('home', {'page': 'home'});
}

function course_page(req, res, next) {
    const timetable_url = req.body.url;
    const year = req.body.year;
    model.getTimetable(timetable_url, year, function (list) {
        res.render('course', {'page': 'course', 'list': list, 'timetable_url': timetable_url, 'year': year});
    });
}

function get_calendar_url(req, res, next) {
    const timetable_url = req.body.timetable_url;
    const year = req.body.year;
    const lectures = req.body.lectures;
    if( typeof lectures === 'string' ) {
        lectures = [lectures];
    }
    var url = model.generateUrl(timetable_url, year, lectures);
    res.render('link', {'page': 'link', 'url': url});
}

function get_ical(req, res, next) {
    const timetable_url = req.query.timetable_url;
    const year = req.query.year;
    const lectures = req.query.lectures;
    if( typeof lectures === 'string' ) {
        lectures = [lectures];
    }
    model.getICalendarEvents(timetable_url, year, lectures, function(unibo_cal) {
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