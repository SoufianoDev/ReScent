let isRunning = false;

// Handle notifications
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "humanActivity") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "ReScent Paused",
      message:
        "Human activity detected or stop condition met. Auto-refresh and scrolling have been paused.",
    });
  }
  return true;
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "startMonitoring":
      isRunning = true;
      break;
    case "stopMonitoring":
      isRunning = false;
      break;
  }
  return true;
});

// Keep extension alive by sending periodic heartbeats
setInterval(() => {
  if (isRunning) {
    chrome.runtime.getPlatformInfo(() => {
      // This empty callback keeps the background script active
    });
  }
}, 25000); // Send heartbeat every 25 seconds

// Keep running even if service worker gets suspended
chrome.runtime.onSuspend.addListener(() => {
  if (isRunning) {
    // Attempt to prevent suspension
    chrome.runtime.getPlatformInfo(() => {});
  }
});

// Initialize extension icon
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setIcon({
    path: {
      16: "icons/icon16.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },
  });
});
