# UniboCalendar
Questo servizio gratuito consente a tutti gli studenti Unibo di aggiungere l'orario delle proprie lezioni, filtrando solo quelle di interesse, al proprio calendario. Oltre a fornire in modo facile e immediato tutte le informazioni disponibili sui corsi, mantiene la sincronizzazione attiva per rilevare cambiamenti nell'orario e aggiornarsi da solo.

Questo sito è 
online qui: https://unibocalendar.it

![unibocalendar_screenshots](https://user-images.githubusercontent.com/35273715/188617075-59af9148-33d6-425b-a1e9-21d81ba64d87.png)

## Attivazione

#### npm

```
git clone https://github.com/FrancescoBonzi/UniboCalendar
cd UniboCalendar
npm i
npm start
# surf to localhost:3002
```

#### docker

```
docker pull ghcr.io/francescobonzi/unibocalendar:latest
docker run -p 3002:3000 -v $(pwd)/src/logs:/app/logs ghcr.io/francescobonzi/unibocalendar:latest
# surf to localhost:3002
```

## Specifiche tecniche
L'applicativo è formato da due parti, il client e il server. Il server genera il link per iscriversi al calendario e fornisce le lezioni tramite un file .ical, comprensibile a tutte le applicazioni dei calendari, come Apple Calendar, Google Calendar, Outlook Calendar, ecc. Il client è la pagina web che permette di interfacciarsi in maniera facile ed intuitiva con la logica del servizio.

Il server è realizzato con [Node.js](https://nodejs.dev/en/), utilizzando la libreria [Express](https://expressjs.com/it/). Il database relazionale è basato su [Sqlite3](https://www.npmjs.com/package/sqlite3).
Il client è in html e javascript ed utilizza [Bootstrap](https://getbootstrap.com) per i fogli di stile.

Il codice è strutturato secondo il paradigma [Model-View-Controller](https://it.wikipedia.org/wiki/Model-view-controller) (MVC).

## Contribuire al progetto
Questo sistema è stato sviluppato quasi interamente da due persone nel corso di 3 anni. Essendo un progetto portato avanti solo nel tempo libero presenta alcuni miglioramenti che sarebbero necessari, sopratutto per quanto riguarda la scalabilità, ma che risultano impegnativi da affrontare con così poche risorse. Il contributo di persone esterne è quindi molto apprezzato e anzi incoraggiato!

Nella sezione delle Issues sono aperti diversi ticket, ai quali è possibile rispondere chiedendo informazioni, dando suggerimenti o proponendo Pull Request per migliorare il sistema.
