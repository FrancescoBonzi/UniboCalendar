var controller = require('./controller.js');
var express = require('express');
var bodyParser = require("body-parser");
var hbs = require('express-handlebars').create();

var app = express();

//set up port
app.set('port', process.env.PORT || 3000);

//set up static folder
app.use(express.static(__dirname + '/public'));

//set body-parser to read post request data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

//set up dispatcher
controller.dispatcher(app);

//set up handlebars
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

//start server
app.listen(app.get('port'), '127.0.0.1', function(){
    console.log( 'UniboClendar started on http://127.0.0.1:' +
                    app.get('port') + '; press Ctrl-C to terminate.' );
});