// Only module that calls SFMC. The endpoints are internal and undocumented; keep changes here.
(function (root) {
  const BASE = '/cloud/fuelapi';
  const MAX_PAGES = 200; // safety stop: 200 x 50 = 10,000 items

  const TIMEOUT_MS = 20000; // abort stalled requests

  // Errors carry a `kind` for the UI: 'offline', 'network' (unreachable or timed out),
  // 'auth' (session expired) or 'server'.
  function fail(kind, message) { const e = new Error(message); e.kind = kind; return e; }

  async function getJson(path) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(BASE + path, { headers: { accept: 'application/json' }, signal: ctrl.signal }); // same-origin: session sent by default
    } catch (e) {
      if (!navigator.onLine) throw fail('offline', 'No internet connection');
      throw fail('network', e.name === 'AbortError'
        ? `Marketing Cloud did not answer within ${TIMEOUT_MS / 1000}s`
        : `Could not reach Marketing Cloud (${e.message})`);
    } finally { clearTimeout(timer); }
    if (res.status === 401 || res.status === 403) throw fail('auth', 'Not logged in to Marketing Cloud (HTTP ' + res.status + ')');
    if (!res.ok) throw fail('server', `HTTP ${res.status} for ${path}`);
    try { return await res.json(); }
    catch { throw fail('server', `Unexpected response for ${path}`); }
  }

  // Endpoint returns max 50 per page and paginates with "$page" (plain "page" is silently ignored).
  const getPage = (source, page) => getJson(`/internal/v2/cloudpages/${source}?$page=${page}`);

  // Resolve folder ids to {name, parentId}, walking up the tree. Cached for the session.
  const catCache = new Map();
  async function loadCategories(ids) {
    let queue = [...new Set(ids)].filter(id => id && !catCache.has(id));
    while (queue.length) {
      const results = await Promise.all(queue.map(id =>
        getJson(`/asset/v1/content/categories/${id}`)
          .then(c => [id, { name: c.name, parentId: c.parentId }])
          .catch(e => {
            // Don't cache placeholder names while offline; abort the load instead.
            if (e.kind === 'offline' || e.kind === 'network') throw e;
            return [id, { name: `(folder ${id})`, parentId: 0 }];   // fall back to the id for this folder
          })
      ));
      results.forEach(([id, c]) => catCache.set(id, c));
      queue = [...new Set(results.map(([, c]) => c.parentId))].filter(id => id && !catCache.has(id));
    }
    return catCache;
  }

  // Progressive loading. Page 1 of every type is fetched in parallel (fast first results + grand total),
  // then remaining pages one at a time. Each chunk arrives complete with folder paths.
  // onChunk(items, { loaded, total }). isCancelled() lets a newer refresh abort this run.
  async function loadInChunks(onChunk, isCancelled = () => false) {
    const { SOURCES, normalize, buildPath } = root.CPF.core;
    const sources = Object.keys(SOURCES);
    let loaded = 0;
    catCache.clear();   // Refresh re-reads folders too, so renamed/moved folders show their new paths

    async function emit(source, raws) {
      // Skip malformed records rather than failing the whole load.
      const items = raws.flatMap(r => {
        try { return [normalize(source, r)]; }
        catch (e) { console.warn('[CloudPage Navigator] skipped record:', e.message); return []; }
      });
      const cats = await loadCategories(items.map(i => i.categoryId));
      items.forEach(i => { i.path = buildPath(i.categoryId, cats); });
      if (isCancelled()) return false;
      loaded += items.length;
      onChunk(items, { loaded, total });
      return true;
    }

    const firsts = await Promise.all(sources.map(s => getPage(s, 1)));
    const total = firsts.reduce((n, j) => n + (j.totalCount || 0), 0);
    for (let i = 0; i < sources.length; i++) if (!(await emit(sources[i], firsts[i].entities || []))) return;

    for (let i = 0; i < sources.length; i++) {
      const first = firsts[i], size = first.pageSize || 50;
      const pages = Math.min(Math.ceil((first.totalCount || 0) / size), MAX_PAGES);
      for (let page = 2; page <= pages; page++) {
        if (isCancelled()) return;
        const batch = (await getPage(sources[i], page)).entities || [];
        if (!batch.length) break;                       // server has fewer than it claimed
        if (!(await emit(sources[i], batch))) return;
      }
    }
  }

  // ---- who is signed in, and which business unit ----
  // Ids come from the API. Names are scraped from the MC header because no endpoint exposes
  // them; if the markup changes they come back null and the popover shows ids only.
  function readShell() {
    const text = sel => { const n = document.querySelector(sel); return n ? n.textContent.trim() : null; };
    // Each row of the account switcher carries a name and a MID. Climb from the name to the first
    // ancestor that holds a MID, stopping before the list itself so rows can never be cross-matched.
    const accounts = [];
    document.querySelectorAll('.mc-account-switcher-name').forEach(nameEl => {
      let row = nameEl.parentElement, midEl = null;
      for (let i = 0; i < 4 && row; i++) {
        if (row.querySelectorAll('.mc-account-switcher-name').length > 1) break;   // that is the list, not a row
        midEl = row.querySelector('.mc-account-switcher-mid');
        if (midEl) break;
        row = row.parentElement;
      }
      const mid = midEl ? (midEl.textContent || '').replace(/\D+/g, '') : '';
      if (mid) accounts.push({ name: nameEl.textContent.trim(), mid });
    });
    return {
      userName: text('.mc-header-user-and-account .username') || text('.username'),
      buName: text('.mc-account-switcher-current-account-name'),
      accounts,
    };
  }

  async function getIdentity() {
    const token = await getJson('/platform/v1/tokenContext');   // { enterprise, organization, user } ids
    return root.CPF.core.identityModel(token, readShell());
  }

  (root.CPF = root.CPF || {}).api = { loadInChunks, getIdentity };
})(window);
