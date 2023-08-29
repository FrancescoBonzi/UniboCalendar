import sqlite3 from "sqlite3";
import { generateId } from "./model.js";

var db = new sqlite3.Database("./logs/data.db");

let token_id = generateId(23);
let token_desc = "Created on " + new Date();

db.run("INSERT INTO token VALUES(?, ?)", [token_id, token_desc]);
db.close();

console.log("Created token with value " + token_id);
