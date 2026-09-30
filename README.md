# CloudPage Navigator

A Chrome extension that adds a search panel to Salesforce Marketing Cloud. Find any CloudPage
(landing page, code resource or microsite) by name, URL, URL key or folder, and open it directly.

It is read-only, uses your existing Marketing Cloud session and sends no data anywhere.
See [PRIVACY.md](PRIVACY.md).

## Features

- Instant search across landing pages, code resources and microsites
- Full folder path for every page; filter by Published / Draft; sort by folder, name or last modified
- Pin favourites to the top
- Copy the published URL, open the live page, or open it in CloudPages in one click
- Shows the signed-in user, business unit (MID) and enterprise
- Keyboard first: <kbd>Ctrl</kbd>+<kbd>K</kbd> (<kbd>⌘</kbd><kbd>K</kbd> on Mac) anywhere in Marketing Cloud

## Install for development

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select this folder.
3. Open Marketing Cloud (`https://mc.s*.exacttarget.com/cloud/`) and press <kbd>Ctrl</kbd>+<kbd>K</kbd>.

After you change the code, reload the extension on `chrome://extensions` and refresh the Marketing Cloud tab.

## Project layout

| Path | Role |
|---|---|
| `src/core.js` | Pure logic (search, filter, sort, paginate, pins). No network or DOM access. |
| `src/api.js` | The only file that talks to Marketing Cloud (internal `/cloud/fuelapi` endpoints) |
| `src/icons.js` | Bundled [Lucide](https://lucide.dev) icons (ISC, see `src/LUCIDE-LICENSE.txt`) |
| `src/ui.js` | The panel, built in Shadow DOM so its styles don't clash with Marketing Cloud's |
| `src/main.js` | Connects `api` to `ui`, holds state and saved preferences |
| `scripts/package.ps1` | Builds the Chrome Web Store upload zip in `dist/` |
| `store/` | Store listing guide and graphics |

## Release

```powershell
# bump "version" in manifest.json first
powershell -ExecutionPolicy Bypass -File scripts/package.ps1
```
Then upload `dist/ab-cloudpage-navigator-<version>.zip` in the Chrome Web Store Developer Dashboard.
See [store/LISTING.md](store/LISTING.md) for the steps.

## Author

**Ajay Singh** · [LinkedIn](https://www.linkedin.com/in/ajay-singh-mbm/) · singh.ajayceh14@gmail.com

---

Independent tool, not affiliated with or endorsed by Salesforce, Inc. Salesforce and Marketing
Cloud are trademarks of Salesforce, Inc.
