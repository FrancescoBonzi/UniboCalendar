function toggle() {
  let collapse = document.getElementById("alertCollapse");
  if (collapse.classList.contains("show")) {
    collapse.classList.remove("show");
  } else {
    collapse.classList.add("show");
  }
}
function updateLinks(input) {
  let secs = (parseInt(input.value) | 0) * 60;
  let qry = "&alert=" + secs.toString();
  if (secs == 0) {
    qry = "";
  }
  let links = document.getElementById("links").getElementsByTagName("a");
  for (var i = 0; i < links.length; i++) {
    let thisQuery = qry;
    let startsWith = "&";
    if (links[i].href.startsWith("http")) {
      console.log(links[i].href);
      thisQuery = encodeURIComponent(thisQuery);
      startsWith = encodeURIComponent(startsWith);
    }
    links[i].href = links[i].href.split(startsWith)[0] + thisQuery;
  }
}
