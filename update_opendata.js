const cheerio = require('cheerio');
const fetch = require('node-fetch');
const fs = require('fs');

const root_unibo = 'https://dati.unibo.it/dataset/degree-programmes/';
var data_file = './opendata/corsi.csv';
var version_file = './opendata/version.json';

function checkIfOpendataFileIsUpToDate(callback) {
    fetch(root_unibo).then(x => x.text())
        .then(function (html) {
            var $ = cheerio.load(html);
            const relative_path = $('#dataset-resources ul li a').filter('.heading').first().attr('href');
            console.log('relative_path = ' + relative_path);
            latest_version = relative_path.split('/')[relative_path.split('/').length - 1];
            // Check if the file exists in the current directory.
            var up_to_date = false;
            fs.readFile(version_file, (err, json) => {
                var version = JSON.parse(json);
                if (!err && version.name == latest_version) {
                    up_to_date = true;
                }
                callback(latest_version, up_to_date);
            });
        })
        .catch(function (err) {
            console.log(err);
            return;
        });
}

function downloadUpToDateOpendataFile(latest_version, callback) {
    var path_to_download_csv = root_unibo + 'resource/' + latest_version + '/download/' + latest_version + '.csv';
    console.log(path_to_download_csv);
    fetch(path_to_download_csv).then(x => x.text())
        .then(function (csv) {
            //Saving file in opendata folder
            fs.writeFile(data_file, csv, function (err) {
                if (err) {
                    console.log(err);
                    return;
                };
                json = JSON.stringify({"name":latest_version+".csv"});
                fs.writeFile(version_file, json, function (err) {
                    if (err) {
                        console.log(err);
                        return;
                    };
                    callback(true);
                });
            });
        })
        .catch(function (err) {
            console.log(err);
            console.log('Fail to download ' + latest_version + ' from: ' + path);
            return;
        });
}

function checkForOpendataUpdates() {
    checkIfOpendataFileIsUpToDate(function (latest_version, up_to_date) {
        if (!up_to_date) {
            downloadUpToDateOpendataFile(latest_version, function (downloaded_and_saved) {
                if (!downloaded_and_saved) {
                    console.log('Error in downloading and saving of opendata file in opendata folder.');
                    return;
                } else {
                    console.log('New opendata saved in ' + data_file + '.');
                }
            });
        }
    });
}

module.exports.checkForOpendataUpdates = checkForOpendataUpdates;