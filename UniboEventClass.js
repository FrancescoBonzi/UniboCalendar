class UniboEventClass {
    constructor(title, start, end, location, url, docente) {
        this.title = title;
        this.start = start;
        this.startInputType = "local";
        this.startOutputType = "utc";
        this.end = end;
        this.endInputType = "local";
        this.endOutputType = "utc";
        this.location = location;
        this.url = url;
        this.organizer = {name: docente, email: "nome.cognome@unibo.it"};
    }
}

module.exports = UniboEventClass;