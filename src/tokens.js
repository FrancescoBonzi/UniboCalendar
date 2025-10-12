import { generateId } from "./model.js";
import { dbRun } from "./db.js";

async function createToken() {
    try {
        let token_id = generateId(23);
        let token_desc = "Created on " + new Date();

        await dbRun("INSERT INTO token VALUES(?, ?)", [token_id, token_desc]);
        console.log("Created token with value " + token_id);
    } catch (error) {
        console.error("Error creating token:", error);
        process.exit(1);
    }
}

createToken();
