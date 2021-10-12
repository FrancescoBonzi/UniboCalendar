var sqlite3 = require('sqlite3').verbose();
var model = require('./model');

var db = new sqlite3.Database('./logs/data.db');

let token_id = model.generateId(23);
let token_desc = "Created on " + new Date();

db.run("INSERT INTO token VALUES(?, ?)", [token_id, token_desc]);

console.log("Created token with value " + token_id);
