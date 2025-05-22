// == ReScent Extension Content Script ==

let refreshIntervalId = null;
let isActive = false;
let lastActivityTimestamp = Date.now();
let activityCleanup = null;
let mouseActivityTimeoutId = null;
let continuousScrollTimeoutId = null;

const INACTIVITY_THRESHOLD_MS = 30_000; // 30 seconds
const MOUSE_SENSITIVITY_DELAY_MS = 10_000; // 10 seconds

// Stop conditions array
const stopConditions = [
  // Inactivity
  () => Date.now() - lastActivityTimestamp > INACTIVITY_THRESHOLD_MS,
  // 'q' key pressed (case-insensitive)
  () => stopByQKeyPressed,
];

let stopByQKeyPressed = false;

// Ensure only one automation instance runs at a time
if (window.__reScentAutomationStarted) {
  stopAutomation();
}
window.__reScentAutomationStarted = true;

// Initialize extension state from storage
chrome.storage.local.get(
  ["isActive", "refreshTime", "scrollSpeed", "continuousScroll"],
  (settings) => {
    if (settings.isActive) {
      startAutomation(settings);
    }
  }
);

// User activity monitoring
function monitorUserActivity() {
  const activityEvents = [
    "mousemove",
    "keydown",
    "mousedown",
    "touchstart",
    "scroll",
  ];

  function recordActivity(e) {
    // If 'q' key pressed (case-insensitive), set stop flag
    if (e && e.type === "keydown" && e.key && e.key.toLowerCase() === "q") {
      stopByQKeyPressed = true;
      stopAutomation();
      return;
    }
    clearTimeout(mouseActivityTimeoutId);
    mouseActivityTimeoutId = setTimeout(() => {
      lastActivityTimestamp = Date.now();
    }, MOUSE_SENSITIVITY_DELAY_MS);
  }

  activityEvents.forEach((event) =>
    document.addEventListener(event, recordActivity, { passive: true })
  );

  return () => {
    activityEvents.forEach((event) =>
      document.removeEventListener(event, recordActivity)
    );
    clearTimeout(mouseActivityTimeoutId);
  };
}

// Smooth scroll helpers
function smoothScroll(targetY, duration = 300) {
  return new Promise((resolve) => {
    const startY = window.scrollY;
    const distance = targetY - startY;
    const startTime = performance.now();

    function animateScroll(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + distance * progress);

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(animateScroll);
  });
}

function scrollToBottom() {
  const targetY = document.documentElement.scrollHeight - window.innerHeight;
  return smoothScroll(targetY);
}

function scrollToTop() {
  return smoothScroll(0);
}

// Continuous scroll automation (no while loop)
function continuousScrollStep() {
  if (!isActive) return;

  if (shouldStopAutomation()) {
    notifyInactivity();
    continuousScrollTimeoutId = setTimeout(continuousScrollStep, 5000);
    return;
  }

  scrollToBottom()
    .then(() => delay(1000))
    .then(() => scrollToTop())
    .then(() => delay(1000))
    .then(() => {
      if (isActive) {
        continuousScrollTimeoutId = setTimeout(continuousScrollStep, 0);
      }
    })
    .catch(console.error);
}

// Refresh automation
function setupRefreshCycle(refreshTimeSec) {
  clearInterval(refreshIntervalId);
  refreshIntervalId = setInterval(() => {
    if (shouldStopAutomation()) {
      notifyInactivity();
      return;
    }
    location.reload();
  }, refreshTimeSec * 1000);
}

// Utility functions
function shouldStopAutomation() {
  return stopConditions.some((cond) => cond());
}

function notifyInactivity() {
  chrome.runtime.sendMessage({ action: "humanActivity" });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start/Stop automation
function startAutomation(settings) {
  stopAutomation();

  isActive = true;
  stopByQKeyPressed = false;
  lastActivityTimestamp = Date.now();
  chrome.storage.local.set({ isActive: true });

  activityCleanup = monitorUserActivity();

  if (settings.refreshTime > 0) {
    setupRefreshCycle(settings.refreshTime);
  }

  if (settings.continuousScroll) {
    continuousScrollStep();
  } else {
    setTimeout(() => scrollToBottom().catch(console.error), 2000);
  }
}

function stopAutomation() {
  isActive = false;
  clearInterval(refreshIntervalId);
  clearTimeout(continuousScrollTimeoutId);
  if (activityCleanup) activityCleanup();
  clearTimeout(mouseActivityTimeoutId);
  chrome.storage.local.set({ isActive: false });
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    switch (request.action) {
      case "start":
        startAutomation(request.settings);
        sendResponse({ success: true });
        break;
      case "stop":
        stopAutomation();
        sendResponse({ success: true });
        break;
      case "status":
        sendResponse({
          isActive,
          lastActivity: new Date(lastActivityTimestamp).toLocaleTimeString(),
          inactiveSeconds: (Date.now() - lastActivityTimestamp) / 1000,
        });
        break;
      case "scrollToBottom":
        const speed = request.speed || 5;
        const maxScroll =
          Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight
          ) - window.innerHeight;

        // Check if already at bottom
        if (window.scrollY >= maxScroll) {
          sendResponse({
            reachedBottom: true,
            currentPosition: window.scrollY,
          });
          return true;
        }

        // Start scrolling
        scrollToPosition(maxScroll, speed)
          .then((result) => sendResponse(result))
          .catch((error) => sendResponse({ error: error.message }));

        return true; // Keep message channel open
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
  return true;
});

// The extension remains active in background (no pause on blur/visibilitychange)

function smoothScrollToPosition(targetY, speed = 5) {
  return new Promise((resolve) => {
    const currentY = window.scrollY;
    const distance = targetY - currentY;
    const duration = Math.abs(distance) / (speed * 20);
    const startTime = performance.now();

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      window.scrollTo(0, currentY + distance * progress);

      if (progress < 1 && isActive) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
}

async function scrollToPosition(position, speed) {
  await smoothScrollToPosition(position, speed);
  return {
    currentPosition: window.scrollY,
    reachedBottom: window.scrollY >= position,
  };
}
