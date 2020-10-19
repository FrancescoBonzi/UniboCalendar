class UniboEventClass {
    constructor(title, start, end, location, url, docente) {
        this.title = title;
        this.start = start;
        this.startInputType = "utc";
        this.startOutputType = "utc";
        this.end = end;
        this.endInputType = "utc";
        this.endOutputType = "utc";
        this.location = location;
        this.url = url;
        this.organizer = {name: docente, email: "nome.cognome@unibo.it"};
    }
}

module.exports = UniboEventClass;