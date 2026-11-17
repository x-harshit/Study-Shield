Study Shield
A calmer browser for focused study sessions.
<img width="467" height="765" alt="image" src="https://github.com/user-attachments/assets/e894ad4e-b497-42c7-bec4-eb69f0f04723" />


Study Shield is a Chrome extension built to reduce common browser
distractions while you study. It brings YouTube cleanup, website
blocking, lightweight ad-request filtering, and a Pomodoro timer into
one small popup.

The idea is simple: keep the useful parts of the web available, and make
the usual distraction loops a little harder to fall into.
Current version: 1.0
Platform: Chromium-based browsers that support Manifest V3

What it does
YouTube focus controls
When Study Mode is enabled, you can choose which parts of YouTube to
quiet down:
- Shorts cleanup: hides Shorts shelves, cards, navigation entries,
  search filters, and channel Shorts tabs that match the extension's
  selectors.
- Direct Shorts redirect: redirects a /shorts/... URL to the
  regular YouTube watch page.
- Distraction-Free Watch: hides the Up Next area and video
  end-screen recommendation elements.
- Hide comments: removes the comments section while Study Mode is
  active.
YouTube changes its interface regularly, so selectors may need
maintenance as the site evolves.
Website distraction blocker
Add the sites that tend to pull you away from work. The extension comes
with these defaults:
- instagram.com
- tiktok.com
- reddit.com
- x.com
When Study Mode and Block Distracting Websites are both enabled,
matching visits are redirected to the Study Shield intervention page.

The intervention page shows the saved focus timer information and your
displayed streak. It also offers:
- Return to Study
- 5-Min Emergency Pass --- temporarily pauses the website-blocking
  rules for five minutes.
You can add or remove domains from the popup.
Lightweight ad-request blocking
Study Shield includes an optional Manifest V3 ruleset for requests to
these advertising domains:
- doubleclick.net
- googlesyndication.com
- googleadservices.com
- adnxs.com
The rules target selected request types: scripts, images,
XHR/fetch-style requests, and subframes. Ad blocking is enabled only
when Study Mode and Block Website Ads are both on.

A realistic note: this is a small domain-based filter, not a full
replacement for a dedicated ad blocker. It will not catch every ad, and
it does not guarantee that YouTube video ads will be blocked.
Focus timer
Use the built-in Pomodoro timer:
- Focus: 25 minutes
- Break: 5 minutes
- Start, pause, and reset from the popup.
- The timer is managed by the background service worker using Chrome
  alarms, so it can continue while the popup is closed.
- The extension updates its toolbar badge while a timer is running and
  sends a Chrome notification when a phase ends.
When a focus phase finishes, the timer switches to the Break phase; when
a break finishes, it switches back to Focus. The next phase is ready to
start manually.
Simple progress counters
The popup displays:
- Streak: the stored focus-session counter.
- Focus: accumulated completed focus minutes.
- Blocked: the distraction count recorded by the extension.
These are lightweight in-extension counters, not a full analytics
system. In this version, the displayed streak is incremented after a
completed focus session; it is not a verified consecutive-calendar-day
streak. The focus counter is stored locally and this code does not
implement a midnight reset.
Getting started
Install in Chrome
1. Download or clone this project.
2. Extract the project folder if it is zipped.
3. Open chrome://extensions in Chrome.
4. Turn on Developer mode.
5. Select Load unpacked.
6. Choose the folder containing manifest.json.
7. Pin Study Shield from the Extensions menu for quick access.
8. Open the extension popup and turn on Study Mode.
The project uses Manifest V3 and does not require a build step or
package installation.
First study session
1. Open the Study Shield popup.
2. Turn on Study Mode.
3. Keep the individual controls you want enabled:
   - Purge YouTube Shorts
   - Distraction-Free Watch
   - Hide YouTube Comments
   - Block Website Ads
   - Block Distracting Websites
4. Review the blocked-site list and add any domains you want to avoid.
5. Choose Focus or Break, then start the timer.
Turning Study Mode off disables the study-time ad rules and website
blocking, and the YouTube focus changes are no longer applied.
Project structure
study-shield/
├── manifest.json   # Extension metadata, permissions, and entry points
├── background.js   # Timer, alarms, notifications, ad rules, and site blocking
├── content.js      # YouTube Shorts cleanup and watch-page controls
├── popup.html      # Extension popup interface
├── popup.css       # Popup styling
├── popup.js        # Popup settings, site list, timer controls, and stats
├── blocked.html    # Distraction intervention page
├── blocked.js      # Intervention page actions and displayed stats
└── rules.json      # Static ad-domain blocking rules
Permissions explained
Study Shield requests these Chrome permissions:
  Permission                          Why it is used
  storage                           Save settings, blocked domains,
timer state, and counters locally.

  declarativeNetRequest             Apply the ad-domain rules and
redirect blocked sites.

  alarms                            Keep timer and emergency-pass
timing in the background.
notifications                     Notify you when a focus or break
phase ends.
The extension also declares <all_urls> host access because the
user-configurable site blocker needs to match domains beyond a fixed
list. The content script itself is limited to YouTube pages.
Notes and limitations
- Study Shield is designed for focus support, not as a security or
  parental-control product.
- Ad filtering covers only the domains and request types listed in
  rules.json. Ads served from other domains or through first-party
  delivery may still appear.
- YouTube's layout and internal element names can change. Shorts and
  recommendation cleanup may need updates over time.
- A blocked domain is matched using the domain text entered in the
  popup. Add a hostname such as example.com, not a full page URL.
- The emergency pass is global to the configured website-blocking
  rules and lasts five minutes.
- Progress values are stored with chrome.storage.local on the
  browser profile. They are not synced to a server.
- The extension has not been independently security-audited. Review
  the source code before installing it in a browser profile that
  contains sensitive data.
Built with
- JavaScript
- HTML
- CSS
- Chrome Extensions Manifest V3
- chrome.storage
- chrome.declarativeNetRequest
- chrome.alarms
- chrome.notifications
Contributing
Ideas, bug reports, and improvements are welcome.

If you find a site that is not being blocked correctly or a YouTube
element that slips through, include:
1. Your browser and version.
2. The setting(s) enabled in Study Shield.
3. The page or domain where the issue happened.
4. The steps needed to reproduce it.
Please avoid sharing personal information, account details, or private
browsing data in issue reports.
License
No license is currently included in this project. Unless a license is
added, the source is provided without an explicit open-source reuse or
redistribution grant.
