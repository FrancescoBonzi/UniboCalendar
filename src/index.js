import express, { json, urlencoded } from "express"
import "express-handlebars"
import * as hbs from "express-handlebars"
import { router } from "./controller.js"
import { checkForOpendataUpdates } from "./update_opendata.js"
import { __dirname } from "./utils.js"
import { initDatabase, validateTokenMiddleware } from "./db.js"

var app = express();

//set up port
app.set("port", process.env.PORT || 3002);

//set up bind addr
app.set("bind-addr", process.env.BIND_ADDR || "localhost");

//set up static folder
app.use(express.static(__dirname + "/public"));
app.get("/data.db", validateTokenMiddleware, express.static(__dirname + "/logs"));

//set body-parser to read post request data
app.use(json());
app.use(urlencoded({ extended: true }));

//set up router
app.use("/", router);

//set up handlebars
app.engine("handlebars", hbs.engine());
app.set("view engine", "handlebars");

// Update opendata on launch
checkForOpendataUpdates();

// Initialize database tables and indexes
async function initializeApp() {
    try {
        await initDatabase();
        console.log("Database initialized successfully");
        
        // Start server
        app.listen(app.get("port"), app.get("bind-addr"), () => {
            console.log(`UniboClendar started on http://${app.get("bind-addr")}:${app.get("port")}`);
        });
    } catch (error) {
        console.error("Failed to initialize database:", error);
        process.exit(1);
    }
}

// Initialize the application
initializeApp();
