# Chrome Web Store: submission guide

Copy and paste these answers into the Developer Dashboard (https://chrome.google.com/webstore/devconsole).

---

## 0. Before you start (one time)

- [ ] Register a developer account: one-time US$5 fee, and **2-Step Verification must be on** for the Google account.
- [ ] **Publisher identity must match the extension.** Developer: *Ajay Singh*, `singh.ajayceh14@gmail.com`,
      https://www.linkedin.com/in/ajay-singh-mbm/ (in `src/ui.js`, `manifest.json` and `PRIVACY.md`).
      Register the developer account as Ajay Singh, ideally with `singh.ajayceh14@gmail.com`, and set the
      same address as the verified contact email.
- [ ] Verify the contact email in **Account → Contact email** (required before publishing).
- [ ] **Trader declaration** (EU Digital Services Act): choose *Non-trader* for a free personal project,
      or *Trader* if you publish on behalf of a business (then address and phone are shown publicly).
- [ ] Host `PRIVACY.md` at a public URL, for example GitHub Pages or the file's github.com link once the repo is public.

## 1. Package

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package.ps1
```
Upload `dist/ab-cloudpage-navigator-<version>.zip`. Every later update needs a higher `version` in `manifest.json`.

## 2. Store listing tab

**Name** (from manifest): CloudPage Navigator

**Summary** (from manifest `description`, max 132 characters):
> Search and navigate Salesforce Marketing Cloud CloudPages by name, URL, URL key or folder. Read-only; uses your existing session.

**Description:**
```
Find any CloudPage in seconds.

CloudPages pile up fast across folders and business units. CloudPage Navigator adds a search panel to Salesforce Marketing Cloud so you can find the page you need and jump straight to it, without clicking through folder trees.

KEY FEATURES
• Instant search by name, URL, URL key or folder path
• Landing pages, code resources and microsites in one list
• Full folder path for every page
• Filter by Published / Draft, sort by folder, name or last modified
• Pin favourites to the top
• Page details at a glance: status, type, URL key, created / modified / published dates
• One click to copy the published URL, open the live page, or open it in CloudPages
• Shows which user, business unit (MID) and enterprise you are signed in to
• Keyboard first: Ctrl+K (⌘K on Mac) opens it anywhere in Marketing Cloud; arrows, Enter and Esc to navigate
• Built for large accounts: results stream in progressively

PRIVATE AND READ-ONLY
• Works only on Marketing Cloud pages (*.exacttarget.com/cloud/*)
• Uses the session you are already signed in with, with no extra login
• Never modifies anything in Marketing Cloud
• No analytics, no tracking, no data leaves your browser

HOW TO USE
1. Sign in to Marketing Cloud.
2. Click the "CloudPages" tab on the right edge of the screen, or press Ctrl+K.
3. Start typing.

This is an independent tool. It is not affiliated with, endorsed by or sponsored by Salesforce, Inc. Salesforce and Marketing Cloud are trademarks of Salesforce, Inc.
```

**Category:** Developer Tools (or *Workflow & Planning*) · **Language:** English

**Graphics:**
| Asset | Required | File |
|---|---|---|
| Store icon 128×128 | yes | `store/store-icon-128.png` (96px artwork with 16px padding, per Google's guidelines) |
| Small promo tile 440×280 | yes | `store/promo-tile-440x280.png` |
| Marquee 1400×560 | optional | `store/marquee-1400x560.png` |
| Screenshots 1280×800 (or 640×400), 1 to 5 | yes, at least 1 | **You must capture these.** See below. |

**Screenshots:** capture real ones in Marketing Cloud at a browser window of 1280×800:
1. List view with search results
2. A page's detail view
3. Filters and sort menu, or pinned items
4. The About screen

⚠ **Blur or replace real client data** before uploading: page names, URLs, MIDs, user names, business unit names.
A demo or sandbox business unit with sample pages is the easiest option.

**Official URL / Homepage:** your GitHub repo URL once it exists. **Support URL:** the repo's Issues page, or a `mailto:` address.

## 3. Privacy practices tab

**Single purpose:**
> Lets Salesforce Marketing Cloud users search their CloudPages (landing pages, code resources, microsites) by name, URL, URL key or folder and open them directly.

**Permission justification: `storage`:**
> Saves the user's preferences locally on the device: the vertical position of the panel and the list of CloudPages the user pinned as favourites. Nothing is synced or sent anywhere.

**Host permission justification (content script on `https://*.exacttarget.com/cloud/*`):**
> The extension's only purpose is to add a search panel inside Salesforce Marketing Cloud. The content script runs only on Marketing Cloud pages. It calls Marketing Cloud's own endpoints on the same site, using the user's existing session, to read the list of CloudPages and their folder names. The script is read-only and never modifies data.

**Remote code:** *No, I am not using remote code.* All JavaScript is in the package and icons are bundled inline.

**Data usage:** tick the data types the extension **handles**, even though nothing leaves the device:
- [x] Personally identifiable information: the signed-in user's name, shown in the account popover
- [x] Website content: CloudPage names, URLs and folders, shown in the panel

Then tick all three certifications:
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** the public URL of `PRIVACY.md`.

## 4. Distribution tab

- Visibility: **Unlisted** is a good choice for the first release. Only people with the link can install it, so colleagues can test it before you switch to **Public**.
- Regions: all regions. Price: free.

## 5. Submit

Review usually takes from a day to about a week. Reviews are quicker because host access is limited to one domain and `storage` is the only permission.

---

## Policy notes for this extension

| Rule | Status |
|---|---|
| Manifest V3 | ✅ |
| Least-privilege permissions | ✅ `storage` only, and one host pattern |
| No remote or obfuscated code | ✅ readable source, no `eval`, no `innerHTML`, no CDN |
| Single purpose | ✅ |
| Trademarks | ✅ no Salesforce logo; "not affiliated" disclaimer in the About screen and the description. Only use "Salesforce" to describe compatibility, never as the product name. |
| Accurate listing | ✅ "Read-only" and "no data leaves your browser" match the code |
| Third-party licences | ✅ `src/LUCIDE-LICENSE.txt` ships in the package |
| Undocumented Marketing Cloud endpoints | ⚠ Not a store violation, but Salesforce can change them without notice. `src/api.js` is the only file to fix if they break. |
| Global Ctrl+K shortcut | ⚠ Allowed, but it overrides Ctrl+K on Marketing Cloud pages. It's mentioned in the description. |
