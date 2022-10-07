import { Router } from 'express';
import * as model from './model.js';

function bonk(req, res, next) {
    res.writeHead(302, {
        location: "https://knowyourmeme.com/photos/1916585-bonk-cheems",
    });
    res.end();
}

function error404(req, res, next) {
    res.status(404);
    res.render('404');
}

function error500(err, req, res, next) {
    console.error(err)
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
    model.getTimetable(unibo_url, year, curriculum, function (list) {
        res.render('course', { 'page': 'course', 'list': list });
    });
}

function get_calendar_url(req, res, next) {
    const timetable_url = req.body.timetable_url;
    const type = timetable_url.split('/')[3];
    const course = timetable_url.split('/')[4];
    const year = req.body.year;
    const curriculum = req.body.curriculum;
    var lectures = req.body.lectures;
    if (typeof lectures === undefined || lectures === '') {
        lectures = [];
    } else if (typeof lectures === 'string') {
        lectures = [lectures];
    }
    model.generateUrl(type, course, year, curriculum, lectures, function (url) {
        res.render('link', { 'page': 'link', 'url': url });
    });
}

function get_ical(req, res, next) {
    const id = req.query.id;
    let alert = req.query.alert === undefined ? null : parseInt(req.query.alert);
    model.getICalendarEvents(id, req.get("User-Agent"), alert, function (unibo_cal) {
        res.type("text/calendar");
        res.set({
            'Cache-Control': 'private',
            'Cache-Control': 'max-age=86400',
        });
        res.send(unibo_cal);
    });
}

function get_courses_given_area(req, res, next) {
    var area = req.query.area;
    model.getCoursesGivenArea(area, function (courses) {
        res.type("application/json");
        res.set({
            'Cache-Control': 'public',
            'Cache-Control': 'max-age=86400',
        });
        res.send(courses);
    });
}

function get_curricula_given_course(req, res, next) {
    var url = req.body.url;
    model.getCurriculaGivenCourseUrl(url, function (curricula) {
        res.type("application/json");
        res.set({
            'Cache-Control': 'public',
            'Cache-Control': 'max-age=86400',
        });
        res.send(JSON.stringify(curricula));
    })
}

export const router = (() => {
    const r = Router();
    r.get('/', home_page);
    r.post('/course', course_page);
    r.post('/get_calendar_url', get_calendar_url);
    r.get('/get_ical', get_ical);
    r.get('/get_courses_given_area', get_courses_given_area);
    r.post('/get_curricula_given_course', get_curricula_given_course);
    r.get('/bonk', bonk);
    r.use(error404); // 404 catch-all handler (middleware)
    r.use(error500); // 500 error handler (middleware)
    return r;
})();
