chrome.action.onClicked.addListener((tab) => {
    if (tab.url && tab.url.includes("instagram.com")) {
        chrome.tabs.sendMessage(tab.id, { action: "DOWNLOAD_MEDIA" }).catch(() => {
            // Content script not ready or error
            console.log("Error sending message to tab");
        });
    }
});
