import { Router } from "express";
import * as model from "./model.js";
import * as tecla from "./tecla.js";

function bonk(req, res, next) {
    res.writeHead(302, {
        location: "https://knowyourmeme.com/photos/1916585-bonk-cheems",
    });
    res.end();
}

function error404(req, res, next) {
    res.status(404);
    res.render("404");
}

function error500(err, req, res, next) {
    console.error(err)
    res.status(500);
    res.render("500");
}

async function home_page(req, res, next) {
    let unis = await tecla.Tecla("http://127.0.0.1:8080").getLearningInstitutions();
    res.render("home", { "page": "home", "unis": unis });
}

async function course_page(req, res, next) {
    const unibo_url = req.body.courses;
    const year = req.body.years;
    const curriculum = req.body.curricula;
    let list = await model.getTimetable(unibo_url, year, curriculum);
    res.render("course", { "page": "course", "list": list });
}

async function get_calendar_url(req, res, next) {
    const timetable_url = req.body.timetable_url;
    const type = timetable_url.split("/")[3];
    const course = timetable_url.split("/")[4];
    const year = req.body.year;
    const curriculum = req.body.curriculum;
    var lectures = req.body.lectures;
    if (typeof lectures === undefined || lectures === "") {
        lectures = [];
    } else if (typeof lectures === "string") {
        lectures = [lectures];
    }
    let url = model.generateUrl(type, course, year, curriculum, lectures);
    res.render("link", { "page": "link", "url": url });
}

async function get_ical(req, res, next) {
    const id = req.query.id;
    let alert = req.query.alert === undefined ? null : parseInt(req.query.alert);
    let unibo_cal = await model.getICalendarEvents(id, req.get("User-Agent"), alert);
    res.type("text/calendar");
    res.send(unibo_cal);
}

async function get_areas_given_uni(req, res, next) {
    var area = req.query.area;
    let courses = await model.getCoursesGivenArea(area);
    res.type("application/json");
    res.send(courses);
}

async function get_courses_given_area(req, res, next) {
    var area = req.query.area;
    let courses = await model.getCoursesGivenArea(area);
    res.type("application/json");
    res.send(courses);
}

async function get_curricula_given_course(req, res, next) {
    var url = req.body.url;
    let curricula = await model.getCurriculaGivenCourseUrl(url);
    res.type("application/json");
    res.send(JSON.stringify(curricula));
}

export const router = (() => {
    const r = Router();
    r.get("/", home_page);
    r.post("/course", course_page);
    r.post("/get_calendar_url", get_calendar_url);
    r.get("/get_ical", get_ical);
    r.get("/get_areas_given_uni", get_areas_given_uni);
    r.get("/get_courses_given_area", get_courses_given_area);
    r.post("/get_curricula_given_course", get_curricula_given_course);
    r.get("/bonk", bonk);
    r.use(error404); // 404 catch-all handler (middleware)
    r.use(error500); // 500 error handler (middleware)
    return r;
})();
