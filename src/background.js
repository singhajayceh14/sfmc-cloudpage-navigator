// Toolbar button. On a Marketing Cloud tab it toggles the panel; anywhere else (no content script
// to answer) it opens the store listing in a new tab. Without this, Chrome opens homepage_url.
// Fixed store id, not chrome.runtime.id: an unpacked dev copy has a different id.
const STORE_URL = 'https://chromewebstore.google.com/detail/ceofokjajjiifnjoahggdppebdafplde';

chrome.action.onClicked.addListener(tab => {
  chrome.tabs.sendMessage(tab.id, { type: 'cpn.toggle' })
    .catch(() => chrome.tabs.create({ url: STORE_URL, index: tab.index + 1 }));
});
