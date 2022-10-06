let dict = {};
let timeout;
let already_send_curricula_req = false;
let already_send_courses_req = false;

function checkFormValidity() {
    var areas = document.getElementById('areas');
    var areas_checked = areas.options[areas.selectedIndex].value;

    var courses = document.getElementById('courses');
    var courses_checked = courses.options[courses.selectedIndex].value;

    var years = document.getElementById('years');
    var years_checked = years.options[years.selectedIndex].value;

    var curricula = document.getElementById('curricula');
    var curricula_checked = curricula.options[curricula.selectedIndex].value;

    if (areas_checked != '' && courses_checked != '' && years_checked != '' && curricula_checked != '' && curricula_checked != 'undefined') {
        document.getElementById('submit-form-button').disabled = false;
    } else {
        document.getElementById('submit-form-button').disabled = true;
    }
}

function ajaxCallback(xhr, callback) {
    //check state
    if (xhr.readyState === 2) {
        // theElement.innerHTML = "send request...";
    }
    else if (xhr.readyState === 3) {
        // theElement.innerHTML = "receiving response...";
    }
    else if (xhr.readyState === 4) {
        //check server response
        if (xhr.status === 200) {
            //success
            if (xhr.responseText) {
                callback(xhr.responseText);
            }
        }
    }
}

function ajaxGetRequest(xhr, uri, callback) {
    xhr.onreadystatechange = function () {
        ajaxCallback(xhr, callback);
    };
    xhr.open('get', uri, true);
    xhr.send();
}

function ajaxPostRequest(xhr, uri, params, callback) {
    xhr.onreadystatechange = function () {
        ajaxCallback(xhr, callback);
    };
    xhr.open('post', uri, true);
    xhr.setRequestHeader("Content-type", "application/json");
    var json = JSON.stringify(params);
    xhr.send(json);
}

function getCoursesGivenArea() {

    if(already_send_courses_req || already_send_curricula_req) {
        window.open('/', '_self');
        return;
    }

    // Cleaning Courses, Years and Curricula
    document.getElementById('courses').innerHTML = "";
    document.getElementById('years').innerHTML = "";
    document.getElementById('curricula').innerHTML = "";

    // Show loading gif
    var height = getComputedStyle(document.getElementById('courses')).height;
    var width = getComputedStyle(document.getElementById('years')).width; // I take the value of a field that never changes
    var margin_left_loader = eval(height.split('px')[0] / 6);
    var new_width = eval(width.split('px')[0] - height.split('px')[0] - margin_left_loader);
    document.getElementById('courses').style = 'width: ' + new_width + 'px; float: left;';
    document.getElementById('courses-loading').style = 'opacity: 1; margin-left: ' + margin_left_loader + 'px; left: ' + new_width + 'px;';

    //sending request for Courses given an Area
    var xhr = new XMLHttpRequest();
    var list = document.getElementById('areas');
    var area = list.options[list.selectedIndex].value;
    var uri = "/get_courses_given_area?area=" + area;
    already_send_courses_req = true;
    ajaxGetRequest(xhr, uri, function (json) {
        var courses = JSON.parse(json);

        // Adding Select Course
        var node = document.createElement("option");
        var text_node = document.createTextNode("--- Seleziona Corso ---");
        node.appendChild(text_node);
        node.setAttribute('value', '');
        document.getElementById('courses').appendChild(node);

        // Setting Courses
        courses.sort((a, b) => {
            return a.type === b.type ? (a.description > b.description ? 1 : -1) : (a.type > b.type ? 1 : -1);
        })
        for (i = 0; i < courses.length; i++) {
            node = document.createElement("option");
            text_node = document.createTextNode(courses[i].code + ' - ' + courses[i].description + ' - ' + courses[i].type);
            node.appendChild(text_node);
            dict[courses[i].url] = {
                "description": courses[i].description + ' - ' + courses[i].type,
                "duration": courses[i].duration
            }
            node.setAttribute('value', courses[i].url);
            document.getElementById('courses').appendChild(node);
        }

        // Hide loading gif
        document.getElementById('courses').style = 'width: 100%;';
        document.getElementById('courses-loading').style = 'opacity: 1';

        already_send_courses_req = false;
    });
}

