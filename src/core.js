// Pure data logic: no network or DOM access.
(function (root) {
  // Per-endpoint config used to normalise raw API records.
  const SOURCES = {
    'landing-pages':  { type: 'Landing Page',  channel: 'landingpage',   idField: 'landingPageId' },
    'code-resources': { type: 'Code Resource', channel: 'code-resource', idField: 'codeResourceId' },
    'microsites':     { type: 'Microsite',     channel: 'microsite',     idField: 'micrositeId' },
  };

  // "text/css" -> "CSS", "application/javascript" -> "JavaScript". Empty for pages.
  function subtypeOf(contentType) {
    if (!contentType) return '';
    const map = { css: 'CSS', javascript: 'JavaScript', json: 'JSON', xml: 'XML', rss: 'RSS', plain: 'Text' };
    const k = Object.keys(map).find(k => contentType.toLowerCase().includes(k));
    return k ? map[k] : contentType;
  }

  function normalize(source, raw) {
    const cfg = SOURCES[source];
    if (!cfg) throw new Error('Unknown source: ' + source);
    const id = raw[cfg.idField];
    if (id == null) throw new Error(`${source} record missing ${cfg.idField}`);
    return {
      id,
      name: raw.name || '',
      type: cfg.type,
      channel: cfg.channel,
      url: raw.url || '',
      key: raw.key || '',
      status: raw.status || '',
      categoryId: raw.categoryId ?? raw.collectionId ?? null,
      subtype: subtypeOf(raw.contentType),
      createdDate: raw.createdDate || '',
      modifiedDate: raw.modifiedDate || '',
      publishDate: raw.publishDate || '',
      path: [],            // filled in later from categories
    };
  }

  // Walk parentId links up to the root. `cats` = Map(id -> {name, parentId}).
  function buildPath(categoryId, cats) {
    const names = [];
    const seen = new Set();
    let cur = categoryId;
    while (cur && cats.has(cur) && !seen.has(cur)) {   // seen-guard: never loop on bad data
      seen.add(cur);
      const c = cats.get(cur);
      names.unshift(c.name);
      cur = c.parentId;
    }
    return names;
  }

  // Every search word must appear in name, URL, or path (case-insensitive).
  function search(items, query) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return items;
    return items.filter(it => {
      const hay = (it.name + ' ' + it.url + ' ' + it.path.join(' / ')).toLowerCase();
      return words.every(w => hay.includes(w));
    });
  }

  // Account model for the header popover.
  // `token`: ids from platform/v1/tokenContext (reliable).
  // `shell`: names scraped from the MC header. Any name may be null if the markup changes;
  //          the UI then shows the id only.
  function identityModel(token, shell) {
    const t = token || {}, sh = shell || {};
    const mid = t.organization && t.organization.id != null ? String(t.organization.id) : null;
    const eid = t.enterprise && t.enterprise.id != null ? String(t.enterprise.id) : null;
    const userId = t.user && t.user.id != null ? String(t.user.id) : null;
    // The account switcher lists every BU as name + MID; the enterprise is just the one whose MID is the EID.
    const byMid = new Map((sh.accounts || []).filter(a => a && a.mid).map(a => [String(a.mid), a.name || null]));
    return {
      userName: sh.userName || null, userId,
      buName: sh.buName || byMid.get(mid) || null, mid,
      entName: (eid && byMid.get(eid)) || null, eid,
    };
  }

  // Stable identity for one record. Ids repeat across sources, so the channel is part of the key.
  // Also used as the storage key for pins.
  const keyOf = it => it.channel + ':' + it.id;

  // Pinned rows float to the top, keeping the current sort order inside each group.
  // `pinned` is a Set of keyOf() strings; an empty or missing set is a no-op.
  function partitionPinned(items, pinned) {
    if (!pinned || !pinned.size) return items;
    const top = [], rest = [];
    items.forEach(it => (pinned.has(keyOf(it)) ? top : rest).push(it));
    return top.concat(rest);
  }

  // Sort modes offered in the toolbar. 'folder' is the default and matches the CloudPages UI.
  const SORTS = ['folder', 'name', 'modified'];

  // Epoch millis for a record's modified date. Missing/unparseable dates return null so they
  // can be pushed to the bottom rather than silently sorting as 1970.
  function modifiedAt(item) {
    const t = Date.parse(item.modifiedDate || item.createdDate || '');
    return Number.isNaN(t) ? null : t;
  }

  // Runs on every chunk, so keep it cheap. All modes tie-break on folder path so rows
  // don't reorder as chunks arrive.
  function sortItems(items, mode) {
    const folderKey = i => (i.path.join('/') + '/' + i.name).toLowerCase();
    const byFolder = (a, b) => folderKey(a).localeCompare(folderKey(b));
    if (mode === 'name') {
      return items.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || byFolder(a, b));
    }
    if (mode === 'modified') {                       // newest first; undated records last
      return items.sort((a, b) => {
        const x = modifiedAt(a), y = modifiedAt(b);
        if (x === null && y === null) return byFolder(a, b);
        if (x === null) return 1;
        if (y === null) return -1;
        return y - x || byFolder(a, b);
      });
    }
    return items.sort(byFolder);                     // 'folder' and anything unknown
  }

  // How many of these are pinned. Used for the Pinned chip's count.
  function countPinned(items, pinned) {
    return !pinned || !pinned.size ? 0 : items.reduce((n, it) => n + (pinned.has(keyOf(it)) ? 1 : 0), 0);
  }

  // The chip row covers two filters (status and pinned); this picks which one applies.
  function filterView(items, view, pinned) {
    if (view === 'pinned') return !pinned || !pinned.size ? [] : items.filter(it => pinned.has(keyOf(it)));
    return filterStatus(items, view);
  }

  // Status filter, applied after search. 'all' is a no-op.
  function filterStatus(items, status) {
    return !status || status === 'all' ? items : items.filter(i => i.status === status);
  }
  function statusCounts(items) {
    const c = { all: items.length, Published: 0, Draft: 0 };
    items.forEach(i => { if (i.status in c) c[i.status]++; });
    return c;
  }

  // Client-side paging. Clamps out-of-range pages instead of returning an empty page.
  function paginate(items, page, size) {
    if (!(size > 0)) throw new Error('page size must be > 0');
    const pages = Math.max(1, Math.ceil(items.length / size));
    const p = Math.min(Math.max(1, page | 0), pages);
    const start = (p - 1) * size;
    return { rows: items.slice(start, start + size), page: p, pages, from: items.length ? start + 1 : 0, to: Math.min(start + size, items.length) };
  }

  // Page buttons with gaps, e.g. [1,'…',4,5,6,'…',10]. Always shows first, last and neighbours.
  function pageNumbers(page, pages) {
    const want = new Set([1, pages, page - 1, page, page + 1].filter(n => n >= 1 && n <= pages));
    const nums = [...want].sort((a, b) => a - b), out = [];
    nums.forEach((n, i) => { if (i && n - nums[i - 1] > 1) out.push('…'); out.push(n); });
    return out;
  }

  function editorLink(origin, item) {
    return `${origin}/cloud/#app/CloudPages/view/${item.channel}/${item.id}`;
  }

  const api = { SOURCES, SORTS, identityModel, keyOf, partitionPinned, countPinned, filterView, modifiedAt, subtypeOf, normalize, buildPath, search, filterStatus, statusCounts, sortItems, paginate, pageNumbers, editorLink };
  if (typeof module !== 'undefined') module.exports = api;
  else (root.CPF = root.CPF || {}).core = api;
})(typeof window !== 'undefined' ? window : globalThis);
