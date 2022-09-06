# UniboCalendar
Questo servizio gratuito consente a tutti gli studenti Unibo di aggiungere l'orario delle proprie lezioni, filtrando solo quelle di interesse, al proprio calendario. Oltre a fornire in modo facile e immediato tutte le informazioni disponibili sui corsi, mantiene la sincronizzazione attiva per rilevare cambiamenti nell'orario e aggiornarsi da solo.

Questo sito è 
online qui: https://unibocalendar.it

![unibocalendar_screenshots](https://user-images.githubusercontent.com/35273715/188617075-59af9148-33d6-425b-a1e9-21d81ba64d87.png)

## Specifiche tecniche
L'applicativo è formato da due parti, il client e il server. Il client è il sito web che genera il link per iscriversi al calendario, mentre il server dato il link di iscrizione fornisce le lezioni tramite un file .ical, comprensibile a tutte le applicazioni dei calendari, come Apple Calendar, Google Calendar, Outlook Calendar, ecc.

Il server è realizzato con [Node.js](https://nodejs.dev/en/), utilizzando la libreria [Express](https://expressjs.com/it/). Il database relazionale è basato su [Sqlite3](https://www.npmjs.com/package/sqlite3).
Il client è in html e javascript ed utilizza [Bootstrap](https://getbootstrap.com) per i fogli di stile.

Il codice è strutturato secondo il paradigma [Model-View-Controller](https://it.wikipedia.org/wiki/Model-view-controller) (MVC).

## Contribuire al progetto
Questo sistema è stato sviluppato quasi interamente da due persone nel corso di 3 anni. Essendo un progetto portato avanti solo nel tempo libero presenta alcuni miglioramenti che sarebbero necessari, sopratutto per quanto riguarda la scalabilità, ma che risultano impegnativi da affrontare con così poche risorse. Il contributo di persone esterne è quindi molto apprezzato e anzi incoraggiato!

- [ ] SCALABILITÀ: vincolare l'interrogazione del sito unibo.it al massimo una volta al giorno (i calendari di Apple fanno decine di richieste al giorno inutilmente)
- [ ] PERFORMANCE: Passare da Sqlite3 a [MariaDB](https://mariadb.org/)
- [ ] PERFORMANCE: Convertire il codice da javascript ES5 a ES6
- [ ] STATISTICHE: Aggiungere il supporto a [Grafana](https://grafana.com) per le informazioni che ora vengono solamente loggate nella cartella logs/
- [ ] STATISTICHE: Conformare il servizio alla normativa GDPR
- [ ] NUOVE FUNZIONI: Creare un logo personalizzato
- [ ] NUOVE FUNZIONI: Aggiungere l'inserimento del calendario anche su Outlook Calendar
