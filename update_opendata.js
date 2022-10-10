import * as cheerio from "cheerio";
import fetch from "node-fetch";
import * as fs from "fs/promises";

const ROOT_UNIBO = "https://dati.unibo.it/dataset/degree-programmes/";
const DATA_FILE = "./opendata/corsi.csv";
const VERSION_FILE = "./opendata/version.json";

async function checkIfOpendataFileIsUpToDate() {
    let html = await fetch(ROOT_UNIBO).then(x => x.text()).catch(function (err) {
        console.log(err);
        return null;
    });

    var $ = cheerio.load(html);
    const relative_path = $("#dataset-resources ul li a").filter(".heading").first().attr("href");
    let latest_version = relative_path.split("/")[relative_path.split("/").length - 1];
    // Check if the file exists in the current directory.
    var up_to_date = false;
    if (!await fs.stat(VERSION_FILE).then((_) => true).catch((_) => false)) {
        return [latest_version, up_to_date];
    }
    let json = await fs.readFile(VERSION_FILE).catch((_) => false);
    let err = json === false;
    if (!err) {
        let version = JSON.parse(json);
        if (version.name == latest_version) {
            up_to_date = true;
        }
    }
    return [latest_version, up_to_date];
}

async function downloadUpToDateOpendataFile(latest_version) {
    var path_to_download_csv = ROOT_UNIBO + "resource/" + latest_version + "/download/" + latest_version + ".csv";
    console.log(path_to_download_csv);
    let csv = await fetch(path_to_download_csv).then(x => x.text()).catch(function (err) {
        console.log(err);
        console.log("Failed to download " + latest_version + " from: " + path);
        return false;
    });
    if (csv === false) {
        console.log("Corrupted csv");
        return false;
    }
    //Saving file in opendata folder
    let res = await fs.writeFile(DATA_FILE, csv).catch((err) => {
        console.log(err);
        return false;
    }).then((_) => true);
    if (!res) { return false; }
    let json = JSON.stringify({ "name": latest_version + ".csv" });
    return await fs.writeFile(VERSION_FILE, json)
        .catch((_) => false)
        .then((x) => true);
}

export async function checkForOpendataUpdates() {
    let response = await checkIfOpendataFileIsUpToDate();
    let latest_version = response[0];
    let up_to_date = response[1];
    if (!up_to_date) {
        let downloaded_and_saved = await downloadUpToDateOpendataFile(latest_version);
        if (!downloaded_and_saved) {
            console.log("Error in downloading and saving of opendata file in opendata folder.");
            return;
        } else {
            console.log("New opendata saved in " + DATA_FILE + ".");
        }
    }
}
