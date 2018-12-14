

getStat = function (selected) {
    chrome.windows.create({'url': 'popup.html?iata='+selected.selectionText.trim().substr(-3).toUpperCase(), 'type': 'popup', 'width': 400, 'height': 500}, function(window) {
    });
};

chrome.contextMenus.create({
    title: "Get flights list",
    contexts: ["selection"],  
    onclick: getStat
   });
