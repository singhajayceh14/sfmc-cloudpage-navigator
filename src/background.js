// Toolbar button. On a Marketing Cloud tab it toggles the panel; anywhere else (no content script
// to answer) it opens Marketing Cloud in a new tab. Without this, Chrome opens homepage_url.
const MC_URL = 'https://mc.exacttarget.com/';

chrome.action.onClicked.addListener(tab => {
  chrome.tabs.sendMessage(tab.id, { type: 'cpn.toggle' })
    .catch(() => chrome.tabs.create({ url: MC_URL, index: tab.index + 1 }));
});
