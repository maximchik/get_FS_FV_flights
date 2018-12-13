

getStat = function (selected) {
    chrome.windows.create({'url': 'popup.html?iata='+selected.selectionText.trim(), 'type': 'popup', 'width': 300, 'height': 500}, function(window) {
    });
};

chrome.contextMenus.create({
    title: "Get stat from FS.",
    contexts: ["selection"],  
    onclick: getStat
   });
