document.addEventListener("DOMContentLoaded", () => {
    const studyModeToggle = document.getElementById("studyModeToggle");
    const adBlockToggle = document.getElementById("adBlockToggle");
    const ytCommentsToggle = document.getElementById("ytCommentsToggle");
    const ytShortsToggle = document.getElementById("ytShortsToggle");
    const ytCleanWatchToggle = document.getElementById("ytCleanWatchToggle");
    const siteBlockToggle = document.getElementById("siteBlockToggle");
    const statusBadge = document.getElementById("status-badge");

    const addSiteForm = document.getElementById("addSiteForm");
    const siteInput = document.getElementById("siteInput");
    const siteList = document.getElementById("siteList");
    const passStatus = document.getElementById("passStatus");

    const focusPhaseBtn = document.getElementById("focusPhaseBtn");
    const breakPhaseBtn = document.getElementById("breakPhaseBtn");
    const timerDisplay = document.getElementById("timerDisplay");
    const startTimerBtn = document.getElementById("startTimerBtn");
    const resetTimerBtn = document.getElementById("resetTimerBtn");

    const streakCount = document.getElementById("streakCount");
    const focusMinutes = document.getElementById("focusMinutes");
    const blockedCount = document.getElementById("blockedCount");

    let uiTicker = null;
    let currentState = {
        timerRunning: false,
        timerEndTime: null,
        timerRemaining: 25 * 60,
        timerPhase: "focus",
        blockedSites: ["instagram.com", "tiktok.com", "reddit.com", "x.com"]
    };

    function formatTime(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    function renderTimer() {
        let secs = currentState.timerRemaining;
        if (currentState.timerRunning && currentState.timerEndTime) {
            secs = Math.max(0, Math.ceil((currentState.timerEndTime - Date.now()) / 1000));
        }
        timerDisplay.textContent = formatTime(secs);
        startTimerBtn.textContent = currentState.timerRunning
            ? "Pause"
            : currentState.timerPhase === "break"
                ? "Start Break"
                : "Start Focus";

        focusPhaseBtn.classList.toggle("active", currentState.timerPhase === "focus");
        breakPhaseBtn.classList.toggle("active", currentState.timerPhase === "break");
    }

    function renderSites(sites) {
        siteList.innerHTML = "";
        sites.forEach((domain) => {
            const item = document.createElement("div");
            item.className = "site-item";

            const label = document.createElement("span");
            label.textContent = domain;

            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "site-remove";
            removeBtn.textContent = "Remove";
            removeBtn.addEventListener("click", () => {
                const updated = currentState.blockedSites.filter((d) => d !== domain);
                currentState.blockedSites = updated;
                chrome.storage.local.set({ blockedSites: updated });
                renderSites(updated);
            });

            item.appendChild(label);
            item.appendChild(removeBtn);
            siteList.appendChild(item);
        });
    }

    function syncUI() {
        chrome.storage.local.get(
            [
                "studyMode",
                "adBlock",
                "ytComments",
                "ytShorts",
                "ytCleanWatch",
                "siteBlockEnabled",
                "blockedSites",
                "emergencyPassUntil",
                "studyStreak",
                "focusMinutesToday",
                "distractionsBlocked",
                "timerPhase",
                "timerRunning",
                "timerEndTime",
                "timerRemaining"
            ],
            (data) => {
                const isOn = Boolean(data.studyMode);
                studyModeToggle.checked = isOn;
                adBlockToggle.checked = data.adBlock !== false;
                ytCommentsToggle.checked = data.ytComments !== false;
                ytShortsToggle.checked = data.ytShorts !== false;
                ytCleanWatchToggle.checked = data.ytCleanWatch !== false;
                siteBlockToggle.checked = data.siteBlockEnabled !== false;

                statusBadge.textContent = isOn ? "ON" : "OFF";
                statusBadge.classList.toggle("on", isOn);
                statusBadge.classList.toggle("off", !isOn);

                const streak = data.studyStreak || 1;
                streakCount.textContent = `${streak} ${streak === 1 ? "Day" : "Days"}`;
                focusMinutes.textContent = `${data.focusMinutesToday || 0}m`;
                blockedCount.textContent = String(data.distractionsBlocked || 0);

                passStatus.hidden = !(data.emergencyPassUntil && Date.now() < data.emergencyPassUntil);

                currentState = {
                    timerRunning: Boolean(data.timerRunning),
                    timerEndTime: data.timerEndTime || null,
                    timerRemaining: typeof data.timerRemaining === "number" ? data.timerRemaining : 25 * 60,
                    timerPhase: data.timerPhase || "focus",
                    blockedSites: Array.isArray(data.blockedSites)
                        ? data.blockedSites
                        : ["instagram.com", "tiktok.com", "reddit.com", "x.com"]
                };

                renderSites(currentState.blockedSites);
                renderTimer();
            }
        );
    }

    syncUI();
    uiTicker = setInterval(renderTimer, 500);
    window.addEventListener("unload", () => clearInterval(uiTicker));

    chrome.storage.onChanged.addListener((_changes, namespace) => {
        if (namespace === "local") syncUI();
    });

    studyModeToggle.addEventListener("change", () => {
        chrome.storage.local.set({ studyMode: studyModeToggle.checked });
    });
    adBlockToggle.addEventListener("change", () => {
        chrome.storage.local.set({ adBlock: adBlockToggle.checked });
    });
    ytCommentsToggle.addEventListener("change", () => {
        chrome.storage.local.set({ ytComments: ytCommentsToggle.checked });
    });
    ytShortsToggle.addEventListener("change", () => {
        chrome.storage.local.set({ ytShorts: ytShortsToggle.checked });
    });
    ytCleanWatchToggle.addEventListener("change", () => {
        chrome.storage.local.set({ ytCleanWatch: ytCleanWatchToggle.checked });
    });
    siteBlockToggle.addEventListener("change", () => {
        chrome.storage.local.set({ siteBlockEnabled: siteBlockToggle.checked });
    });

    addSiteForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const cleaned = siteInput.value
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, "")
            .replace(/^www\./, "")
            .split("/")[0];
        if (!cleaned || currentState.blockedSites.includes(cleaned)) {
            siteInput.value = "";
            return;
        }
        const updated = [...currentState.blockedSites, cleaned];
        currentState.blockedSites = updated;
        chrome.storage.local.set({ blockedSites: updated });
        siteInput.value = "";
        renderSites(updated);
    });

    focusPhaseBtn.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "RESET_TIMER", phase: "focus" }, syncUI);
    });

    breakPhaseBtn.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "RESET_TIMER", phase: "break" }, syncUI);
    });

    startTimerBtn.addEventListener("click", () => {
        if (currentState.timerRunning) {
            chrome.runtime.sendMessage({ type: "PAUSE_TIMER" }, syncUI);
        } else {
            chrome.runtime.sendMessage(
                { type: "START_TIMER", seconds: currentState.timerRemaining },
                syncUI
            );
        }
    });

    resetTimerBtn.addEventListener("click", () => {
        chrome.runtime.sendMessage(
            { type: "RESET_TIMER", phase: currentState.timerPhase },
            syncUI
        );
    });
});