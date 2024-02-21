import fetch from "node-fetch";


export let Tecla = {

    baseUrl: process.env.TECLA_URL,
    getLearningInstitutions: async function () {
        let unis = await fetch(this.baseUrl + "/unis").then(r => r.json());
        let baseUrl = this.baseUrl;
        return unis.map(function (el) {
            return new TeclaUniversity(
                el.name,
                el.license,
                baseUrl + "/unis/" + el.id,
                el.id
            );
        });
    },
    getUniversityById: function (id) {
        let baseUrl = this.baseUrl;
        return new TeclaUniversity(
            "",
            "",
            baseUrl + "/unis/" + id,
            id
        );
    }
}

export class TeclaUniversity {
    constructor(name, license, url, id) {
        this.name = name;
        this.license = license;
        this.url = url;
        this.id = id
    }

    async getAreas() {
        return await fetch(this.url + "/areas").then(r => r.json());
    }
    async getCoursesWithArea(areaId) {
        return await fetch(this.url + "/areas/" + areaId + "/courses").then(r => r.json());
    }
    async getCurriculaForCourse(courseId) {
        return await fetch(this.url + "/courses/" + courseId + "/curricula").then(r => r.json());
    }
    async getTeachingsForCurriculum(curriculumId, year) {
        return await fetch(this.url + "/curricula/" + curriculumId + "/teachings/" + year.toString()).then(r => r.json());
    }
    async getTimetableWithTeaching(curriculumId, teachings, year) {
        let qryStr = "?";
        for (let i = 0; i < teachings.length; i++) {
            qryStr = qryStr + "teachings=" + encodeURIComponent(teachings[i]) + "&";
        }
        qryStr = qryStr.slice(0, -1)
        return await fetch(this.url + "/curricula/" + curriculumId + "/timetables/" + year.toString() + qryStr).then(r => r.json());
    }
}

