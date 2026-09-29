// Wires api.js to ui.js. Data loads on first open, in chunks.
(function (root) {
  if (root.top !== root.self || document.getElementById('cpf-host')) return; // top frame, once
  const { core, api, ui } = root.CPF;
  const PAGE_SIZE = 25;
  const POSITION_KEY = 'cpn.position';   // { panel, fab } vertical offsets chosen by dragging
  const PINS_KEY = 'cpn.pins';           // array of core.keyOf() strings, newest pin last
  // Without chrome.storage the UI still works, just without persistence.
  const store = {
    area: root.chrome && chrome.storage && chrome.storage.local,
    get(key) { return this.area ? this.area.get(key).then(r => r[key]).catch(() => undefined) : Promise.resolve(undefined); },
    set(key, value) { if (this.area) this.area.set({ [key]: value }).catch(() => {}); },
  };
  // Name and version come from manifest.json; the fallback covers running outside the extension.
  const asset = path => (root.chrome && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL(path) : '';
  const mf = (root.chrome && chrome.runtime && chrome.runtime.getManifest) ? chrome.runtime.getManifest() : { name: 'CloudPage Navigator', version: 'dev' };
  const meta = { name: mf.name, version: mf.version, iconUrl: asset('icons/icon48.png'),
    email: (mf.author && mf.author.email) || '', profileUrl: mf.homepage_url || '', };

  // List view state.
  const st = { items: [], query: '', status: 'all', sort: 'folder', pinned: new Set(), page: 1, loaded: 0, total: 0, loading: false, error: '', warning: '', errorKind: '', offline: !navigator.onLine, started: false };
  let run = 0; // incremented on each (re)load so stale chunks from an older run are ignored

  function paint() {
    const found = core.search(st.items, st.query);
    const matches = core.filterView(found, st.status, st.pinned);    // status chip or pinned view
    const ordered = core.partitionPinned(matches, st.pinned);        // pinned first, sort order kept within each group
    // Group headers only when the list mixes pinned and unpinned rows.
    const pinnedCount = st.status === 'pinned' ? 0 : core.countPinned(matches, st.pinned);
    const pg = core.paginate(ordered, st.page, PAGE_SIZE);
    st.page = pg.page;
    view.render({ ...pg, matches: matches.length, counts: { ...core.statusCounts(found), pinned: core.countPinned(found, st.pinned) }, status: st.status, query: st.query, loaded: st.loaded, total: st.total, loading: st.loading, error: st.error, warning: st.warning, errorKind: st.errorKind, offline: st.offline, sort: st.sort, pinned: st.pinned, pinnedCount });
  }

  const view = ui.mount({
    meta,
    onOpen: () => { if (!st.started) load(); },
    onRefresh: () => load(),
    onSearch: q => { st.query = q; st.page = 1; paint(); },
    onPage: n => { st.page = n; paint(); },
    onFilter: s => { st.status = s; st.page = 1; paint(); },
    // Re-sorts what is already loaded; chunks still arriving are sorted with the same mode.
    onSort: mode => { st.sort = mode; core.sortItems(st.items, mode); st.page = 1; paint(); },
    // Toggle a pin. The in-memory set is authoritative; storage is written after each change.
    onPin: key => {
      st.pinned.has(key) ? st.pinned.delete(key) : st.pinned.add(key);
      store.set(PINS_KEY, [...st.pinned]);
      paint();
    },
    // Deep link into the CloudPages app. The UI opens it in a new tab so the current search is kept.
    cloudPageUrl: it => core.editorLink(location.origin, it),
    onMove: position => store.set(POSITION_KEY, position),
    // Read once per session; the header popover asks for it the first time it is opened.
    onIdentity: () => api.getIdentity(),
  });

  store.get(POSITION_KEY).then(p => p && view.setPositions(p));
  store.get(PINS_KEY).then(keys => { if (Array.isArray(keys) && keys.length) { st.pinned = new Set(keys); paint(); } });

  // NOTE: the only place we change host page behaviour (navigation only, never data).
  //
  // Once the CloudPages app is showing a single page, MC's "Web Studio > CloudPages" link
  // can't get back to the list: the iframe router either rewrites the hash back or, when the
  // tab was opened on a deep link (as ours always are), fails with "Unable to access this
  // resource". A full reload works, so intercept that link and reload.
  const CP_ROOT_LINK = /#app\/CloudPages\/?$/i;      // the "all CloudPages" link only
  const CP_SUBVIEW   = /#app\/CloudPages\/view\//i;  // we are inside a single page

  function repairCloudPagesNav() {
    document.addEventListener('click', e => {
      // let the browser handle modified clicks (new tab / new window) natively
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target && e.target.closest && e.target.closest('a[href*="#app/CloudPages"]');
      if (!a) return;
      if (!CP_ROOT_LINK.test(a.getAttribute('href') || '')) return;  // not the list link
      if (!CP_SUBVIEW.test(location.hash)) return;                   // not stuck, let MC handle it
      e.preventDefault();
      location.hash = '#app/CloudPages';
      location.reload();
    }, true);   // capture: MC's own handler may stop propagation
  }
  repairCloudPagesNav();

  // Loaded pages stay searchable offline. A load that failed offline restarts when the
  // connection comes back.
  root.addEventListener('offline', () => { st.offline = true; paint(); });
  root.addEventListener('online', () => {
    st.offline = false;
    if (st.started && !st.loading && (st.error || st.warning)) load(); else paint();
  });

  async function load() {
    if (!navigator.onLine && st.items.length) {    // refresh while offline: keep the list, show offline state
      Object.assign(st, { offline: true, warning: 'No internet connection', errorKind: 'offline' });
      return paint();
    }
    const myRun = ++run;
    Object.assign(st, { items: [], loaded: 0, total: 0, loading: true, error: '', warning: '', errorKind: '', started: true });
    paint();
    try {
      await api.loadInChunks((chunk, prog) => {
        if (myRun !== run) return;
        st.items = core.sortItems(st.items.concat(chunk), st.sort);
        Object.assign(st, prog);
        paint();
      }, () => myRun !== run);
      if (myRun === run) { st.loading = false; paint(); }
    } catch (e) {
      if (myRun !== run) return;
      console.error('[' + meta.name + ']', e);
      // A later page failing keeps what already arrived; only an empty result is a hard error.
      const errorKind = e.kind || 'server';
      Object.assign(st, { loading: false, errorKind, offline: !navigator.onLine },
        st.items.length ? { warning: e.message } : { error: e.message });
      paint();
    }
  }
})(window);
