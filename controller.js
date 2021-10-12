const model = require('./model.js');

const unis = model.getUnis();

function error404(req, res, next) {
    res.status(404);
    res.render('404');
}

function error500(err, req, res, next) {
    console.error(err)
    res.status(500);
    res.render('500');
}

async function home_page(req, res, next) {
    var uni_id = req.query.uni;
    var uni = (await unis)[uni_id];
    res.render('home', { 'page': "home", 'title': 'Corsi di ' + uni.name, "uni_id": uni.id, 'areas': await uni.getAreas(), "license": uni.license, "uniname": uni.name });
}

async function uni_select(req, res, next) {
    var uni_list = [];
    for (uni_id in (await unis)) {
        uni_list.push((await unis)[uni_id]);
    }
    res.render('uni_select', { "page": "home", 'title': 'UniCalendar', "unis": uni_list });
}

async function course_page(req, res, next) {
    const year = req.body.years;
    const curriculum = req.body.curricula;
    let uni = (await unis)[req.body.uni];
    model.getTimetable(uni, year, curriculum, function (list) {
        res.render('course', { 'page': 'course', 'list': list, "uniname": uni.name });
    });
}

async function get_calendar_url(req, res, next) {
    const uni_id = req.body.uni_id;
    const year = req.body.year;
    const curriculum = req.body.curriculum;
    var lectures = req.body.lectures;
    if (typeof lectures === undefined || lectures === '') {
        lectures = [];
    } else if (typeof lectures === 'string') {
        lectures = [lectures];
    }
    model.generateUrl(uni_id, year, curriculum, lectures, req.get("User-Agent"), function (url) {
        res.render('link', { 'page': 'link', 'url': url });
    });
}

async function get_ical(req, res, next) {
    const id = req.query.id;
    model.getICalendarEvents(await unis, id, req.get("User-Agent"), function (unibo_cal) {
        res.type("text/calendar");
        res.set({
            'Cache-Control': 'private',
            'Cache-Control': 'max-age=86400',
        });
        res.send(unibo_cal);
    });
}

async function get_courses_given_area(req, res, next) {
    var area = req.query.area;
    var uni = req.query.uni;
    console.log(uni, unis);
    let courses = await (await unis)[uni].getCoursesWithArea(area);
    res.type("application/json");
    res.set({
        'Cache-Control': 'public',
        'Cache-Control': 'max-age=86400',
    });
    res.send(courses.map((c) => {
        let course = {};
        course.code = "";
        course.description = c.name;
        course.url = c.id;
        course.duration = c.duration_in_years;
        course.type = "";
        return course;
    }))
}

async function get_curricula_given_course(req, res, next) {
    var course_id = req.body.url;
    var uni = req.body.uni;
    res.type("application/json");
    res.set({
        'Cache-Control': 'public',
        'Cache-Control': 'max-age=86400',
    });
    res.send((await (await unis)[uni].getCurriculaForCourse(course_id)).map((c) => {
        let r = {};
        r.selected = false;
        r.value = c.id;
        r.label = c.name;
        return r;
    }));
}

exports.dispatcher = function (app) {
    app.get('/', uni_select);
    app.get('/choose_course', home_page);
    app.post('/course', course_page);
    app.post('/get_calendar_url', get_calendar_url);
    app.get('/get_ical', get_ical);
    app.get('/get_courses_given_area', get_courses_given_area);
    app.post('/get_curricula_given_course', get_curricula_given_course);
    app.use(error404); // 404 catch-all handler (middleware)
    app.use(error500); // 500 error handler (middleware)
}
