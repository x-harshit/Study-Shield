const STYLE_ID = "study-shield-styles";
let currentSettings = {
    studyMode: false,
    ytComments: true,
    ytShorts: true,
    ytCleanWatch: true
};
let lastCheckedUrl = "";

function getOrCreateStyleElement() {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
        el = document.createElement("style");
        el.id = STYLE_ID;
        (document.head || document.documentElement).appendChild(el);
    }
    return el;
}

function incrementBlockedCount(amount = 1) {
    chrome.storage.local.get(["distractionsBlocked"], (data) => {
        const next = (data.distractionsBlocked || 0) + amount;
        chrome.storage.local.set({ distractionsBlocked: next });
    });
}

function redirectIfShortsUrl() {
    if (!currentSettings.studyMode || !currentSettings.ytShorts) return;
    const url = new URL(window.location.href);
    if (url.pathname === "/shorts" || url.pathname === "/shorts/") {
        incrementBlockedCount(1);
        window.location.replace("https://www.youtube.com/");
        return;
    }
    const shortsMatch = url.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch && shortsMatch[1]) {
        incrementBlockedCount(1);
        window.location.replace(`https://www.youtube.com/watch?v=${shortsMatch[1]}`);
    }
}

function purgeDynamicShortsNodes() {
    if (!currentSettings.studyMode || !currentSettings.ytShorts) return;
    const selectors = [
        "ytd-rich-section-renderer[is-shorts]",
        "ytd-rich-shelf-renderer[is-shorts]",
        "ytd-reel-shelf-renderer",
        "grid-shelf-view-model",
        "ytd-guide-entry-renderer",
        "ytd-mini-guide-entry-renderer"
    ];

    let removed = 0;
    document.querySelectorAll(selectors.join(",")).forEach((node) => {
        if (node.dataset.studyShieldChecked) return;
        const isShortsNode =
            node.hasAttribute("is-shorts") ||
            node.tagName === "YTD-REEL-SHELF-RENDERER" ||
            Boolean(node.querySelector('a[href*="/shorts"], ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2, [overlay-style="SHORTS"], [title="Shorts"], [aria-label="Shorts"]'));
        node.dataset.studyShieldChecked = "1";
        if (isShortsNode) {
            node.style.setProperty("display", "none", "important");
            removed++;
        }
    });

    if (removed > 0) {
        incrementBlockedCount(removed);
    }
}

function applyYouTubeRules() {
    chrome.storage.local.get(["studyMode", "ytComments", "ytShorts", "ytCleanWatch"], (data) => {
        currentSettings = {
            studyMode: Boolean(data.studyMode),
            ytComments: data.ytComments !== false,
            ytShorts: data.ytShorts !== false,
            ytCleanWatch: data.ytCleanWatch !== false
        };

        const styleElement = getOrCreateStyleElement();
        let cssRules = "";

        if (currentSettings.studyMode && currentSettings.ytComments) {
            cssRules += `
                #comments,
                ytd-comments#comments {
                    display: none !important;
                }
            `;
        }

        if (currentSettings.studyMode && currentSettings.ytShorts) {
            cssRules += `
                /* Home, Subscriptions & Shelf Shorts */
                ytd-rich-section-renderer[is-shorts],
                ytd-rich-shelf-renderer[is-shorts],
                ytd-reel-shelf-renderer,
                ytd-reel-item-renderer,
                grid-shelf-view-model:has(ytm-shorts-lockup-view-model),
                grid-shelf-view-model:has(ytm-shorts-lockup-view-model-v2),
                grid-shelf-view-model:has(a[href*="/shorts/"]),
                ytm-shorts-lockup-view-model,
                ytm-shorts-lockup-view-model-v2,

                /* Individual Shorts cards in Home, Search & Related */
                ytd-rich-item-renderer:has(a[href*="/shorts/"]),
                ytd-video-renderer:has(a[href*="/shorts/"]),
                ytd-grid-video-renderer:has(a[href*="/shorts/"]),
                ytd-compact-video-renderer:has(a[href*="/shorts/"]),
                ytd-video-renderer:has([overlay-style="SHORTS"]),
                ytd-compact-video-renderer:has([overlay-style="SHORTS"]),

                /* Sidebar nav, Search filter chip & Channel Shorts tab */
                ytd-guide-entry-renderer:has(a[title="Shorts"]),
                ytd-guide-entry-renderer:has(a[href^="/shorts"]),
                ytd-mini-guide-entry-renderer[aria-label="Shorts"],
                ytd-mini-guide-entry-renderer:has(a[title="Shorts"]),
                yt-chip-cloud-chip-renderer:has(yt-formatted-string[title="Shorts"]),
                yt-tab-shape[tab-title="Shorts"] {
                    display: none !important;
                }
            `;
        }

        if (currentSettings.studyMode && currentSettings.ytCleanWatch) {
            cssRules += `
                /* Distraction-Free Watch: hide Up Next sidebar & end-screen cards */
                #secondary #related,
                ytd-watch-next-secondary-results-renderer,
                .ytp-ce-element,
                .ytp-endscreen-content {
                    display: none !important;
                }
            `;
        }

        styleElement.textContent = cssRules;
        redirectIfShortsUrl();
        purgeDynamicShortsNodes();
    });
}

applyYouTubeRules();

const observer = new MutationObserver(() => {
    if (window.location.href !== lastCheckedUrl) {
        lastCheckedUrl = window.location.href;
        redirectIfShortsUrl();
    }
    purgeDynamicShortsNodes();
});

observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});

window.addEventListener("yt-navigate-start", redirectIfShortsUrl);
window.addEventListener("yt-navigate-finish", applyYouTubeRules);
window.addEventListener("popstate", applyYouTubeRules);

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (
        namespace === "local" &&
        (changes.studyMode || changes.ytComments || changes.ytShorts || changes.ytCleanWatch)
    ) {
        applyYouTubeRules();
    }
});