function getYearsAndCurriculaGivenCourse() {

    if(already_send_courses_req || already_send_curricula_req) {
        window.open('/', '_self');
        return;
    }

    let node, text_node;

    // Setting Duration
    var list = document.getElementById('courses');
    var url = list.options[list.selectedIndex].value;
    var duration = dict[url]["duration"];

    // Cleaning Years and Curricula
    document.getElementById('years').innerHTML = "";
    document.getElementById('curricula').innerHTML = "";

    // Adding Select Year
    node = document.createElement("option");
    text_node = document.createTextNode("--- Seleziona Anno ---");
    node.appendChild(text_node);
    node.setAttribute('value', '');
    document.getElementById('years').appendChild(node);

    // Adding Select Curriculum
    node = document.createElement("option");
    text_node = document.createTextNode("--- Seleziona Curriculum ---");
    node.appendChild(text_node);
    node.setAttribute('value', '');
    document.getElementById('curricula').appendChild(node);

    // Setting Years
    for (i = 0; i < duration; i++) {
        node = document.createElement("option");
        text_node = document.createTextNode(i + 1);
        node.appendChild(text_node);
        node.setAttribute('value', i + 1);
        document.getElementById('years').appendChild(node);
    }

    // Show loading gif
    var height = getComputedStyle(document.getElementById('curricula')).height;
    var width = getComputedStyle(document.getElementById('years')).width;  // I take the value of a field that never changes
    var margin_left_loader = eval(height.split('px')[0] / 6);
    var new_width = eval(width.split('px')[0] - height.split('px')[0] - margin_left_loader);
    document.getElementById('curricula').style = 'width: ' + new_width + 'px; float: left;';
    document.getElementById('curricula-loading').style = 'opacity: 1; margin-left: ' + margin_left_loader + 'px; left: ' + new_width + 'px;';

    // Start Timeout for Low Internet Connection
    timeout = setTimeout(function () {
        document.getElementById('low-connection').style = 'opacity: 1;';
        var n = 0;
        interval = setInterval(function () {
            var message = 'Connessione debole';
            for (i = 0; i < n; i++) {
                message += '.';
            }
            document.getElementById('low-connection').innerHTML = message;
            n = (n + 1) % 4;
        }, 500);
    }, 5000);

    // Sending request for Curricula
    var xhr = new XMLHttpRequest();
    var uri = "/get_curricula_given_course";
    var params = { "url": url };
    already_send_curricula_req = true;
    ajaxPostRequest(xhr, uri, params, function (curricula) {
        curricula = JSON.parse(curricula);

        // Setting Curricula
        if (curricula === undefined || curricula === '') {
            node = document.createElement("option");
            text_node = document.createTextNode("-");
            node.appendChild(text_node);
            document.getElementById('curricula').appendChild(node);
        } else {
            for (i = 0; i < curricula.length; i++) {
                node = document.createElement("option");
                text_node = document.createTextNode(curricula[i].label);
                node.appendChild(text_node);
                node.setAttribute('value', curricula[i].value);
                document.getElementById('curricula').appendChild(node);
            }
            if (curricula.length == 1) {
                var list = document.getElementById('curricula');
                list.options.selectedIndex = 1;
                if (curricula[0].value === undefined) {
                    alert("Siamo spiacenti, ma Unibo non ha reso disponibile l'orario per questo corso di studi.\nNon è possibile continuare...");
                } else {
                    checkFormValidity();
                }
            }
        }

        // Stop Timeout and Hide message
        clearTimeout(timeout);
        document.getElementById('low-connection').style = 'opacity: 0;';

        // Hide loading gif
        document.getElementById('curricula').style = 'width: 100%;';
        document.getElementById('curricula-loading').style = 'opacity: 0;';

        already_send_curricula_req = false;
    });
}
