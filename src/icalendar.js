export class iCalendar {

    constructor(alarm) {
        this.secsAlarm = alarm;
        this.pid = "-//ETSoftware//JSiCal//IT";
    }

    dt(epoch) {
        return epoch.toISOString().replace(/-/g, '').replace(/:/g, '').split(".")[0] + "Z";
    }

    id(event) {
        var id = event.start.getTime().toString(16);
        id = id + ((event.end.getTime() - event.start.getTime()) % 4095).toString(16).padStart(4, '0');
        var crc = 0;
        for (var i = 0; i < event.title.length; i++) {
            crc = crc + event.title[i].charCodeAt();
        }
        crc = crc % 255;
        id = id + crc.toString(16).padStart(3, "0");
        return id;
    }

    interval(secs) {
        var s = secs % 60;
        secs = parseInt((secs / 60).toString());
        var m = secs % 60;
        secs = parseInt((secs / 60).toString());
        var h = secs % 60;
        secs = parseInt((secs / 60).toString());
        var d = secs % 60;
        var res = "-P";
        if (d != 0) {
            res = res + d.toString() + "D";
        }
        res = res + "T";
        if (h != 0) {
            res = res + h.toString() + "H";
        } if (m != 0) {
            res = res + m.toString() + "M";
        }
        res = res + s.toString() + "S";
        return res;
    }

    escape(t) {
        return t.replace(/\\/g, "\\\\").replace(/;/g, "\\,").replace(/:/g, "\\:").replace(/,/g, "\\,").replace(/"/g, "\\'");
    }

    wrapLine(l, o, e) {
        if (e === undefined) {
            l = this.escape(l);
        }
        if (l.length > (75 - o)) {
            var res = l.substr(0, 75 - o);// substr($l, 0, (75 - $o));
            for (var i = 0; i < (l.length - 75 + o) / 74 + 1; i++) {
                res = res + "\r\n " + l.substr(75 - o + i * 74, 74);
            }
            return res;
        }
        return l;
    }

    event(e) {
        var event = "BEGIN:VEVENT\r\nDTSTAMP:" + this.dt(new Date());
        event = event + "\r\nORGANIZER;" + this.wrapLine("CN=" + e.organizer.name + ":MAILTO:" + e.organizer.email, 10).replace(/\\:/g, ":");
        event = event + "\r\nUID:" + this.id(e) + "\r\n";
        event = event + "SEQUENCE:0\r\n";
        event = event + "DTSTART:" + this.dt(e.start) + "\r\n";
        event = event + "SUMMARY:" + this.wrapLine(e.title, 8);
        if(url !== null) {
            event = event + "\r\nURL:" + this.wrapLine(e.url, 5, false).replace("\\:", ":");
        }
        event = event + "\r\nLOCATION:" + this.wrapLine(e.location, 11);
        event = event + "\r\nDTEND:" + this.dt(e.end);
        if (this.secsAlarm !== null) {
            event = event + "\r\nBEGIN:VALARM\r\nTRIGGER:";
            event = event + this.interval(this.secsAlarm);
            event = event + "\r\nDESCRIPTION:" + this.wrapLine(e.title, 13) + "\r\nACTION:DISPLAY\r\nEND:VALARM";
        }
        event = event + "\r\nEND:VEVENT\r\n";
        return event;
    }

    ical(events) {
        var vcal = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:" + this.pid + "\r\n";
        vcal = vcal + "CALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n";
        for (var i in events) {
            vcal = vcal + this.event(events[i]);
        }
        vcal = vcal + "END:VCALENDAR\r\n";
        return vcal;
    }
}
