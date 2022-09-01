# UniboCalendar
Servizio che consente a tutti gli studenti Unibo di aggiungere l'orario delle loro lezioni, filtrando solo quelle di interesse, al proprio calendario.

Questo sito è 
online qui: https://unibocalendar.it

<img src="https://user-images.githubusercontent.com/21265557/139593467-ac0207c9-6bd0-4864-bc36-bc323ba8d566.png" alt="" width="310" height="670"> <img src="https://user-images.githubusercontent.com/21265557/139593466-30efeffa-f1ae-4158-9c6a-ef6983bd6a9a.png" alt="" width="310" height="670"> <img src="https://user-images.githubusercontent.com/21265557/139593460-fe7e25d5-4e32-44fc-a99e-5133cbadd4fd.png" alt="" width="310" height="670">

## Specifiche tecniche
L'applicativo è formato da due parti, il client e il server. Il client è il sito web che genera il link per iscriversi al calendario, mentre il server dato il link di iscrizione fornisce le lezioni tramite un file .ical, comprensibile a tutte le applicazioni dei calendari, come Apple Calendar, Google Calendar, Outlook Calendar, ecc.

Il server è realizzato con Node.js, utilizzando la libreria express. Il database relazionale è basato su Sqlite3
Il client è in html e javascript ed utilizza Bootstrap per i fogli di stile.

Il codice è strutturato secondo il paradigma Model-View-Controller (MVC).

## Contribuire al progetto
Questo sistema è stato sviluppato quasi interamente da due persone nel corso di 3 anni. Essendo un progetto portato avanti solo nel tempo libero presenta alcuni miglioramenti che sarebbero necessari, sopratutto per quanto riguarda la scalabilità, ma che risultano impegnativi da affrontare con così poche risorse. Il contributo di persone esterne è quindi molto apprezzato e anzi incoraggiato!

- [ ] Aggiungere l'inserimento del calendario anche su Outlook Calendar
- [ ] SCALABILITÀ: vincolare l'interrogazione del sito unibo.it al massimo una volta al giorno (i calendari di Apple fanno decine di richieste al giorno inutilmente)
