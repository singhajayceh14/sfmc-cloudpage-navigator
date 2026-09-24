# CloudPage Navigator — Privacy Policy

_Effective: 24 September 2026_

CloudPage Navigator is a browser extension that helps you search and open CloudPages in
Salesforce Marketing Cloud. It is an independent tool and is not affiliated with or endorsed by
Salesforce, Inc.

## Summary

**The extension does not collect, transmit, sell or share any of your data.** Everything it reads
stays in your browser, and nothing is sent to the developer or to any third party.

## Where it runs

Only on Marketing Cloud pages matching `https://*.exacttarget.com/cloud/*`. It does nothing on any
other website.

## What it reads, and why

| Data | Source | Purpose |
|---|---|---|
| CloudPage details: name, URL, URL key, folder, status, type, created/modified/published dates | Marketing Cloud, using the session you are already signed in with | To list, search and open your CloudPages |
| Folder names | Marketing Cloud | To show each page's folder path |
| Account IDs (user ID, business unit MID, enterprise ID) | Marketing Cloud | To show which account you are signed in to (only when you open the account popover) |
| Your user name and business unit names | The Marketing Cloud page header | Same as above |

All requests go directly from your browser to the Marketing Cloud site you are signed in to. This
data is kept only in the page's memory and is discarded when you close or reload the tab.

The extension is **read-only**: it never creates, changes or deletes anything in Marketing Cloud.

## What it stores

Using the browser's local extension storage (`chrome.storage.local`), on your device only:

- the vertical position of the panel and its launcher tab
- the list of CloudPages you pinned (stored as an internal type and ID, such as `landingpage:12345`)

You can remove this data at any time by uninstalling the extension.

## What it does not do

- No analytics, tracking, advertising or telemetry
- No remote code: all code ships inside the extension package
- No access to your passwords or cookies. Marketing Cloud requests use your existing browser session, as Marketing Cloud's own pages do.
- It writes to the clipboard only when you click a "Copy" button

## Changes

If this policy changes, the updated version will be published at this address with a new
effective date.

## Contact

Questions: singh.ajayceh14@gmail.com
