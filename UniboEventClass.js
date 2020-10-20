class UniboEventClass {
    constructor(title, start, end, location, url, docente) {
        this.title = title;
        this.start = start;
        this.end = end;
        this.location = location;
        this.url = url;
        this.organizer = { name: docente, email: "nome.cognome@unibo.it" };
    }
}

module.exports = UniboEventClass;