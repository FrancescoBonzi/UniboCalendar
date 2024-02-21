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
    let unis = await tecla.Tecla.getLearningInstitutions();
    res.render("home", { "page": "home", "unis": unis });
}

async function course_page(req, res, next) {
    const uni = req.body.uni;
    const year = req.body.year;
    const curriculum = req.body.curriculum;
    let list = await model.getTimetable(uni, curriculum, year);
    res.render("course", { "page": "course", "list": list });
}

async function get_calendar_url(req, res, next) {
    const universityId = req.body.universityId;
    const year = req.body.year;
    const curriculum = req.body.curriculum;
    var lectures = req.body.lectures;
    if (typeof lectures === undefined || lectures === "") {
        lectures = [];
    } else if (typeof lectures === "string") {
        lectures = [lectures];
    }
    let url = model.generateUrl(universityId, curriculum, year, lectures);
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
    var uni = req.query.uni;
    res.type("application/json");
    try {
        let areas = await tecla.Tecla.getUniversityById(uni).getAreas();
        res.send(areas);
    } catch (_) {
        res.send([]);
    }
}

async function get_courses_given_area(req, res, next) {
    var area = req.query.area;
    var uni = req.query.uni;
    res.type("application/json");
    try {
        let courses = await tecla.Tecla.getUniversityById(uni).getCoursesWithArea(area);
        res.send(courses);
    } catch (_) {
        res.send([]);
    }
}

async function get_curricula_given_course(req, res, next) {
    var course = req.body.course;
    var uni = req.body.uni;
    try {
        let curricula = await tecla.Tecla.getUniversityById(uni).getCurriculaForCourse(course);
        res.send(curricula);
    } catch (e) {
        console.error(e);
        res.send([]);
    }
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
