document.addEventListener("DOMContentLoaded", function () {
  const toggleBtn = document.getElementById("toggleBtn");
  const toggleText = document.querySelector(".toggle-text");
  const statusDot = document.querySelector(".status-dot");
  const statusText = document.querySelector(".status-text");
  const activityText = document.querySelector(".activity-text");
  const timerDisplay = document.querySelector(".timer-display");
  const timerValue = document.querySelector(".timer-value");
  const refreshInterval = document.getElementById("refreshInterval");
  const scrollSpeed = document.getElementById("scrollSpeed");
  const speedValue = document.querySelector(".speed-value");
  const customizationPanel = document.getElementById("customizationPanel");
  const panelTitle = customizationPanel.querySelector(".panel-title");
  const closeBtn = customizationPanel.querySelector(".close-btn");
  const customizeBtns = document.querySelectorAll(".customize-btn");
  const presetBtns = document.querySelectorAll(".preset-btn");

  let isRunning = false;
  let currentState = "STOP";
  let startTime = null;
  let timerInterval = null;
  let refreshIntervalId = null;
  let scrollIntervalId = null;
  let lastActivityTime = Date.now();
  const ACTIVITY_TIMEOUT = 5000; // 5 seconds of inactivity before stopping
  let currentCustomization = null;

  // Format time function
  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours
      .toString()
      .padStart(
        2,
        "0"
      )}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  // Update timer display
  function updateTimer() {
    if (!startTime) return;
    const elapsed = Date.now() - startTime;
    timerValue.textContent = formatTime(elapsed);
    timerValue.classList.add("updating");
    setTimeout(() => timerValue.classList.remove("updating"), 500);
  }

  // Start auto-refresh and scroll cycle
  async function startAutoRefresh() {
    const interval = parseInt(refreshInterval.value) * 1000; // Convert to milliseconds
    let cycleStartTime;

    async function runCycle() {
      if (!isRunning) return;
      cycleStartTime = Date.now();

      try {
        // Get active tab
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const activeTab = tabs[0];

        // 1. Reload the page
        await chrome.tabs.reload(activeTab.id);

        // Wait for page to load
        await new Promise((resolve) => {
          const listener = (tabId, changeInfo) => {
            if (tabId === activeTab.id && changeInfo.status === "complete") {
              chrome.tabs.onUpdated.removeListener(listener);
              resolve();
            }
          };
          chrome.tabs.onUpdated.addListener(listener);
        });

        // 2. Wait for specified delay after page load (2 seconds)
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 3. Start scrolling
        const speed = parseInt(scrollSpeed.value);
        let isScrolling = true;
        let lastScrollPosition = 0;
        let stuckCounter = 0;

        // Scroll until we reach the bottom
        while (isScrolling && isRunning) {
          try {
            const response = await new Promise((resolve) => {
              chrome.tabs.sendMessage(
                activeTab.id,
                {
                  action: "scrollToBottom",
                  speed: speed,
                },
                resolve
              );
            });

            if (response) {
              if (
                response.reachedBottom ||
                response.currentPosition === lastScrollPosition
              ) {
                stuckCounter++;
                if (stuckCounter >= 3) {
                  isScrolling = false;
                }
              } else {
                stuckCounter = 0;
              }
              lastScrollPosition = response.currentPosition;
            }

            // Small delay between scroll steps
            await new Promise((resolve) => setTimeout(resolve, 50));
          } catch (error) {
            console.error("Scroll error:", error);
            isScrolling = false;
          }
        }

        // 4. Calculate and wait for the remaining time in the cycle
        const cycleEndTime = Date.now();
        const elapsedTime = cycleEndTime - cycleStartTime;
        const timeToWait = Math.max(0, interval - elapsedTime);

        if (isRunning) {
          await new Promise((resolve) => setTimeout(resolve, timeToWait));
          runCycle(); // Start the next cycle
        }
      } catch (error) {
        console.error("Error in refresh cycle:", error);
        if (isRunning) {
          setTimeout(runCycle, 5000); // Retry after 5 seconds if there's an error
        }
      }
    }

    // Start the first cycle
    runCycle();
  }

  // Stop all intervals
  function stopAllIntervals() {
    isRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // Check for human activity
  function checkHumanActivity() {
    const currentTime = Date.now();
    if (currentTime - lastActivityTime > ACTIVITY_TIMEOUT) {
      handleStateChange("STOP");
      activityText.textContent = "Human activity detected - Stopped";
      activityText.style.color = "var(--danger-color)";
    }
  }

  // Update activity timestamp
  function updateActivityTime() {
    lastActivityTime = Date.now();
    if (isRunning) {
      activityText.textContent = "Human activity detected";
      activityText.style.color = "var(--success-color)";
    }
  }

  // Add activity listeners
  ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((event) => {
    document.addEventListener(event, updateActivityTime);
  });

  function startMonitoring() {
    isRunning = true;
    currentState = "START";
    startTime = Date.now(); // Reset timer on start
    timerInterval = setInterval(updateTimer, 1000);

    // Start auto-refresh (which now includes scrolling)
    startAutoRefresh();

    toggleBtn.classList.add("active");
    toggleText.textContent = "Stop";
    statusDot.classList.add("active");
    statusText.textContent = "Running";
    activityText.textContent = "Monitoring for human activity...";
    activityText.style.color = "var(--secondary-color)";

    // Show timer with active state
    timerDisplay.classList.add("active");
    timerValue.classList.remove("stopped");

    chrome.runtime.sendMessage({ action: "startMonitoring" });
  }

  function stopMonitoring() {
    isRunning = false;
    currentState = "STOP";
    stopAllIntervals();
    startTime = null;

    toggleBtn.classList.remove("active");
    toggleText.textContent = "Start";
    statusDot.classList.remove("active");
    statusText.textContent = "Ready";
    activityText.textContent = "No human activity detected";
    activityText.style.color = "var(--secondary-color)";

    // Keep timer visible but show stopped state
    timerValue.classList.add("stopped");

    chrome.runtime.sendMessage({ action: "stopMonitoring" });
  }

  // Toggle button click handler
  toggleBtn.addEventListener("click", function () {
    switch (currentState) {
      case "STOP":
        handleStateChange("START");
        break;
      case "START":
        handleStateChange("STOP");
        break;
      default:
        console.error("Invalid state:", currentState);
        break;
    }
  });

  function handleStateChange(newState) {
    switch (newState) {
      case "START":
        isRunning = true;
        currentState = "START";
        startTime = Date.now();
        timerInterval = setInterval(updateTimer, 1000);

        // Start auto-refresh cycle
        startAutoRefresh();

        toggleBtn.classList.add("active");
        toggleText.textContent = "Stop";
        statusDot.classList.add("active");
        statusText.textContent = "Running";
        activityText.textContent = "Monitoring for human activity...";
        activityText.style.color = "var(--secondary-color)";

        timerDisplay.classList.add("active");
        timerValue.classList.remove("stopped");

        chrome.runtime.sendMessage({ action: "startMonitoring" });
        break;

      case "STOP":
        isRunning = false;
        currentState = "STOP";
        stopAllIntervals();
        startTime = null;

        toggleBtn.classList.remove("active");
        toggleText.textContent = "Start";
        statusDot.classList.remove("active");
        statusText.textContent = "Ready";
        activityText.textContent = "No human activity detected";
        activityText.style.color = "var(--secondary-color)";

        timerValue.classList.add("stopped");

        chrome.runtime.sendMessage({ action: "stopMonitoring" });
        break;

      default:
        console.error("Invalid state transition:", newState);
        break;
    }
  }

  // Customization Panel Functions
  function showCustomizationPanel(type) {
    currentCustomization = type;
    panelTitle.textContent =
      type === "refresh" ? "Refresh Interval" : "Scroll Speed";
    customizationPanel.style.display = "flex";
  }

  function hideCustomizationPanel() {
    customizationPanel.style.display = "none";
    currentCustomization = null;
  }

  customizeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      showCustomizationPanel(btn.dataset.action);
    });
  });

  closeBtn.addEventListener("click", hideCustomizationPanel);

  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = parseInt(btn.dataset.value);
      if (currentCustomization === "refresh") {
        refreshInterval.value = value;
      } else if (currentCustomization === "scroll") {
        scrollSpeed.value = value;
      }
      saveSettings();
      hideCustomizationPanel();
    });
  });

  // Update speed value display
  scrollSpeed.addEventListener("input", function () {
    speedValue.textContent = this.value;
  });

  // Save settings to storage
  function saveSettings() {
    const settings = {
      refreshInterval: refreshInterval.value,
      scrollSpeed: scrollSpeed.value,
    };
    chrome.storage.sync.set({ settings });
  }

  // Load saved settings
  chrome.storage.sync.get(
    ["refreshInterval", "scrollSpeed"],
    function (result) {
      if (result.refreshInterval) {
        refreshInterval.value = result.refreshInterval;
      }
      if (result.scrollSpeed) {
        scrollSpeed.value = result.scrollSpeed;
        speedValue.textContent = result.scrollSpeed;
      }
    }
  );

  // Update settings handlers
  refreshInterval.addEventListener("change", function () {
    const newInterval = parseInt(this.value);
    if (newInterval < 1) {
      this.value = 1;
      return;
    }
    chrome.storage.sync.set({ refreshInterval: this.value });
    if (isRunning) {
      stopAllIntervals();
      handleStateChange("START");
    }
  });

  scrollSpeed.addEventListener("change", function () {
    const newSpeed = parseInt(this.value);
    if (newSpeed < 1) {
      this.value = 1;
      return;
    }
    chrome.storage.sync.set({ scrollSpeed: this.value });
  });

  // Validate refresh interval input
  refreshInterval.addEventListener("input", () => {
    const value = parseInt(refreshInterval.value);
    if (value < 1) {
      refreshInterval.value = 1;
    }
  });

  // Close panel when clicking outside
  customizationPanel.addEventListener("click", (e) => {
    if (e.target === customizationPanel) {
      hideCustomizationPanel();
    }
  });
});
