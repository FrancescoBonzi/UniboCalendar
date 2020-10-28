function copy() {
    var copyText = document.getElementById("url");
    copyText.select(); 
    copyText.setSelectionRange(0, 99999); // For mobile devices
    document.execCommand("copy"); // Copy the text inside the field
  }