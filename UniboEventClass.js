class UniboEventClass {
    constructor(title, start, end, location, url, docente) {
        this.title = title;
        this.start = this.castTimeFromUtcToLocalItaly(start);
        this.startInputType = "utc";
        this.end = this.castTimeFromUtcToLocalItaly(end);
        this.endInputType = "utc";
        this.location = location;
        this.url = url;
        this.organizer = {name: docente, email: "nome.cognome@unibo.it"};
    }
}

UniboEventClass.prototype.castTimeFromUtcToLocalItaly = function(dateTime) {
    dateTime[3] -= 2;
    return dateTime;
}

module.exports = UniboEventClass;