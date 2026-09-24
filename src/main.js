// Wiring: connects api (data) to ui (display). Loads lazily on first open, progressively in chunks.
(function (root) {
  if (root.top !== root.self || document.getElementById('cpf-host')) return; // top frame, once
  const { core, api, ui } = root.CPF;
  const PAGE_SIZE = 25;
  const POSITION_KEY = 'cpn.position';   // { panel, fab } vertical offsets chosen by dragging
  const PINS_KEY = 'cpn.pins';           // array of core.keyOf() strings, newest pin last
  // Tiny wrapper so the UI works (without persistence) if chrome.storage is unavailable.
  const store = {
    area: root.chrome && chrome.storage && chrome.storage.local,
    get(key) { return this.area ? this.area.get(key).then(r => r[key]).catch(() => undefined) : Promise.resolve(undefined); },
    set(key, value) { if (this.area) this.area.set({ [key]: value }).catch(() => {}); },
  };
  // Name/version live only in manifest.json (DRY). Fallback keeps the UI working if run outside an extension.
  const asset = path => (root.chrome && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL(path) : '';
  const mf = (root.chrome && chrome.runtime && chrome.runtime.getManifest) ? chrome.runtime.getManifest() : { name: 'CloudPage Navigator', version: 'dev' };
  const meta = { name: mf.name, version: mf.version, iconUrl: asset('icons/icon48.png'),
    email: (mf.author && mf.author.email) || '', profileUrl: mf.homepage_url || '', };

  // Single source of truth for what the list shows.
  const st = { items: [], query: '', status: 'all', sort: 'folder', pinned: new Set(), page: 1, loaded: 0, total: 0, loading: false, error: '', warning: '', started: false };
  let run = 0; // incremented on each (re)load so stale chunks from an older run are ignored

  function paint() {
    const found = core.search(st.items, st.query);                    // unchanged search
    const matches = core.filterView(found, st.status, st.pinned);    // chip row: status, or the pinned view
    const ordered = core.partitionPinned(matches, st.pinned);        // pins float up, sort order kept inside each group
    // Group headers only earn their space in a mixed list; in the pinned view every row is pinned.
    const pinnedCount = st.status === 'pinned' ? 0 : core.countPinned(matches, st.pinned);
    const pg = core.paginate(ordered, st.page, PAGE_SIZE);
    st.page = pg.page;
    view.render({ ...pg, matches: matches.length, counts: { ...core.statusCounts(found), pinned: core.countPinned(found, st.pinned) }, status: st.status, query: st.query, loaded: st.loaded, total: st.total, loading: st.loading, error: st.error, warning: st.warning, sort: st.sort, pinned: st.pinned, pinnedCount });
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
    // Toggle a favourite. The set is the source of truth; storage is a copy written after each change.
    onPin: key => {
      st.pinned.has(key) ? st.pinned.delete(key) : st.pinned.add(key);
      store.set(PINS_KEY, [...st.pinned]);
      paint();
    },
    // Deep link into the CloudPages app. The UI always opens it in a new tab, so this tab and its search stay put.
    cloudPageUrl: it => core.editorLink(location.origin, it),
    onMove: position => store.set(POSITION_KEY, position),
    // Read once per session; the header popover asks for it the first time it is opened.
    onIdentity: () => api.getIdentity(),
  });

  store.get(POSITION_KEY).then(p => p && view.setPositions(p));
  store.get(PINS_KEY).then(keys => { if (Array.isArray(keys) && keys.length) { st.pinned = new Set(keys); paint(); } });

  async function load() {
    const myRun = ++run;
    Object.assign(st, { items: [], loaded: 0, total: 0, loading: true, error: '', warning: '', started: true });
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
      Object.assign(st, st.items.length ? { loading: false, warning: e.message } : { loading: false, error: e.message });
      paint();
    }
  }
})(window);
