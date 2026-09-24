// Presentation only. Knows nothing about SFMC endpoints or search rules: main.js hands it a state object
// and callbacks. Shadow DOM keeps our styles isolated from Marketing Cloud's.
// Views: 'list' (search, filters, results, footer), 'detail' (one page), 'info' (About / Shortcuts tabs).
(function (root) {
  const icon = (...a) => root.CPF.icon(...a);

  // ---------------------------------------------------------------------------------------------
  // Design tokens. Every colour, radius and type size below comes from these variables.
  // Text colours are checked for >= 4.5:1 contrast on every background they sit on:
  //   --ok / --warn / --faint are for dots, rings and icons only; their *-ink variants are for text.
  // ---------------------------------------------------------------------------------------------
  const PANEL_W = 376;
  const PANEL_H = 560;
  const EDGE = 8;             // minimum gap kept between the panel/tab and the window edge when dragging
  const STYLES = `
    :host {
      all: initial;
      --bg: #fff; --surface: #fbfcfe; --line: #e8ecf3; --line-strong: #dfe4ec;
      --ink: #16243c; --ink-2: #26334a; --muted: #5f6b7d; --faint: #8b95a6;
      --accent: #0b5cab; --accent-hover: #094a8a; --accent-soft: #e7effa; --accent-ring: rgba(11,92,171,.28);
      --ok: #2e9e63; --ok-ink: #1d7a4a; --ok-soft: #f2f8f4; --ok-line: #d9ece1;
      --warn: #e8a33d; --warn-ink: #9a5b0c; --warn-soft: #fdf5e8; --warn-line: #f3dfbd;
      --danger: #c0392b; --danger-soft: #fdf1ef; --danger-line: #f3d0cb;
      --sel: #f1f7fe;
      --r: 8px; --r-sm: 6px;
      --fs-title: 15px; --fs-body: 12px; --fs-label: 11.5px; --fs-meta: 10px; --fs-micro: 9.5px;
      --font: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --mono: ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, Menlo, monospace;
      --ring: 0 0 0 3px var(--accent-ring);
      --shadow: 0 10px 30px rgba(22,36,60,.14), 0 0 0 1px rgba(22,36,60,.04);
      --t: 140ms ease;
      --panel-w: ${PANEL_W}px;
      --panel-h: ${PANEL_H}px;   /* fixed size: never shrinks with content or window */
    }
    * { box-sizing: border-box; font-family: var(--font); -webkit-font-smoothing: antialiased; }
    button { font: inherit; color: inherit; }
    [hidden] { display: none !important; }
    :focus { outline: none; }
    :focus-visible { box-shadow: var(--ring); }
    .ic { flex: none; display: block; }
    kbd { font: 500 var(--fs-meta)/1 var(--font); color: var(--muted); background: var(--surface);
          border: 1px solid var(--line-strong); border-radius: 4px; padding: 3px 5px; white-space: nowrap; }

    /* ---------- Launcher: slim tab on the right edge ---------- */
    .fab { position: fixed; right: 0; top: var(--fab-y, 50%); transform: translate(4px, -50%); z-index: 2147483647; touch-action: none;
           display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 7px 12px 6px;
           background: var(--accent); color: #fff; border: 0; border-radius: var(--r) 0 0 var(--r); cursor: pointer;
           box-shadow: -2px 2px 10px rgba(22,36,60,.2); transition: transform var(--t), right 200ms ease, background var(--t); }
    .fab:hover, .fab.on { transform: translate(0, -50%); background: var(--accent-hover); }
    .fab.dragging { cursor: grabbing; transition: none; }
    .fab span { writing-mode: vertical-rl; transform: rotate(180deg); font-size: var(--fs-meta); font-weight: 600; letter-spacing: .6px; }

    /* ---------- Panel: fixed size, pinned to the right edge, vertically movable ---------- */
    .panel { position: fixed; right: 0; top: var(--panel-y, 72px); width: var(--panel-w);
             height: min(var(--panel-h), calc(100vh - 16px)); max-width: 100vw; z-index: 2147483646;
             display: flex; flex-direction: column; overflow: hidden;
             background: var(--bg); border: 1px solid var(--line); border-right: 0; border-radius: 12px 0 0 12px;
             box-shadow: var(--shadow); color: var(--ink); font-size: var(--fs-body); line-height: 1.4;
             animation: enter 160ms ease-out; }
    @keyframes enter { from { transform: translateX(12px); opacity: 0 } to { transform: none; opacity: 1 } }

    /* Header */
    .hd { position: relative; display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 6px; border-bottom: 1px solid var(--line);
          cursor: grab; user-select: none; touch-action: none; }
    .panel.dragging .hd { cursor: grabbing; }
    .grip { width: 16px; height: 28px; display: inline-flex; align-items: center; justify-content: center; flex: none; padding: 0;
            border: 0; border-radius: 4px; background: transparent; color: var(--faint); cursor: grab; transition: color var(--t), background var(--t); }
    .grip:hover { color: var(--ink); background: var(--surface); }
    .logo { width: 24px; height: 24px; border-radius: var(--r-sm); flex: none; }
    .brand { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .whopop { position: absolute; top: calc(100% - 4px); right: 10px; z-index: 9; width: 290px; padding: 6px;
              background: var(--bg); border: 1px solid var(--line-strong); border-radius: 10px;
              box-shadow: 0 12px 28px rgba(15, 23, 42, .18); animation: pop 120ms ease-out; }
    .who-row { display: flex; align-items: flex-start; gap: 8px; padding: 6px 6px; border-radius: 6px; }
    .who-row + .who-row { border-top: 1px solid var(--line); }
    .who-ic { width: 22px; height: 22px; flex: none; display: flex; align-items: center; justify-content: center;
              border-radius: var(--r-sm); background: var(--surface); color: var(--muted); margin-top: 1px; }
    .who-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .who-l { font-size: var(--fs-meta); color: var(--muted); }
    .who-v { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
    .who-v b { font-size: var(--fs-label); font-weight: 600; color: var(--ink);
               white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .who-v code { font: 500 var(--fs-meta)/1.4 var(--mono); color: var(--accent); flex: none; }
    .who-msg { display: flex; align-items: center; gap: 7px; padding: 12px 10px; font-size: var(--fs-label); color: var(--muted); }
    .brand h1 { margin: 0; font-size: var(--fs-title); font-weight: 600; letter-spacing: -.2px; color: var(--ink);
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .brand h1 span { color: var(--accent); }
    .brand p { margin: 0; font-size: var(--fs-meta); color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tools { display: flex; gap: 2px; }
    .ib { position: relative; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; flex: none;
          border: 1px solid transparent; border-radius: var(--r); background: transparent; color: var(--muted); cursor: pointer;
          transition: background var(--t), color var(--t), border-color var(--t); }
    .ib:hover:not(:disabled) { background: var(--surface); color: var(--ink); border-color: var(--line); }
    .ib:disabled { opacity: .4; cursor: default; }
    .ib.on { background: var(--accent-soft); color: var(--accent); }
    .ib.spin .ic { animation: spin 900ms linear infinite; }
    [data-tip]::after { content: attr(data-tip); position: absolute; top: calc(100% + 6px); right: 0; z-index: 5; white-space: nowrap;
          background: var(--ink); color: #fff; font-size: var(--fs-meta); font-weight: 500; padding: 4px 7px; border-radius: var(--r-sm);
          opacity: 0; transform: translateY(-2px); pointer-events: none; transition: opacity var(--t), transform var(--t); }
    [data-tip]:hover::after, [data-tip]:focus-visible::after { opacity: 1; transform: none; transition-delay: 300ms; }

    .progress { height: 2px; position: relative; flex: none; }
    .progress i { position: absolute; inset: 0 auto 0 0; width: 0; background: var(--accent); transition: width 300ms ease, opacity 300ms ease; }

    /* ---------- Toolbar: search, filters, meta ---------- */
    .toolbar { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px 8px; }
    .search { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 5px 0 9px;
              background: var(--bg); border: 1px solid var(--line-strong); border-radius: var(--r);
              transition: border-color var(--t), box-shadow var(--t); }
    .search:hover { border-color: var(--faint); }
    .search:focus-within { border-color: var(--accent); box-shadow: var(--ring); }
    .search > .ic { color: var(--faint); }
    .search:focus-within > .ic { color: var(--accent); }
    .search input { flex: 1; min-width: 0; height: 100%; border: 0; background: transparent; font-size: var(--fs-body); color: var(--ink); box-shadow: none; }
    .search input::placeholder { color: var(--muted); }
    .search input::-webkit-search-cancel-button { display: none; }
    .clear { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; flex: none; border: 0;
             border-radius: 4px; background: transparent; color: var(--muted); cursor: pointer; transition: background var(--t), color var(--t); }
    .clear:hover { background: var(--surface); color: var(--ink); }

    .filters { display: flex; align-items: center; gap: 6px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
    .sortwrap { margin-left: auto; flex: none; position: relative; }
    .sortbtn { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px; border-radius: var(--r-sm);
               border: 1px solid var(--line-strong); background: var(--bg); color: var(--ink-2);
               font: inherit; font-size: var(--fs-label); font-weight: 500; cursor: pointer;
               transition: background var(--t), border-color var(--t), color var(--t); }
    .sortbtn:hover { border-color: var(--faint); color: var(--ink); }
    .sortbtn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
    .sortbtn[aria-expanded="true"] { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
    .caret { width: 0; height: 0; flex: none; border-left: 3.5px solid transparent; border-right: 3.5px solid transparent;
             border-top: 4.5px solid currentColor; transition: transform var(--t); }
    .sortbtn[aria-expanded="true"] .caret { transform: rotate(180deg); }

    .sortmenu { position: absolute; top: calc(100% + 5px); right: 0; z-index: 8; margin: 0; padding: 4px; min-width: 132px;
                list-style: none; background: var(--bg); border: 1px solid var(--line-strong); border-radius: 10px;
                box-shadow: 0 10px 24px rgba(15, 23, 42, .16); animation: pop 120ms ease-out; }
    @keyframes pop { from { opacity: 0; transform: translateY(-4px) } }
    .sortopt { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 8px;
               border-radius: 6px; font-size: var(--fs-label); color: var(--ink-2); cursor: pointer; white-space: nowrap;
               transition: background var(--t), color var(--t); }
    .sortopt:hover { background: var(--surface); color: var(--ink); }
    .sortopt:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
    .sortopt.on { color: var(--accent); font-weight: 600; }
    .chip { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 8px; border-radius: 999px;
            border: 1px solid var(--line-strong); background: var(--bg); color: var(--muted); font-size: var(--fs-label); font-weight: 500;
            cursor: pointer; transition: background var(--t), border-color var(--t), color var(--t); }
    .chip:hover { border-color: var(--faint); color: var(--ink); }
    .chip b { font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }
    .chip[aria-pressed="true"] { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
    .chip[aria-pressed="true"] b { color: var(--accent); }
    .chip-ic { gap: 4px; padding: 0 8px; }
    .chip-ic .ic { color: var(--faint); }
    .chip-ic[aria-pressed="true"] .ic { color: var(--accent); }
    .chips [data-tip]::after { right: auto; left: 0; }
    .dot { width: 6px; height: 6px; border-radius: 50%; flex: none; background: var(--faint); }
    .dot.pub { background: var(--ok); } .dot.draft { background: var(--warn); }

    .meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 3px 10px 3px 12px;
            font-size: var(--fs-meta); color: var(--muted); background: var(--surface);
            border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
    .meta span { display: inline-flex; align-items: center; gap: 6px; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta strong { color: var(--ink-2); font-weight: 600; }
    .meta [aria-live] .ic { color: var(--warn); }
    .meta .warn { color: var(--warn-ink); font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
    .metaretry { border: 0; background: none; padding: 0 2px; color: var(--accent); font-size: var(--fs-meta); font-weight: 600;
                 cursor: pointer; text-decoration: underline; }
    .spinner { width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--line-strong); border-top-color: var(--accent);
               animation: spin 700ms linear infinite; flex: none; }
    @keyframes spin { to { transform: rotate(360deg) } }

    /* ---------- Body ---------- */
    .body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; background: var(--bg); }

    /* Result rows: name + status on the first line, folder path underneath */
    .list { list-style: none; margin: 0; padding: 4px; display: flex; flex-direction: column; gap: 1px; }
    .row { display: flex; align-items: flex-start; gap: 8px; padding: 7px 8px; border-radius: var(--r); cursor: pointer;
           transition: background var(--t), box-shadow var(--t); }
    .row > .dot { margin-top: 5px; }
    .row:hover { background: var(--surface); box-shadow: inset 0 0 0 1px var(--line); }
    .row.sel { background: var(--sel); box-shadow: inset 0 0 0 1px var(--accent-ring); }
    .row:focus-visible { box-shadow: inset 0 0 0 2px var(--accent); }
    .main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .name { font-size: var(--fs-body); font-weight: 500; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .path { font-size: var(--fs-meta); color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .word { font-size: var(--fs-meta); font-weight: 600; flex: none; color: var(--muted); }
    .word.pub { color: var(--ok-ink); } .word.draft { color: var(--warn-ink); }
    .go { color: var(--faint); flex: none; transition: color var(--t), transform var(--t); }
    .row:hover .go, .row.sel .go { color: var(--accent); transform: translateX(1px); }

    /* Row actions. They take the place of the status word on hover/focus, so the row never changes height
       and the name column just gives up a little width. Hidden from AT until shown, never display:none
       (a focused button inside a display:none box cannot be reached by Tab). */
    .rside { display: flex; align-items: center; gap: 2px; flex: none; margin-top: -1px; }
    .acts { display: none; align-items: center; gap: 1px; }
    .row:hover .acts, .row:focus-within .acts { display: flex; }
    .row:hover .word, .row:focus-within .word { display: none; }
    .ra { position: relative; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; flex: none;
          border: 1px solid transparent; border-radius: var(--r-sm); background: transparent; color: var(--muted); cursor: pointer;
          transition: background var(--t), color var(--t), border-color var(--t); }
    .ra:hover:not(:disabled) { background: var(--bg); color: var(--ink); border-color: var(--line-strong); }
    .ra:disabled { opacity: .35; cursor: default; }
    .ra:focus-visible { outline: 2px solid var(--accent); outline-offset: -1px; }
    .ra.on { color: var(--accent); }
    .row [data-tip]::after { top: auto; bottom: calc(100% + 5px); }
    /* Pin badge: the only marker a pinned row shows when it is not hovered. */
    .pinned-mark { color: var(--accent); flex: none; display: inline-flex; margin-top: -1px; }
    .row:hover .pinned-mark, .row:focus-within .pinned-mark { display: none; }

    /* Group headers. Only rendered once something is pinned: an unpinned account looks exactly as before. */
    .group { display: flex; align-items: center; gap: 5px; padding: 8px 8px 3px; font-size: var(--fs-meta);
             font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
    .group .ic { color: var(--faint); }
    .group.fav { color: var(--accent); }
    .group.fav .ic { color: var(--accent); }
    .group b { font-weight: 700; font-variant-numeric: tabular-nums; }
    .group + .row { margin-top: 0; }

    /* Skeleton */
    .sk { display: flex; align-items: center; gap: 8px; padding: 8px 12px; }
    .sk i { display: block; border-radius: 4px; background: var(--line); animation: pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: .5 } }

    /* Empty / error */
    .state { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; padding: 28px 20px; }
    .halo { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
            background: var(--surface); color: var(--muted); border: 1px solid var(--line); }
    .state.err .halo { background: var(--danger-soft); color: var(--danger); border-color: var(--danger-line); }
    .state h3 { margin: 0; font-size: var(--fs-body); font-weight: 600; }
    .state p { margin: 0; font-size: var(--fs-label); color: var(--muted); max-width: 280px; overflow-wrap: anywhere; }
    .state .tech { font: var(--fs-meta)/1.5 var(--mono); color: var(--muted); max-width: 300px; overflow-wrap: anywhere; }

    /* List footer: range (left) + pagination (right) */
    .lfoot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px 6px 12px;
             border-top: 1px solid var(--line); background: var(--surface); font-size: var(--fs-meta); color: var(--muted); }
    .pager { display: flex; align-items: center; gap: 2px; }
    .pg { width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--r-sm);
          border: 1px solid transparent; background: transparent; color: var(--muted); font-size: var(--fs-meta); font-weight: 600;
          cursor: pointer; font-variant-numeric: tabular-nums; transition: background var(--t), color var(--t), border-color var(--t); }
    .pg:hover:not(:disabled) { background: var(--bg); color: var(--ink); border-color: var(--line-strong); }
    .pg[aria-current="page"] { background: var(--accent); color: #fff; border-color: var(--accent); }
    .pg:disabled { opacity: .35; cursor: default; }
    .gap { color: var(--muted); font-size: var(--fs-meta); padding: 0 2px; }

    /* Buttons */
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 30px; padding: 0 12px; flex: 1; white-space: nowrap;
           border-radius: var(--r); border: 1px solid var(--line-strong); background: var(--bg); color: var(--ink);
           font-size: var(--fs-body); font-weight: 500; cursor: pointer; transition: background var(--t), border-color var(--t); }
    .btn:hover:not(:disabled) { background: var(--surface); border-color: var(--faint); }
    .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
    .btn.primary:hover:not(:disabled) { background: var(--accent-hover); border-color: var(--accent-hover); }
    .btn.sm { height: 26px; padding: 0 10px; flex: none; font-size: 11px; }
    .btn:disabled { opacity: .45; cursor: not-allowed; }
    .state .btn { flex: none; }
    .footer { display: flex; gap: 8px; padding: 8px 12px; border-top: 1px solid var(--line); background: var(--bg); }

    /* Sub-view header (detail / info) */
    .subhd { display: flex; align-items: center; gap: 8px; padding: 4px 8px; min-height: 36px; border-bottom: 1px solid var(--line); background: var(--surface); }
    .back { display: inline-flex; align-items: center; gap: 5px; height: 26px; padding: 0 8px 0 6px; white-space: nowrap; border: 0; border-radius: var(--r-sm);
            background: transparent; color: var(--muted); font-size: var(--fs-label); font-weight: 500; cursor: pointer; transition: background var(--t), color var(--t); }
    .back:hover { background: var(--bg); color: var(--ink); }

    /* ---------- Detail ---------- */
    .body.detail-bg { background: var(--surface); }
    .detail { padding: 8px; display: grid; gap: 8px; }
    .card { background: var(--bg); border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; }
    .card-hd { display: flex; align-items: center; gap: 6px; font-size: var(--fs-micro); font-weight: 600; letter-spacing: .5px; text-transform: uppercase; color: var(--muted); }
    .card-hd .ic { color: var(--faint); }
    .hero { flex-direction: row; align-items: center; gap: 10px; }
    .type { width: 32px; height: 32px; flex: none; display: flex; align-items: center; justify-content: center; border-radius: var(--r);
            background: var(--accent-soft); color: var(--accent); }
    .hero-txt { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .hero h2 { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; }
    .tags { display: flex; gap: 4px; flex-wrap: wrap; }
    .tag, .status { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 7px; border-radius: var(--r-sm);
           font-size: var(--fs-meta); font-weight: 600; background: var(--surface); color: var(--muted); border: 1px solid var(--line); }
    .status.pub { background: var(--ok-soft); color: var(--ok-ink); border-color: var(--ok-line); }
    .status.draft { background: var(--warn-soft); color: var(--warn-ink); border-color: var(--warn-line); }
    .crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 2px; }
    .crumb { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; height: 20px; padding: 0 6px; border-radius: 5px;
             background: var(--surface); border: 1px solid var(--line); font-size: var(--fs-meta); color: var(--ink-2); }
    .crumb span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .crumb .ic { color: var(--faint); }
    .crumb.here { background: var(--accent-soft); border-color: var(--accent-ring); color: var(--accent); font-weight: 600; }
    .crumb.here .ic { color: var(--accent); }
    .crumbs .sep { color: var(--faint); }
    .urlbox { display: flex; align-items: center; gap: 2px; border: 1px solid var(--line); border-radius: var(--r); background: var(--surface); padding: 2px 2px 2px 8px; }
    .urlbox code { flex: 1; min-width: 0; font: var(--fs-meta)/1.5 var(--mono); color: var(--ink); word-break: break-all; }
    .urlbox .ib { width: 26px; height: 26px; }
    .urlbox [data-tip]::after { top: auto; bottom: calc(100% + 6px); }
    .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 0; }
    .tile { display: flex; gap: 8px; align-items: flex-start; min-width: 0; background: var(--bg); border: 1px solid var(--line);
            border-radius: 10px; padding: 7px 9px; transition: border-color var(--t); }
    .tile:hover { border-color: var(--line-strong); }
    .tile-ic { width: 22px; height: 22px; flex: none; border-radius: var(--r-sm); display: flex; align-items: center; justify-content: center;
               background: var(--accent-soft); color: var(--accent); }
    .tile-ic.green { background: var(--ok-soft); color: var(--ok-ink); }
    .tile-ic.amber { background: var(--warn-soft); color: var(--warn-ink); }
    .tile-ic.slate { background: var(--surface); color: var(--muted); }
    .tile-txt { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .tile dt { font-size: var(--fs-meta); color: var(--muted); }
    .tile dd { margin: 0; font-size: var(--fs-body); font-weight: 500; color: var(--ink); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; line-height: 1.3; }
    .tile dd.mono { font-family: var(--mono); font-size: var(--fs-label); }
    .tile dd.muted { color: var(--muted); font-weight: 400; }
    .tile small { display: block; font-size: var(--fs-meta); font-weight: 400; color: var(--muted); }

    /* ---------- Info: About / Shortcuts ---------- */
    .tabs { display: inline-flex; padding: 2px; gap: 2px; border-radius: var(--r); background: var(--line); margin-left: auto; }
    .tab { height: 24px; padding: 0 10px; border: 0; border-radius: var(--r-sm); background: transparent; color: var(--muted);
           font-size: var(--fs-label); font-weight: 500; cursor: pointer; transition: background var(--t), color var(--t); }
    .tab:hover { color: var(--ink); }
    .tab[aria-selected="true"] { background: var(--bg); color: var(--ink); box-shadow: 0 1px 2px rgba(22,36,60,.08); }
    .info { padding: 12px; display: flex; flex-direction: column; gap: 10px; animation: fade 160ms ease; }

    /* ---------- About ---------- */
    .about { animation: fade 160ms ease; padding-bottom: 11px; }
    .ab-hero { padding: 12px 13px 11px; background: linear-gradient(180deg, #f4f8fd 0%, var(--surface) 100%);
            border-bottom: 1px solid var(--line); }
    .ab-hero-top { display: flex; align-items: flex-start; gap: 6px; }
    .ab-hero-txt { flex: 1; min-width: 0; }
    .ab-art { flex: none; margin-top: -6px; }
    .ab-ver { display: inline-block; background: var(--accent-soft); color: var(--accent); font-size: var(--fs-micro);
            font-weight: 700; padding: 2px 7px; border-radius: 999px; letter-spacing: .2px; margin-top: 7px; }
    .ab-hero h2 { margin: 0; font-size: 17px; font-weight: 700; letter-spacing: -.35px; line-height: 1.25; color: var(--ink); }
    .ab-hero h2 span { color: #5b2fd6; }
    .ab-desc { margin: 7px 0 0; font-size: var(--fs-label); line-height: 1.55; color: var(--ink-2); }

    .ab-sec { padding: 11px 13px 5px; display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
    .ab-sec h3 { margin: 0; font-size: var(--fs-body); font-weight: 700; }
    .ab-sec em { font-style: normal; font-size: var(--fs-micro); color: var(--faint); }
    .ab-grid { padding: 0 13px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .ab-card { border: 1px solid var(--line); border-radius: 9px; padding: 6px 8px; background: var(--bg);
               display: flex; align-items: center; gap: 7px; min-width: 0;
               transition: border-color var(--t), background var(--t); }
    .ab-card:hover { border-color: var(--line-strong); background: var(--surface); }
    .ab-ic { width: 22px; height: 22px; border-radius: 6px; flex: none;
             display: inline-flex; align-items: center; justify-content: center; }
    .ab-card b { font-size: var(--fs-label); font-weight: 650; color: var(--ink); line-height: 1.2;
                 min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .ab-ro { margin: 11px 13px 0; display: flex; gap: 9px; align-items: flex-start; background: var(--ok-soft);
          border: 1px solid var(--ok-line); border-radius: 10px; padding: 9px 10px; }
    .ab-ro-ic { color: var(--ok-ink); flex: none; margin-top: 1px; }
    .ab-ro b { display: block; font-size: var(--fs-label); color: var(--ok-ink); font-weight: 700; }
    .ab-ro span { font-size: var(--fs-micro); color: var(--ink-2); line-height: 1.45; }

    .ab-dev { margin: 11px 13px 0; padding-top: 10px; border-top: 1px solid var(--line);
           display: flex; align-items: center; gap: 9px; }
    .ab-av { width: 30px; height: 30px; border-radius: 50%; background: var(--accent-soft); color: var(--accent);
          font-size: var(--fs-label); font-weight: 700; display: flex; align-items: center; justify-content: center; flex: none; }
    .ab-dtxt { flex: 1; min-width: 0; }
    .ab-dtxt b { display: block; font-size: var(--fs-label); font-weight: 650;
              white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ab-dtxt span { font-size: var(--fs-micro); color: var(--muted); }
    .ab-dacts { display: flex; gap: 6px; flex: none; }
    .ab-btn { display: inline-flex; align-items: center; gap: 5px; height: 26px; padding: 0 9px; border-radius: var(--r);
         border: 1px solid var(--line-strong); background: var(--bg); color: var(--ink-2);
         font-size: var(--fs-label); font-weight: 600; text-decoration: none; transition: background var(--t), border-color var(--t); }
    .ab-btn:hover { background: var(--surface); border-color: var(--faint); }
    .ab-btn.li { background: #0A66C2; border-color: #0A66C2; color: #fff; }
    .ab-btn.li:hover { background: #09589f; border-color: #09589f; }
    a.btn { text-decoration: none; }
    .ab-legal { margin: 9px 13px 0; font-size: var(--fs-micro); line-height: 1.45; color: var(--muted); }
    /* In the About view the developer strip lives in the panel footer, so it stays visible at the bottom. */
    .footer .ab-dev { flex: 1; margin: 0; padding: 0; border-top: 0; }

    .keys { list-style: none; margin: 0; padding: 0; border: 1px solid var(--line); border-radius: var(--r); }
    .keys li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 10px; font-size: var(--fs-body); }
    .keys li + li { border-top: 1px solid var(--line); }
    .keys span { display: inline-flex; gap: 4px; flex: none; }
    .muted { margin: 0; font-size: var(--fs-meta); color: var(--muted); }

    /* Narrow windows: drop non-essential extras first */
    /* Short windows: the panel is being capped to the viewport, so buy the About pane its height
       back from the spacing rather than letting it scroll. Normal windows are untouched. */
    @media (max-height: 575px) {
      .ab-hero { padding: 9px 13px 9px; }
      .ab-desc { margin-top: 5px; }
      .ab-sec { padding: 8px 13px 4px; }
      .ab-ro { margin-top: 8px; padding: 7px 10px; }
      .ab-dev { margin-top: 8px; padding-top: 8px; }
    }
    @media (max-width: 380px) {
      .brand p, .search kbd { display: none; }
      .tiles { grid-template-columns: 1fr; }        /* detail tiles carry values, they need the width */
      .ab-grid { gap: 5px; }                        /* About cards are one line each: keep both columns */
      .ab-card { padding: 6px 7px; gap: 6px; }
    }
  `;

  // About screen copy lives here so wording can change without touching layout code.
  // Contact details (email, profile link) come from manifest.json: author.email and homepage_url.
  const DEVELOPER = 'Ajay Singh';
  const ABOUT_TEXT = 'CloudPages pile up fast across folders and business units. ' +
    'Navigator finds the one you need in seconds and takes you straight to it.';
  // icon, ink, tint, title, one line. Tints are pale enough that the ink stays >= 4.5:1 on them.
  const FEATURES = [
    ['zap',       '#0b5cab', '#e7effa', 'Instant Search',   'Search by name, URL, key or folder'],
    ['folder',    '#6d28d9', '#f1ebfd', 'Folder Path',      'See full folder path for each page'],
    ['file-text', '#1d7a4a', '#eaf6ef', 'Page Details',     'View key details at a glance'],
    ['link',      '#9a5b0c', '#fdf1e3', 'Copy URL',         'Copy published URL with one click'],
    ['compass',   '#0b5cab', '#e7effa', 'Quick Navigation', 'Open in Marketing Cloud directly'],
    ['users',     '#6d28d9', '#f1ebfd', 'Large Accounts',   'Optimized for large workspaces'],
  ];
  // Hero artwork. Multi-colour, so it cannot come from the single-stroke icon set; parsed as its own
  // SVG document and imported as nodes, never injected as HTML.
  const HERO_ART = `<svg xmlns="http://www.w3.org/2000/svg" width="78" height="78" viewBox="0 0 96 96" fill="none" aria-hidden="true">
    <circle cx="52" cy="42" r="34" fill="#e7effa"/>
    <rect x="12" y="16" width="58" height="52" rx="7" fill="#fff" stroke="#dfe4ec"/>
    <path d="M12 23a7 7 0 0 1 7-7h44a7 7 0 0 1 7 7v4H12z" fill="#0b5cab"/>
    <circle cx="19" cy="21.5" r="1.7" fill="#fff" opacity=".85"/><circle cx="25" cy="21.5" r="1.7" fill="#fff" opacity=".6"/><circle cx="31" cy="21.5" r="1.7" fill="#fff" opacity=".4"/>
    <path d="M28 46a7 7 0 0 1 1.2-13.9A10 10 0 0 1 48 35a6 6 0 0 1 .8 11.6z" fill="#8fb8e3"/>
    <rect x="20" y="52" width="30" height="4" rx="2" fill="#dbe7f5"/><rect x="20" y="59" width="20" height="4" rx="2" fill="#e8eef7"/>
    <circle cx="66" cy="58" r="14" fill="#fff" stroke="#7c3aed" stroke-width="5"/>
    <path d="M76 68 L85 77" stroke="#7c3aed" stroke-width="6" stroke-linecap="round"/>
    <path d="M60 54a7 7 0 0 1 5-5" stroke="#7c3aed" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>
    <path d="M86 20l1.4 3.4L91 24.8l-3.6 1.4L86 29.6l-1.4-3.4L81 24.8l3.6-1.4z" fill="#7c3aed" opacity=".65"/>
    <path d="M16 74l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#0b5cab" opacity=".45"/>
  </svg>`;
  const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const MOD = IS_MAC ? '⌘' : 'Ctrl';
  const TYPE_ICON = { 'Landing Page': 'file-text', 'Code Resource': 'file-code', 'Microsite': 'globe' };

  // ---------------------------------------------------------------------------------------------
  // Small DOM helpers
  // ---------------------------------------------------------------------------------------------
  function el(tag, props = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'attrs') Object.entries(v).forEach(([a, val]) => val != null && n.setAttribute(a, val));
      else n[k] = v;
    }
    kids.flat(Infinity).filter(k => k != null && k !== false).forEach(k => n.append(k));   // children may arrive nested (row + its group header)
    return n;
  }
  // Icons are parsed as standalone SVG documents (never injected as HTML) and imported as DOM nodes.
  const svgParser = new DOMParser();
  function svg(name, size, stroke) {
    const doc = svgParser.parseFromString(icon(name, size, stroke), 'image/svg+xml');
    return document.importNode(doc.documentElement, true);
  }
  // Same safe path as svg(): parse as an SVG document, import nodes. Never innerHTML.
  function rawSvg(markup) {
    const doc = svgParser.parseFromString(markup, 'image/svg+xml');
    return document.importNode(doc.documentElement, true);
  }
  const fmtDay = d => new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' });
  const fmtTime = d => new Date(d).toLocaleTimeString(undefined, { timeStyle: 'short' });
  const statusCls = s => (s === 'Published' ? 'pub' : s === 'Draft' ? 'draft' : '');
  const statusBadge = s => el('span', { className: 'status ' + statusCls(s), attrs: { 'aria-label': 'Status: ' + (s || 'unknown') } },
    statusCls(s) ? el('span', { className: 'dot ' + statusCls(s) }) : null, s || '—');
  const typeLabel = it => (it.subtype ? `${it.type} · ${it.subtype}` : it.type);
  const typeIconName = type => TYPE_ICON[type] || 'file-text';
  const typeIcon = (type, size) => el('span', { className: 'type', attrs: { 'aria-hidden': 'true' } }, svg(typeIconName(type), size));
  function iconButton(name, label, onClick) {
    const b = el('button', { className: 'ib', type: 'button', attrs: { 'aria-label': label, 'data-tip': label } }, svg(name, 15));
    b.onclick = onClick; return b;
  }
  function openExternal(url) {
    el('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }).click();
  }
  const cssEscape = s => (root.CSS && root.CSS.escape ? root.CSS.escape(s) : s.replace(/["\\]/g, '\\$&'));
  const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

  // ---------------------------------------------------------------------------------------------
  // mount(): builds the panel once and returns { render, query, setPositions }. Callbacks belong to main.js.
  // ---------------------------------------------------------------------------------------------
  function mount({ meta, onOpen, onRefresh, onSearch, onPage, onFilter, onSort, onPin, onMove, onIdentity, cloudPageUrl }) {
    const host = el('div', { id: 'cpf-host' });
    const shadow = host.attachShadow({ mode: 'open' });

    // ---- identity: who is signed in, and which business unit ----
    // Ids come from the API; names are read off Marketing Cloud's own header. Loaded on first open.
    const tagline = el('p', { textContent: 'CloudPage search & navigation' });
    const whoPop = el('div', { className: 'whopop', hidden: true, attrs: { role: 'dialog', 'aria-label': 'Account details' } });
    let who = null, whoLoading = false;

    const whoOpen = () => !whoPop.hidden;
    function closeWho(refocus) {
      whoPop.hidden = true; whoBtn.setAttribute('aria-pressed', 'false'); whoBtn.classList.remove('on');
      if (refocus) whoBtn.focus();
    }
    function toggleWho() {
      if (whoOpen()) return closeWho(true);
      whoPop.hidden = false; whoBtn.setAttribute('aria-pressed', 'true'); whoBtn.classList.add('on');
      if (who && who.error && !whoLoading) who = null;   // a failed read is retried on the next open
      renderWho();
      if (!who && !whoLoading) { whoLoading = true; onIdentity().then(setIdentity).catch(e => setIdentity({ error: e.message })); }
    }
    function setIdentity(v) { whoLoading = false; who = v; applyTagline(); if (whoOpen()) renderWho(); }
    function applyTagline() {
      if (!who || who.error) return;
      const bu = who.buName || 'Business unit';
      tagline.textContent = who.mid ? `${bu} · ${who.mid}` : bu;   // 179px to play with: the word "MID" does not fit
      tagline.title = [who.userName && `Signed in as ${who.userName}`, who.buName, who.mid && `MID ${who.mid}`]
        .filter(Boolean).join(' · ');
    }
    function whoRow(iconName, label, value, id) {
      const vals = el('div', { className: 'who-v' },
        el('b', { textContent: value || '—' }),
        id ? el('code', { textContent: id }) : null);
      const copyable = id || value;
      const btn = copyable ? actBtn('copy', `Copy ${label}`, true, async b => {
        let ok = true; try { await navigator.clipboard.writeText(copyable); } catch { ok = false; }
        b.replaceChildren(svg(ok ? 'check' : 'x', 13, 2)); b.style.color = ok ? 'var(--ok-ink)' : 'var(--danger)';
        setTimeout(() => { b.replaceChildren(svg('copy', 13, 2)); b.style.color = ''; }, 1400);
      }) : null;
      return el('div', { className: 'who-row' },
        el('span', { className: 'who-ic' }, svg(iconName, 13, 2)),
        el('div', { className: 'who-main' }, el('span', { className: 'who-l', textContent: label }), vals),
        btn);
    }
    function renderWho() {
      if (who && who.error) {
        whoPop.replaceChildren(el('div', { className: 'who-msg' }, svg('circle-alert', 13, 2),
          'Could not read account details.'));
        return;
      }
      if (!who) {
        whoPop.replaceChildren(el('div', { className: 'who-msg' }, el('span', { className: 'spinner' }), 'Reading account…'));
        return;
      }
      whoPop.replaceChildren(
        whoRow('user', 'Signed in as', who.userName, who.userId),
        whoRow('building-2', 'Business unit', who.buName, who.mid),
        whoRow('hash', 'Enterprise', who.entName, who.eid),
      );
    }

    // Header
    const whoBtn = iconButton('user', 'Signed in as / business unit', () => toggleWho());
    const refreshBtn = iconButton('refresh-cw', 'Refresh', () => onRefresh());
    const infoBtn = iconButton('info', 'About & shortcuts', () => (view === 'info' ? showList() : renderInfo('about')));
    const closeBtn = iconButton('x', 'Close (Esc)', () => toggle(false));
    const [first, ...rest] = meta.name.split(' ');
    const grip = el('button', { className: 'grip', type: 'button',
      attrs: { 'aria-label': 'Move panel up or down (drag, or use arrow keys)', title: 'Drag to move · ↑ ↓ keys' } }, svg('grip-vertical', 14, 2));
    const header = el('header', { className: 'hd' },
      grip,
      meta.iconUrl ? el('img', { className: 'logo', src: meta.iconUrl, alt: '' }) : null,
      el('div', { className: 'brand' },
        el('h1', {}, first + ' ', rest.length ? el('span', { textContent: rest.join(' ') }) : null),
        tagline),
      el('div', { className: 'tools' }, whoBtn, refreshBtn, infoBtn, closeBtn), whoPop);

    const bar = el('i');
    const progress = el('div', { className: 'progress', attrs: { role: 'progressbar', 'aria-label': 'Loading CloudPages', 'aria-valuemin': 0, 'aria-valuemax': 100 } }, bar);

    // Toolbar: search + filter chips
    const input = el('input', { type: 'search', placeholder: 'Search name, url or folder…', spellcheck: false, autocomplete: 'off',
      attrs: { 'aria-label': 'Search CloudPages', 'aria-controls': 'cpn-results' } });
    const clearBtn = el('button', { className: 'clear', type: 'button', hidden: true, attrs: { 'aria-label': 'Clear search' } }, svg('x', 13, 2));
    const kbdHint = el('kbd', { textContent: `${MOD} K`, attrs: { 'aria-hidden': 'true' } });
    const chips = el('div', { className: 'chips', attrs: { role: 'group', 'aria-label': 'Filter by status' } });
    // Sort control. A native <select> drops an OS-styled list we cannot theme, so this is a small
    // listbox of our own: same keyboard contract, styling that matches the rest of the panel.
    const SORT_LABELS = [['folder', 'Folder', 'Folder path, as in CloudPages'],
                         ['name', 'Name', 'Name, A to Z'],
                         ['modified', 'Newest', 'Last modified, newest first']];
    let sortValue = 'folder';
    const sortLabel = el('span', { textContent: 'Folder' });
    const sortBtn = el('button', { className: 'sortbtn', type: 'button',
      attrs: { 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-label': 'Sort results' } },
      sortLabel, el('i', { className: 'caret', attrs: { 'aria-hidden': 'true' } }));
    const sortMenu = el('ul', { className: 'sortmenu', hidden: true, attrs: { role: 'listbox', 'aria-label': 'Sort by' } });

    function renderSortMenu() {
      sortMenu.replaceChildren(...SORT_LABELS.map(([v, label, hint]) => {
        const li = el('li', { className: 'sortopt' + (v === sortValue ? ' on' : ''), tabIndex: -1,
          attrs: { role: 'option', 'aria-selected': String(v === sortValue), 'data-v': v, title: hint } },
          el('span', { textContent: label }), v === sortValue ? svg('check', 13, 2.4) : null);
        li.onclick = () => { closeSort(); if (v !== sortValue) onSort(v); };
        return li;
      }));
    }
    function openSort() {
      renderSortMenu(); sortMenu.hidden = false; sortBtn.setAttribute('aria-expanded', 'true');
      (sortMenu.querySelector('.sortopt.on') || sortMenu.firstElementChild)?.focus();
    }
    function closeSort(refocus) {
      sortMenu.hidden = true; sortBtn.setAttribute('aria-expanded', 'false');
      if (refocus) sortBtn.focus();
    }
    const sortOpen = () => !sortMenu.hidden;
    sortBtn.onclick = e => { e.stopPropagation(); sortOpen() ? closeSort(true) : openSort(); };
    sortMenu.addEventListener('keydown', e => {
      // Keys handled here must not reach the window-level Esc handler, or one Escape would close
      // the menu AND then the whole panel.
      if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Escape', 'Tab'].includes(e.key)) e.stopPropagation();
      const opts = [...sortMenu.querySelectorAll('.sortopt')];
      const i = opts.indexOf(shadow.activeElement);
      if (e.key === 'ArrowDown')      { e.preventDefault(); (opts[i + 1] || opts[0]).focus(); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); (opts[i - 1] || opts[opts.length - 1]).focus(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts[i]?.click(); }
      else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); closeSort(true); }
    });
    // Any click elsewhere in the panel dismisses it. Esc is handled by the window-level handler below.
    setTimeout(() => panel.addEventListener('pointerdown', ev => {
      const path = ev.composedPath();
      if (sortOpen() && !path.includes(sortMenu) && !path.includes(sortBtn)) closeSort();
      if (whoOpen() && !path.includes(whoPop) && !path.includes(whoBtn)) closeWho();
    }, true), 0);
    const filters = el('div', { className: 'filters' }, chips);
    const toolbar = el('div', { className: 'toolbar' },
      el('div', { className: 'search' }, svg('search', 14, 2), input, clearBtn, kbdHint), filters);

    // Meta row: what the list is showing (left) + the sort control (right). The page number that used
    // to sit here is already in the footer beside the pager, so it is not repeated.
    const metaText = el('span');
    const metaRow = el('div', { className: 'meta' },
      el('span', { attrs: { 'aria-live': 'polite' } }, metaText), el('div', { className: 'sortwrap' }, sortBtn, sortMenu));
    const body = el('div', { className: 'body', id: 'cpn-results' });
    const range = el('span');
    const pager = el('nav', { className: 'pager', attrs: { 'aria-label': 'Pagination' } });
    const lfoot = el('div', { className: 'lfoot', hidden: true }, range, pager);
    const subhd = el('div', { className: 'subhd', hidden: true });
    const footer = el('div', { className: 'footer', hidden: true });
    const listChrome = [toolbar, metaRow];                     // shown only in list view

    const panel = el('section', { className: 'panel v-list', hidden: true, attrs: { 'aria-label': meta.name } },
      header, progress, ...listChrome, subhd, body, lfoot, footer);
    const fab = el('button', { className: 'fab', type: 'button', attrs: { 'aria-label': `Open ${meta.name} (${MOD}+K)`, title: `${meta.name} (${MOD}+K)` } },
      svg('search', 16, 2), el('span', { textContent: 'CloudPages' }));
    shadow.append(el('style', { textContent: STYLES }), panel, fab);
    document.body.append(host);

    // ---- state held by the view (presentation only, never data) ----
    let view = 'list', lastState = null, listScroll = 0, selectedKey = null;
    const keyOf = root.CPF.core.keyOf;      // one definition, shared with the pin store in main.js

    // ---- vertical position: panel and edge tab can be dragged up/down; the right edge stays fixed ----
    // Positions are the top of the panel and the centre of the tab, in px from the top of the window.
    const pos = { panel: null, fab: null };
    // The panel keeps its fixed height until the window is shorter than it; then it follows the window,
    // so its footer is always reachable. Every position calculation uses the effective height.
    const panelH = () => Math.min(PANEL_H, window.innerHeight - EDGE * 2);
    const clampPanel = y => Math.max(EDGE, Math.min(y, window.innerHeight - panelH() - EDGE)) || 0;
    const clampFab = y => Math.max(EDGE + 40, Math.min(y, window.innerHeight - EDGE - 40));
    function applyPositions() {
      const py = clampPanel(pos.panel ?? (window.innerHeight - panelH()) / 2);
      host.style.setProperty('--panel-y', py + 'px');
      const fy = clampFab(pos.fab ?? window.innerHeight / 2);
      host.style.setProperty('--fab-y', fy + 'px');
    }
    function setPositions(p = {}) {
      if (Number.isFinite(p.panel)) pos.panel = p.panel;
      if (Number.isFinite(p.fab)) pos.fab = p.fab;
      applyPositions();
    }
    window.addEventListener('resize', applyPositions);

    // Pointer drag helper. Returns true from onEnd if the pointer actually moved (so clicks still work).
    function draggable(handle, { get, set, cls, target, skip }) {
      handle.addEventListener('pointerdown', e => {
        if (e.button !== 0 || (skip && skip(e))) return;
        const startY = e.clientY, startPos = get();
        let moved = false;
        const move = ev => {
          const dy = ev.clientY - startY;
          if (!moved && Math.abs(dy) < 4) return;          // small jitter = still a click
          moved = true; target.classList.add(cls); set(startPos + dy);
        };
        const end = () => {
          window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end);
          target.classList.remove(cls);
          if (moved) { handle.dataset.dragged = '1'; onMove({ ...pos }); setTimeout(() => delete handle.dataset.dragged, 0); }
        };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', end);
      });
    }
    const currentPanelY = () => clampPanel(pos.panel ?? (window.innerHeight - panelH()) / 2);
    const currentFabY = () => clampFab(pos.fab ?? window.innerHeight / 2);
    const isOpen = () => !panel.hidden;

    // While the panel is open the tab is attached to it, so moving the panel carries the tab along at the
    // same relative height. The gap is captured once, at pointerdown, so the tab never jumps.
    let tabGap = 0;
    function movePanelTo(y) {
      pos.panel = clampPanel(y);
      if (isOpen()) pos.fab = clampFab(pos.panel + tabGap);
      applyPositions();
    }
    // Drag the panel by its header (but not by the header's buttons).
    draggable(header, {
      get: () => { tabGap = currentFabY() - currentPanelY(); return currentPanelY(); },
      set: movePanelTo, cls: 'dragging', target: panel,
      skip: e => e.target.closest && e.target.closest('.tools') });
    // The tab is only draggable on its own while the panel is closed; open, it is part of the panel.
    draggable(fab, { get: currentFabY, set: y => { pos.fab = clampFab(y); applyPositions(); },
      cls: 'dragging', target: fab, skip: () => isOpen() });
    // Keyboard: arrow keys on the grip move the panel (and the tab with it).
    grip.addEventListener('keydown', e => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      tabGap = currentFabY() - currentPanelY();
      movePanelTo(currentPanelY() + (e.key === 'ArrowUp' ? -24 : 24));
      onMove({ ...pos });
    });
    applyPositions();

    // ---- open / close / keyboard ----
    function toggle(show) {
      panel.hidden = !show; fab.classList.toggle('on', show);
      fab.style.right = show ? `min(${PANEL_W}px, 100vw)` : '0';
      if (show) { onOpen(); if (view === 'list') input.focus(); } else fab.focus({ preventScroll: true });
    }
    fab.onclick = () => { if (!fab.dataset.dragged) toggle(panel.hidden); };

    // Ctrl/⌘+K anywhere on the page: open the panel and focus search.
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key || '').toLowerCase() === 'k') {
        e.preventDefault(); e.stopPropagation();
        if (panel.hidden) toggle(true);
        if (view !== 'list') showList();
        input.focus(); input.select();
      }
    }, true);

    // Esc is handled at window level so it works even when focus has fallen back to the page body.
    window.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || panel.hidden) return;
      e.stopPropagation();
      if (sortOpen()) closeSort(true);          // innermost thing first
      else if (whoOpen()) closeWho(true);
      else if (view !== 'list') showList();
      else if (input.value) { setQuery(''); input.focus(); }
      else toggle(false);
    });

    function setQuery(q) { input.value = q; clearBtn.hidden = !q; onSearch(q); }
    input.oninput = () => { clearBtn.hidden = !input.value; onSearch(input.value); };
    clearBtn.onclick = () => { setQuery(''); input.focus(); };
    input.addEventListener('keydown', e => {
      const r = body.querySelector('.row');
      if (!r) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); r.focus(); }
      if (e.key === 'Enter') { e.preventDefault(); r.click(); }
    });

    // ---- view switching ----
    function setChrome(v) {
      view = v;
      panel.classList.toggle('v-list', v === 'list');
      body.classList.toggle('detail-bg', v === 'detail');
      listChrome.forEach(n => (n.hidden = v !== 'list'));
      subhd.hidden = v === 'list';
      footer.hidden = v !== 'detail';
      if (v !== 'list') lfoot.hidden = true;
      infoBtn.classList.toggle('on', v === 'info');
      infoBtn.setAttribute('aria-pressed', String(v === 'info'));
    }
    function showList() {
      setChrome('list');
      if (lastState) renderList(lastState, true);
      const sel = selectedKey && body.querySelector(`.row[data-key="${cssEscape(selectedKey)}"]`);
      (sel || input).focus({ preventScroll: true });
    }
    function backBar(label, onBack, extra) {
      const b = el('button', { className: 'back', type: 'button', title: label + ' (Esc)' }, svg('arrow-left', 14, 2), label);
      b.onclick = onBack;
      subhd.replaceChildren(b, extra || '');
    }

    // ---- loading indicator (visible in every view) ----
    function renderProgress(s) {
      const pct = s.total ? Math.round((s.loaded / s.total) * 100) : 8;
      bar.style.width = (s.loading ? Math.max(pct, 8) : 100) + '%';
      bar.style.opacity = s.loading ? '1' : '0';
      progress.setAttribute('aria-valuenow', s.loading ? pct : 100);
      refreshBtn.classList.toggle('spin', !!s.loading);
    }

    function skeleton() {
      const ph = (w, h, r) => { const i = el('i'); i.style.cssText = `width:${w};height:${h}px;${r ? 'border-radius:' + r : ''}`; return i; };
      return el('div', { attrs: { 'aria-hidden': 'true' } }, [62, 48, 71, 55, 66, 44, 58].map(w =>
        el('div', { className: 'sk' }, ph('6px', 6, '50%'), el('div', { className: 'main' }, ph(w + '%', 10)), ph('44px', 8), ph('8px', 8))));
    }

    function stateBox({ iconName, title, text, action, err }) {
      return el('div', { className: 'state' + (err ? ' err' : ''), attrs: { role: err ? 'alert' : 'status' } },
        el('div', { className: 'halo' }, svg(iconName, 16, 2)),
        el('h3', { textContent: title }), text ? el('p', { textContent: text }) : null, action || null);
    }

    // ---- filters ----
    function renderChips(state) {
      const c = state.counts || { all: 0, Published: 0, Draft: 0 };
      const chip = (key, label, dot, iconName) => {
        const b = el('button', { className: 'chip' + (iconName ? ' chip-ic' : ''), type: 'button',
          attrs: { 'aria-pressed': String(state.status === key), 'aria-label': iconName ? `${label}, ${c[key] ?? 0}` : null,
                   'data-tip': iconName ? label : null } },
          iconName ? svg(iconName, 12, 2) : null, dot ? el('span', { className: 'dot ' + dot }) : null,
          iconName ? null : label, el('b', { textContent: c[key] ?? 0 }));
        b.onclick = () => onFilter(key); return b;
      };
      chips.replaceChildren(chip('all', 'All'), chip('Published', 'Published', 'pub'), chip('Draft', 'Draft', 'draft'),
        chip('pinned', 'Pinned', null, 'star'));
    }

    // ---- row actions (copy / open live / pin) ----
    // Shown in place of the status word on hover or keyboard focus. Every handler stops propagation
    // so pressing a button never also opens the detail view behind it.
    let pinned = new Set();
    const isPinned = it => pinned.has(keyOf(it));

    function actBtn(iconName, label, enabled, handler, on) {
      const b = el('button', { className: 'ra' + (on ? ' on' : ''), type: 'button', disabled: !enabled,
        attrs: { 'aria-label': label, 'data-tip': label } }, svg(iconName, 13, 2));
      b.onclick = e => { e.stopPropagation(); handler(b); };
      b.onkeydown = e => e.stopPropagation();     // arrows/Enter belong to the button, not the row
      return b;
    }

    function rowActions(it) {
      const canLive = !!it.url && it.status === 'Published';
      const copy = actBtn('copy', 'Copy URL', !!it.url, async b => {
        let ok = true;
        try { await navigator.clipboard.writeText(it.url); } catch { ok = false; }
        b.replaceChildren(svg(ok ? 'check' : 'x', 13, 2));
        b.style.color = ok ? 'var(--ok-ink)' : 'var(--danger)';
        b.setAttribute('data-tip', ok ? 'Copied' : 'Copy failed');
        setTimeout(() => { b.replaceChildren(svg('copy', 13, 2)); b.style.color = ''; b.setAttribute('data-tip', 'Copy URL'); }, 1400);
      });
      const live = actBtn('external-link', canLive ? 'Open live page' : 'Not published', canLive, () => openExternal(it.url));
      // Same destination as the detail view's primary button, one click earlier.
      const edit = actBtn('square-code', 'Open in CloudPages', true, () => openExternal(cloudPageUrl(it)));
      const on = isPinned(it);
      const pin = actBtn(on ? 'pin-off' : 'pin', on ? 'Unpin' : 'Pin to top', true, () => onPin(keyOf(it)), on);
      return el('div', { className: 'acts' }, copy, live, edit, pin);
    }

    // ---- list view ----
    // state: { rows, page, pages, from, to, matches, counts, status, loaded, total, loading, error, query }
    function renderList(state, restoreScroll) {
      lastState = state;
      renderProgress(state);
      if (view !== 'list') return;                       // reading detail/info: apply on return
      filters.hidden = !!state.error || !state.loaded;   // counts are meaningless until data arrives
      if (state.sort && state.sort !== sortValue) {
        sortValue = state.sort;
        sortLabel.textContent = (SORT_LABELS.find(o => o[0] === sortValue) || [, 'Folder'])[1];
      }
      pinned = state.pinned instanceof Set ? state.pinned : new Set(state.pinned || []);
      renderChips(state);

      if (state.error) {
        metaText.replaceChildren('Connection problem');
        const retry = el('button', { className: 'btn sm', type: 'button' }, svg('refresh-cw', 13, 2), 'Try again');
        retry.onclick = () => onRefresh();
        const friendly = /logged in|401|403/i.test(state.error)
          ? 'Your Marketing Cloud session may have expired. Refresh Marketing Cloud, then try again.'
          : 'Marketing Cloud did not respond as expected. Check your connection and try again.';
        const box = stateBox({ iconName: 'circle-alert', title: 'Could not load CloudPages', text: friendly, action: retry, err: true });
        box.append(el('code', { className: 'tech', textContent: state.error }));
        body.replaceChildren(box);
        lfoot.hidden = true; return;
      }
      if (!state.loaded && state.loading) {
        metaText.replaceChildren(el('span', { className: 'spinner' }), 'Connecting to Marketing Cloud…');
        body.replaceChildren(skeleton()); lfoot.hidden = true; return;
      }

      // Meta row: "N of TOTAL CloudPages" left; page or loading progress right
      const total = state.total || (state.counts ? state.counts.all : state.matches);   // whole account, not just matches
      if (state.warning && !state.loading) {
        // Some pages failed after others arrived: keep the partial list, say so, offer a retry.
        const retry = el('button', { className: 'metaretry', type: 'button', textContent: 'Retry' });
        retry.onclick = () => onRefresh();
        metaText.replaceChildren(svg('circle-alert', 11, 2),
          el('span', { className: 'warn', title: state.warning, textContent: `Partial: ${state.loaded} of ${state.total} loaded` }), retry);
      } else metaText.replaceChildren(...(state.loading
        ? [el('span', { className: 'spinner' }), `Loading ${state.loaded} of ${state.total}…`]
        : [el('strong', { textContent: state.matches }), ` of ${total} CloudPages`]));

      if (!state.rows.length) {
        const filtered = !!state.query || state.status !== 'all';
        let clear = null;
        if (filtered && !state.loading) {
          clear = el('button', { className: 'btn sm', type: 'button', textContent: 'Clear search & filters' });
          clear.onclick = () => { if (state.status !== 'all') onFilter('all'); setQuery(''); input.focus(); };
        }
        const box = state.loading
          ? stateBox({ iconName: 'search', title: 'No matches yet', text: `Still loading — ${state.loaded} of ${state.total} checked.` })
          : state.status === 'pinned' && !state.query
            ? stateBox({ iconName: 'star', title: 'Nothing pinned yet',
                         text: 'Hover any result and use the pin button to keep it here.' })
            : stateBox({ iconName: 'search-x', title: 'No CloudPages found', text: 'Try searching by name, URL, folder or URL key.', action: clear });
        body.replaceChildren(box);
        lfoot.hidden = true; return;
      }

      // Headers are decided from the rows actually on this page, so they stay correct on every page
      // even when there are more pinned pages than fit on one.
      const anyPinned = (state.pinnedCount || 0) > 0;
      let openedPinned = false, openedRest = false;
      const groupHeader = (iconName, label, count) =>
        el('li', { className: 'group' + (iconName ? ' fav' : ''), attrs: { role: 'presentation' } },
          iconName ? svg(iconName, 12, 2) : null, label, count != null ? el('b', { textContent: ' ' + count }) : null);

      const list = el('ul', { className: 'list', attrs: { 'aria-label': 'CloudPages' } }, state.rows.map((it, idx) => {
        const pathText = it.path.join(' › ') || '—';
        const cls = statusCls(it.status);
        const row = el('li', { className: 'row' + (keyOf(it) === selectedKey ? ' sel' : ''), tabIndex: 0,
          attrs: { 'data-key': keyOf(it), role: 'button', title: `${it.name}\n${pathText}`,
                   'aria-label': `${it.name}, ${it.status || 'unknown status'}, ${pathText}` } },
          el('span', { className: 'dot ' + cls, attrs: { 'aria-hidden': 'true' } }),
          el('div', { className: 'main' },
            el('div', { className: 'name', textContent: it.name }),
            el('div', { className: 'path', textContent: pathText })),
          el('div', { className: 'rside' },
            isPinned(it) ? el('span', { className: 'pinned-mark', attrs: { 'aria-hidden': 'true' } }, svg('pin', 12, 2)) : null,
            el('span', { className: 'word ' + cls, textContent: it.status || '—' }),
            rowActions(it)),
          el('span', { className: 'go', attrs: { 'aria-hidden': 'true' } }, svg('chevron-right', 14, 2)));
        const open = () => { selectedKey = keyOf(it); listScroll = body.scrollTop; renderDetail(it); };
        row.onclick = open;
        row.onkeydown = e => {
          const rows = body.querySelectorAll('.row');
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
          else if (e.key === 'ArrowDown') { e.preventDefault(); (rows[idx + 1] || row).focus(); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); (rows[idx - 1] || input).focus(); }
        };
        if (!anyPinned) return row;
        const head = isPinned(it)
          ? (openedPinned ? null : (openedPinned = true, groupHeader('star', 'Pinned', state.pinnedCount)))
          : (openedRest ? null : (openedRest = true, groupHeader(null, 'All CloudPages')));
        return head ? [head, row] : row;
      }));
      const scroll = restoreScroll ? listScroll : body.scrollTop;
      body.replaceChildren(list);
      body.scrollTop = scroll;
      range.textContent = `${state.from}–${state.to} of ${state.matches}`;
      lfoot.hidden = false;
      renderPager(state);
    }

    function renderPager({ page, pages }) {
      pager.hidden = pages <= 1;
      if (pages <= 1) return;
      const go = n => { body.scrollTop = 0; onPage(n); };
      const nav = (name, target, label, disabled) => {
        const b = el('button', { className: 'pg', type: 'button', disabled, attrs: { 'aria-label': label } }, svg(name, 13, 2));
        b.onclick = () => go(target); return b;
      };
      pager.replaceChildren(
        nav('chevron-left', page - 1, 'Previous page', page === 1),
        ...root.CPF.core.pageNumbers(page, pages).map(n => {
          if (n === '…') return el('span', { className: 'gap', textContent: '…', attrs: { 'aria-hidden': 'true' } });
          const b = el('button', { className: 'pg', type: 'button', textContent: String(n),
            attrs: { 'aria-label': `Page ${n}`, 'aria-current': n === page ? 'page' : null } });
          b.onclick = () => go(n); return b;
        }),
        nav('chevron-right', page + 1, 'Next page', page === pages));
    }

    // ---- detail view ----
    function renderDetail(it) {
      setChrome('detail');
      backBar('Back to search', showList);

      // Location: each folder is a chip; the page itself is highlighted at the end
      const parts = [...it.path, it.name];
      const crumbs = parts.flatMap((p, i) => {
        const last = i === parts.length - 1;
        const chip = el('span', { className: 'crumb' + (last ? ' here' : ''), title: p },
          svg(last ? typeIconName(it.type) : 'folder', 11, 2), el('span', { textContent: p }));
        return i ? [el('span', { className: 'sep', attrs: { 'aria-hidden': 'true' } }, svg('chevron-right', 11, 2)), chip] : [chip];
      });

      const copyBtn = el('button', { className: 'ib', type: 'button', disabled: !it.url, attrs: { 'aria-label': 'Copy URL', 'data-tip': 'Copy URL' } }, svg('copy', 14));
      copyBtn.onclick = async () => {
        let ok = true;
        try { await navigator.clipboard.writeText(it.url); } catch { ok = false; }
        copyBtn.replaceChildren(svg(ok ? 'check' : 'x', 14, 2));
        copyBtn.setAttribute('data-tip', ok ? 'Copied' : 'Copy failed');
        copyBtn.style.color = ok ? 'var(--ok-ink)' : 'var(--danger)';
        setTimeout(() => { copyBtn.replaceChildren(svg('copy', 14)); copyBtn.setAttribute('data-tip', 'Copy URL'); copyBtn.style.color = ''; }, 1500);
      };
      const canLive = !!it.url && it.status === 'Published';
      const liveBtn = el('button', { className: 'ib', type: 'button', disabled: !canLive,
        attrs: { 'aria-label': 'Open live page', 'data-tip': canLive ? 'Open live page' : 'Not published' } }, svg('external-link', 14));
      liveBtn.onclick = () => openExternal(it.url);

      const card = (iconName, title, ...content) =>
        el('section', { className: 'card', attrs: { 'aria-label': title } },
          el('div', { className: 'card-hd' }, svg(iconName, 12, 2), title), ...content);
      const tile = (iconName, tone, label, value, cls = '', sub = '') =>
        el('div', { className: 'tile' },
          el('span', { className: 'tile-ic ' + tone, attrs: { 'aria-hidden': 'true' } }, svg(iconName, 12, 2)),
          el('div', { className: 'tile-txt' }, el('dt', { textContent: label }),
            el('dd', { className: (value ? cls : 'muted'), textContent: value || 'Not available' },
              value && sub ? el('small', { textContent: sub }) : null)));
      const dateTile = (iconName, tone, label, iso) => tile(iconName, tone, label, iso && fmtDay(iso), '', iso && fmtTime(iso));
      const pub = it.status === 'Published';

      body.replaceChildren(el('article', { className: 'detail', attrs: { 'aria-label': it.name } },
        el('div', { className: 'card hero' }, typeIcon(it.type, 16),
          el('div', { className: 'hero-txt' }, el('h2', { textContent: it.name }),
            el('div', { className: 'tags' }, statusBadge(it.status), el('span', { className: 'tag', textContent: typeLabel(it) })))),
        card('folder-open', 'Location', el('div', { className: 'crumbs' }, crumbs)),
        card('link', 'Published URL', el('div', { className: 'urlbox' }, el('code', { textContent: it.url || 'No URL' }), copyBtn, liveBtn)),
        el('dl', { className: 'tiles' },
          tile(pub ? 'circle-check' : 'circle-dashed', pub ? 'green' : 'amber', 'Status', it.status),
          tile('layers', '', 'Type', typeLabel(it)),
          dateTile('calendar-plus', 'slate', 'Created', it.createdDate),
          dateTile('calendar-clock', 'slate', 'Last modified', it.modifiedDate),
          dateTile('send', pub ? 'green' : 'slate', 'Published', it.publishDate),
          tile('key-round', '', 'URL key', it.key, 'mono'))));
      body.scrollTop = 0;

      const openLive = el('button', { className: 'btn', type: 'button', disabled: !canLive,
        attrs: { title: canLive ? 'Open the published page in a new tab' : 'This page is not published' } }, svg('external-link', 14), 'View live page');
      openLive.onclick = () => openExternal(it.url);
      const openCp = el('button', { className: 'btn primary', type: 'button', attrs: { title: 'Opens in a new tab' } }, 'Open in CloudPages', svg('square-code', 14, 2));
      openCp.onclick = () => openExternal(cloudPageUrl(it));   // always a new tab; this tab keeps your search
      footer.replaceChildren(openLive, openCp);
      openCp.focus({ preventScroll: true });
    }

    // ---- info view: About | Shortcuts ----
    function renderInfo(tab) {
      const cameFrom = view === 'detail' ? { node: body.firstChild, footer: [...footer.children] } : null;
      setChrome('info');
      const tabs = el('div', { className: 'tabs', attrs: { role: 'tablist', 'aria-label': 'Information' } });
      const mkTab = (key, label) => {
        const b = el('button', { className: 'tab', type: 'button', textContent: label,
          attrs: { role: 'tab', 'aria-selected': String(tab === key), 'aria-controls': 'cpn-info' } });
        b.onclick = () => { if (tab !== key) { tab = key; draw(); tabs.querySelector('[aria-selected="true"]').focus(); } };
        return b;
      };
      const back = () => {
        if (cameFrom) {
          setChrome('detail'); backBar('Back to search', showList); body.replaceChildren(cameFrom.node); footer.replaceChildren(...cameFrom.footer);
          (footer.querySelector('.primary') || subhd.querySelector('.back')).focus({ preventScroll: true });
        }
        else showList();
      };
      function draw() {
        tabs.replaceChildren(mkTab('about', 'About'), mkTab('keys', 'Shortcuts'));
        backBar(cameFrom ? 'Back to page' : 'Back to search', back, tabs);
        body.replaceChildren(tab === 'about' ? aboutPane() : keysPane());
        body.scrollTop = 0;
        // Developer details are pinned to the footer on the About tab, never scrolled away.
        footer.hidden = tab !== 'about';
        footer.replaceChildren(...(tab === 'about' ? [devStrip()] : []));
      }
      draw();
    }

    function devStrip() {
      return el('div', { className: 'ab-dev' },
        el('span', { className: 'ab-av', textContent: initials(DEVELOPER), attrs: { 'aria-hidden': 'true' } }),
        el('div', { className: 'ab-dtxt' }, el('b', { textContent: DEVELOPER }), el('span', { textContent: 'Developer' })),
        el('div', { className: 'ab-dacts' },
          meta.email ? el('a', { className: 'ab-btn', href: 'mailto:' + meta.email, title: meta.email },
            svg('mail', 13, 2), 'Support') : null,
          meta.profileUrl ? el('a', { className: 'ab-btn li', href: meta.profileUrl, target: '_blank', rel: 'noopener noreferrer',
            attrs: { 'aria-label': DEVELOPER + ' on LinkedIn' } }, svg('linkedin', 13), 'LinkedIn') : null));
    }

    function aboutPane() {
      // One line per feature: six stacked cards do not fit the 468px body, and the titles carry the
      // meaning on their own. The full sentence stays available on hover.
      const feature = ([iconName, ink, tint, title, desc]) =>
        el('div', { className: 'ab-card', attrs: { title: desc } },
          el('span', { className: 'ab-ic', style: `background:${tint};color:${ink}` }, svg(iconName, 12, 2.1)),
          el('b', { textContent: title }));

      return el('div', { className: 'about', id: 'cpn-info', attrs: { role: 'tabpanel' } },
        // The product name and icon are already in the panel header, so the hero leads with the promise.
        el('div', { className: 'ab-hero' },
          el('div', { className: 'ab-hero-top' },
            el('div', { className: 'ab-hero-txt' },
              el('h2', {}, 'Search. Navigate. Open. ', el('span', { textContent: 'Instantly.' })),
              el('span', { className: 'ab-ver', textContent: 'v' + meta.version })),
            el('div', { className: 'ab-art' }, rawSvg(HERO_ART))),
          el('p', { className: 'ab-desc', textContent: ABOUT_TEXT })),

        el('div', { className: 'ab-sec' }, el('h3', { textContent: 'Key Features' }),
          el('em', { textContent: 'Save time and navigate faster' })),
        el('div', { className: 'ab-grid' }, FEATURES.map(feature)),

        el('div', { className: 'ab-ro' },
          el('span', { className: 'ab-ro-ic' }, svg('lock', 15, 2)),
          el('div', {}, el('b', { textContent: 'Read-only' }),
            el('span', { textContent: 'Uses your Marketing Cloud session. No data is modified, collected or sent anywhere.' }))),

        // Store policy: make clear this is an independent tool, not a Salesforce product.
        el('p', { className: 'ab-legal', textContent: 'Independent tool, not affiliated with or endorsed by Salesforce. ' +
          'Salesforce and Marketing Cloud are trademarks of Salesforce, Inc.' }));
    }

    function keysPane() {
      const k = (...keys) => el('span', {}, keys.map(x => el('kbd', { textContent: x })));
      const row = (label, keys) => el('li', {}, el('div', { textContent: label }), keys);
      return el('div', { className: 'info', id: 'cpn-info', attrs: { role: 'tabpanel' } },
        el('ul', { className: 'keys' },
          row('Open extension & focus search', k(MOD, 'K')),
          row('Move through results', k('↑', '↓')),
          row('Open selected page', k('Enter')),
          row('Back · clear search · close', k('Esc'))),
        el('p', { className: 'muted', textContent: `${MOD}+K works anywhere in Marketing Cloud.` }));
    }

    return { render: renderList, query: () => input.value, setPositions };
  }

  (root.CPF = root.CPF || {}).ui = { mount };
})(window);
