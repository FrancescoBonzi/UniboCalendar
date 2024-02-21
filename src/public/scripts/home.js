let dict = {};
let timeout;
let alreadySendCurriculaReq = false;
let alreadySendCoursesReq = false;

function checkFormValidity() {
    var areas = document.getElementById('areas');
    var areasChecked = areas.value;

    var courses = document.getElementById('courses');
    var coursesChecked = courses.value;

    var years = document.getElementById('years');
    var yearsChecked = years.value;

    var curricula = document.getElementById('curricula');
    var curriculaChecked = curricula.value;

    var submitButton = document.getElementById('submit-form-button');
    submitButton.disabled = !(areasChecked !== '' && coursesChecked !== '' && yearsChecked !== '' && curriculaChecked !== '' && curriculaChecked !== 'undefined');
}

function ajaxCallback(xhr, callback) {
    if (xhr.readyState === 4 && xhr.status === 200) {
        if (xhr.responseText) {
            callback(xhr.responseText);
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

function getAreasGivenUni() {
    if (alreadySendCoursesReq || alreadySendCurriculaReq) {
        window.open('/', '_self');
        return;
    }

    // Cleaning Courses, Years and Curricula
    document.getElementById('areas').innerHTML = "";
    document.getElementById('courses').innerHTML = "";
    document.getElementById('years').innerHTML = "";
    document.getElementById('curricula').innerHTML = "";

    // Show loading gif
    document.getElementById('areas').classList.add('custom-select-visible');
    document.getElementById('areas-loading').classList.add('loading-image-visible');

    //sending request for Areas given an Uni
    var xhr = new XMLHttpRequest();
    var list = document.getElementById('unis');
    var uni = list.value;
    var uri = "/get_areas_given_uni?uni=" + uni;
    already_send_courses_req = true;
    ajaxGetRequest(xhr, uri, function (json) {
        var areas = JSON.parse(json);

        // Adding Select Course
        var node = document.createElement("option");
        var text_node = document.createTextNode("--- Seleziona Area ---");
        //node.disabled = true
        node.appendChild(text_node);
        node.setAttribute('value', '');
        document.getElementById('areas').appendChild(node);

        // Setting Courses
        areas.sort((a, b) => {
            return (a.name > b.name ? 1 : -1);
        })
        for (i = 0; i < areas.length; i++) {
            node = document.createElement("option");
            text_node = document.createTextNode(areas[i].name);
            node.appendChild(text_node);
            node.setAttribute('value', areas[i].id);
            document.getElementById('areas').appendChild(node);
        }

        // Hide loading gif
        document.getElementById('areas').classList.remove('custom-select-visible');
        document.getElementById('areas-loading').classList.remove('loading-image-visible');
        document.getElementById('areas').classList.add('custom-select-invisible');
        document.getElementById('areas-loading').classList.add('loading-image-invisible');

        //alreadySendCoursesReq = false;
    });
}

function getCoursesGivenArea() {
    if (alreadySendCoursesReq || alreadySendCurriculaReq) {
        window.open('/', '_self');
        return;
    }

    // Cleaning Courses, Years and Curricula
    document.getElementById('courses').innerHTML = "";
    document.getElementById('years').innerHTML = "";
    document.getElementById('curricula').innerHTML = "";

    // Show loading gif
    document.getElementById('courses').classList.add('custom-select-visible');
    document.getElementById('courses-loading').classList.add('loading-image-visible');

    //sending request for Courses given an Area
    var xhr = new XMLHttpRequest();
    var list = document.getElementById('areas');
    var area = list.value;
    var uni = document.getElementById('unis').value;
    var uri = "/get_courses_given_area?area=" + area + "&uni=" + uni;
    already_send_courses_req = true;
    ajaxGetRequest(xhr, uri, function (json) {
        var courses = JSON.parse(json);

        // Adding Select Course
        var node = document.createElement("option");
        var text_node = document.createTextNode("--- Seleziona Corso ---");
        //node.disabled = true
        node.appendChild(text_node);
        node.setAttribute('value', '');
        document.getElementById('courses').appendChild(node);

        // Setting Courses
        courses.sort((a, b) => {
            return a.name > b.name ? 1 : -1;
        })
        for (i = 0; i < courses.length; i++) {
            node = document.createElement("option");
            let id_pieces = courses[i].id.split('.');
            text_node = document.createTextNode(id_pieces[id_pieces.length - 1] + ' - ' + courses[i].name);
            node.appendChild(text_node);
            dict[courses[i].id] = {
                "description": courses[i].name,
                "duration": courses[i].duration_in_years
            }
            node.setAttribute('value', courses[i].id);
            document.getElementById('courses').appendChild(node);
        }

        // Hide loading gif
        document.getElementById('courses').classList.remove('custom-select-visible');
        document.getElementById('courses-loading').classList.remove('loading-image-visible');
        document.getElementById('courses').classList.add('custom-select-invisible');
        document.getElementById('courses-loading').classList.add('loading-image-invisible');

        alreadySendCoursesReq = false;
    });
}

function getYearsAndCurriculaGivenCourse() {
    if (alreadySendCoursesReq || alreadySendCurriculaReq) {
        window.open('/', '_self');
        return;
    }

    let node, text_node;

    // Setting Duration
    var list = document.getElementById('courses');
    var url = list.value;
    var duration = dict[url]["duration"];

    // Cleaning Years and Curricula
    document.getElementById('years').innerHTML = "";
    document.getElementById('curricula').innerHTML = "";

    // Adding Select Year
    node = document.createElement("option");
    text_node = document.createTextNode("--- Seleziona Anno ---");
    //node.disabled = true
    node.appendChild(text_node);
    node.setAttribute('value', '');
    document.getElementById('years').appendChild(node);

    // Adding Select Curriculum
    node = document.createElement("option");
    text_node = document.createTextNode("--- Seleziona Curriculum ---");
    //node.disabled = true
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
    document.getElementById('curricula').classList.add('custom-select-visible');
    document.getElementById('curricula-loading').classList.add('loading-image-visible');

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
    var params = { "course": url, "uni": document.getElementById("unis").value };
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
                text_node = document.createTextNode(curricula[i].name);
                node.appendChild(text_node);
                node.setAttribute('value', curricula[i].id);
                document.getElementById('curricula').appendChild(node);
            }
            if (curricula.length == 1) {
                var list = document.getElementById('curricula');
                list.options.selectedIndex = 1;
                if (curricula[0].id === undefined) {
                    alert("Siamo spiacenti, ma Unibo non ha reso disponibile l'orario per questo corso di studi.\nNon è possibile continuare...");
                } else {
                    checkFormValidity();
                }
            }
        }

        // Stop Timeout and Hide message
        clearTimeout(timeout);
        document.getElementById('low-connection').style.opacity = 0;

        // Hide loading gif
        document.getElementById('curricula').classList.remove('custom-select-visible');
        document.getElementById('curricula-loading').classList.remove('loading-image-visible');
        document.getElementById('curricula').classList.add('custom-select-invisible');
        document.getElementById('curricula-loading').classList.add('loading-image-invisible');

        alreadySendCurriculaReq = false;
    });
}
