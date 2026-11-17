const FOCUS_MINUTES = 25;
const BREAK_MINUTES = 5;
const TIMER_ALARM = "studyShieldTimerEnd";
const BADGE_ALARM = "studyShieldBadgeTick";
const PASS_ALARM = "studyShieldEmergencyPassEnd";

const DEFAULT_SETTINGS = {
    studyMode: false,
    adBlock: true,
    ytComments: true,
    ytShorts: true,
    ytCleanWatch: true,
    siteBlockEnabled: true,
    blockedSites: ["instagram.com", "tiktok.com", "reddit.com", "x.com"],
    emergencyPassUntil: 0,
    studyStreak: 1,
    focusMinutesToday: 0,
    distractionsBlocked: 0,
    timerPhase: "focus",
    timerRunning: false,
    timerEndTime: null,
    timerRemaining: FOCUS_MINUTES * 60
};

async function syncStaticAdRules(enable) {
    try {
        if (enable) {
            await chrome.declarativeNetRequest.updateEnabledRulesets({
                enableRulesetIds: ["ruleset_1"]
            });
        } else {
            await chrome.declarativeNetRequest.updateEnabledRulesets({
                disableRulesetIds: ["ruleset_1"]
            });
        }
    } catch (err) {
        console.error("Failed to sync ad ruleset:", err);
    }
}

async function syncDynamicSiteBlockRules(data) {
    try {
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        const removeRuleIds = existingRules.map((r) => r.id);
        const passActive = data.emergencyPassUntil && Date.now() < data.emergencyPassUntil;
        const shouldBlockSites = Boolean(data.studyMode && data.siteBlockEnabled !== false && !passActive);

        const addRules = [];
        if (shouldBlockSites && Array.isArray(data.blockedSites)) {
            data.blockedSites.forEach((rawDomain, index) => {
                const domain = String(rawDomain || "")
                    .trim()
                    .toLowerCase()
                    .replace(/^https?:\/\//, "")
                    .replace(/^www\./, "")
                    .split("/")[0];
                if (!domain) return;
                addRules.push({
                    id: 1000 + index,
                    priority: 1,
                    action: {
                        type: "redirect",
                        redirect: { extensionPath: "/blocked.html" }
                    },
                    condition: {
                        urlFilter: `||${domain}^`,
                        resourceTypes: ["main_frame"]
                    }
                });
            });
        }

        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds,
            addRules
        });
    } catch (err) {
        console.error("Failed to sync site blocker rules:", err);
    }
}

function updateActionBadge(data) {
    if (data.timerRunning && data.timerEndTime) {
        const minsLeft = Math.max(1, Math.ceil((data.timerEndTime - Date.now()) / 60000));
        chrome.action.setBadgeText({ text: `${minsLeft}m` });
        chrome.action.setBadgeBackgroundColor({
            color: data.timerPhase === "break" ? "#10b981" : "#0284c7"
        });
        return;
    }

    if (data.studyMode) {
        chrome.action.setBadgeText({ text: "ON" });
        chrome.action.setBadgeBackgroundColor({ color: "#10b981" });
    } else {
        chrome.action.setBadgeText({ text: "" });
    }
}

function syncAllFromStorage() {
    chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS), (data) => {
        const merged = { ...DEFAULT_SETTINGS, ...data };
        syncStaticAdRules(Boolean(merged.studyMode && merged.adBlock));
        syncDynamicSiteBlockRules(merged);
        updateActionBadge(merged);
    });
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS), (existing) => {
        const merged = { ...DEFAULT_SETTINGS, ...existing };
        chrome.storage.local.set(merged, syncAllFromStorage);
    });
});

chrome.runtime.onStartup.addListener(syncAllFromStorage);

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== "local") return;
    if (
        changes.studyMode ||
        changes.adBlock ||
        changes.siteBlockEnabled ||
        changes.blockedSites ||
        changes.emergencyPassUntil ||
        changes.timerRunning ||
        changes.timerEndTime ||
        changes.timerPhase
    ) {
        syncAllFromStorage();
    }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "START_TIMER") {
        chrome.storage.local.get(["timerRemaining", "timerPhase"], (data) => {
            const remaining = msg.seconds || data.timerRemaining || FOCUS_MINUTES * 60;
            const endTime = Date.now() + remaining * 1000;
            chrome.alarms.create(TIMER_ALARM, { when: endTime });
            chrome.alarms.create(BADGE_ALARM, { periodInMinutes: 1 });
            chrome.storage.local.set({
                timerRunning: true,
                timerEndTime: endTime,
                timerRemaining: remaining,
                timerPhase: data.timerPhase || "focus"
            });
            sendResponse({ ok: true, endTime });
        });
        return true;
    }

    if (msg.type === "PAUSE_TIMER") {
        chrome.alarms.clear(TIMER_ALARM);
        chrome.alarms.clear(BADGE_ALARM);
        chrome.storage.local.get(["timerEndTime", "timerRemaining"], (data) => {
            const remaining = data.timerEndTime
                ? Math.max(0, Math.ceil((data.timerEndTime - Date.now()) / 1000))
                : data.timerRemaining || FOCUS_MINUTES * 60;
            chrome.storage.local.set({
                timerRunning: false,
                timerEndTime: null,
                timerRemaining: remaining
            });
            sendResponse({ ok: true, remaining });
        });
        return true;
    }

    if (msg.type === "RESET_TIMER") {
        chrome.alarms.clear(TIMER_ALARM);
        chrome.alarms.clear(BADGE_ALARM);
        const phase = msg.phase || "focus";
        const duration = (phase === "break" ? BREAK_MINUTES : FOCUS_MINUTES) * 60;
        chrome.storage.local.set({
            timerRunning: false,
            timerEndTime: null,
            timerPhase: phase,
            timerRemaining: duration
        });
        sendResponse({ ok: true });
        return true;
    }

    if (msg.type === "GRANT_EMERGENCY_PASS") {
        const passUntil = Date.now() + 5 * 60 * 1000;
        chrome.alarms.create(PASS_ALARM, { when: passUntil });
        chrome.storage.local.set({ emergencyPassUntil: passUntil }, () => {
            sendResponse({ ok: true, passUntil });
        });
        return true;
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === BADGE_ALARM) {
        syncAllFromStorage();
        return;
    }

    if (alarm.name === PASS_ALARM) {
        chrome.storage.local.set({ emergencyPassUntil: 0 }, syncAllFromStorage);
        return;
    }

    if (alarm.name === TIMER_ALARM) {
        chrome.alarms.clear(BADGE_ALARM);
        chrome.storage.local.get(["timerPhase", "focusMinutesToday", "studyStreak"], (data) => {
            const wasFocus = (data.timerPhase || "focus") === "focus";
            const nextPhase = wasFocus ? "break" : "focus";
            const nextDuration = (nextPhase === "break" ? BREAK_MINUTES : FOCUS_MINUTES) * 60;

            const updates = {
                timerRunning: false,
                timerEndTime: null,
                timerPhase: nextPhase,
                timerRemaining: nextDuration
            };

            if (wasFocus) {
                updates.focusMinutesToday = (data.focusMinutesToday || 0) + FOCUS_MINUTES;
                updates.studyStreak = (data.studyStreak || 1) + 1;
            }

            chrome.storage.local.set(updates, () => {
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    title: wasFocus ? "Focus Session Complete" : "Break Complete",
                    message: wasFocus
                        ? `${FOCUS_MINUTES} minutes logged. Take a 5-minute break.`
                        : "Break over. Ready for your next 25-minute focus sprint."
                });
                syncAllFromStorage();
            });
        });
    }
});