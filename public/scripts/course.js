var select = false;
function selectOrDeselectAll() {
    var lectures = document.getElementsByName("lectures");
    for(var lecture of lectures) {
        lecture.checked = select;
    }
    select = !select;
    if(select)
        document.getElementById("select_or_deselect_all").innerHTML = "Seleziona tutti";
    else
        document.getElementById("select_or_deselect_all").innerHTML = "Deseleziona tutti";
}