document.addEventListener("DOMContentLoaded", () => {
    const remainingText = document.getElementById("remainingText");
    const streakText = document.getElementById("streakText");
    const goBackBtn = document.getElementById("goBackBtn");
    const passBtn = document.getElementById("passBtn");

    chrome.storage.local.get(
        ["timerRunning", "timerEndTime", "timerRemaining", "studyStreak", "distractionsBlocked"],
        (data) => {
            chrome.storage.local.set({
                distractionsBlocked: (data.distractionsBlocked || 0) + 1
            });

            const streak = data.studyStreak || 1;
            streakText.textContent = `${streak} ${streak === 1 ? "Day" : "Days"}`;

            let secs = typeof data.timerRemaining === "number" ? data.timerRemaining : 25 * 60;
            if (data.timerRunning && data.timerEndTime) {
                secs = Math.max(0, Math.ceil((data.timerEndTime - Date.now()) / 1000));
            }
            const mins = String(Math.floor(secs / 60)).padStart(2, "0");
            const rem = String(secs % 60).padStart(2, "0");
            remainingText.textContent = `${mins}:${rem}`;
        }
    );

    goBackBtn.addEventListener("click", () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = "https://www.google.com";
        }
    });

    passBtn.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "GRANT_EMERGENCY_PASS" }, () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = "https://www.google.com";
            }
        });
    });
});