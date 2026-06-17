export function renderStudioHtml(): string {
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CREATE SOMETHING Atlas Studio</title>
    <style>
      @font-face {
        font-display: swap;
        font-family: ABCDiatype;
        font-style: normal;
        font-weight: 400;
        src: url('https://ona.com/fonts/ABCDiatype-Regular.woff2') format('woff2');
      }

      @font-face {
        font-display: swap;
        font-family: ABCDiatype;
        font-style: normal;
        font-weight: 700;
        src: url('https://ona.com/fonts/ABCDiatype-Bold.woff2') format('woff2');
      }

      @font-face {
        font-display: swap;
        font-family: 'Martina Plantijn';
        font-style: normal;
        font-weight: 300;
        src: url('https://ona.com/fonts/Martina-Plantijn-Light.woff2') format('woff2');
      }

      :root {
        color-scheme: light;
        --bg: #f9f9f9;
        --panel: #ffffff;
        --panel-soft: #f9f9f9;
        --line: #e1e1e1;
        --line-strong: #cecece;
        --text: #0a0e19;
        --muted: #818181;
        --muted-strong: #636363;
        --ink: #0a0e19;
        --green: #1e3c2c;
        --blue: #0048ff;
        --red: #c41e3a;
        --radius: 8px;
        --shadow-soft: 0 4px 20px #0000000f;
        --node-scale: 1;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background: var(--bg);
        color: var(--text);
        font-family:
          ABCDiatype,
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        font-size: 16px;
        letter-spacing: 0;
        line-height: 1.1;
      }

      button,
      input,
      select,
      textarea {
        font: inherit;
      }

      button,
      .toolbar-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        border: 1px solid #cecece80;
        border-radius: 6px;
        background:
          linear-gradient(#cecece1f 0% 100%),
          #ffffffd9;
        background-blend-mode: plus-darker, normal;
        color: var(--text);
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 400;
        text-decoration: none;
        transition:
          border-color 140ms ease,
          background 140ms ease,
          color 140ms ease,
          opacity 140ms ease;
      }

      button:hover,
      .toolbar-link:hover {
        border-color: var(--line-strong);
        background:
          linear-gradient(#cecece4d 0% 100%),
          #ffffffd9;
      }

      button:active,
      .toolbar-link:active {
        transform: scale(0.98);
      }

      .icon {
        width: 0.94rem;
        height: 0.94rem;
        flex: none;
        stroke-width: 1.55;
      }

      .icon * {
        vector-effect: non-scaling-stroke;
      }

      .shell {
        display: grid;
        grid-template-rows: 64px minmax(0, 1fr) 56px;
        height: 100vh;
      }

      header,
      .output-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0 1rem;
        border-bottom: 1px solid var(--line);
        background:
          linear-gradient(#cecece26 0% 100%),
          #ffffffd9;
        background-blend-mode: plus-darker, normal;
        backdrop-filter: blur(14px);
      }

      .output-bar {
        border-top: 1px solid var(--line);
        border-bottom: 0;
        background:
          linear-gradient(#cecece1f 0% 100%),
          #ffffffd9;
        background-blend-mode: plus-darker, normal;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-width: 0;
      }

      .mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        flex: none;
      }

      .mark svg {
        display: block;
        width: 20px;
        height: 20px;
      }

      .brand strong,
      .panel-title strong {
        display: block;
        font-size: 0.9rem;
        font-weight: 700;
        line-height: 1.15;
      }

      .brand span,
      .panel-title span,
      .meta {
        color: var(--muted);
        font-size: 0.76rem;
      }

      .session-chips {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        margin-left: auto;
      }

      .workspace {
        position: relative;
        display: block;
        min-height: 0;
        overflow: hidden;
      }

      aside {
        min-height: 0;
        overflow: auto;
        background: var(--panel);
      }

      .drawer {
        position: absolute;
        top: 0;
        bottom: 0;
        z-index: 4;
        width: min(392px, calc(100% - 1.5rem));
        background: #ffffff;
        box-shadow: 0 20px 50px #00000012;
        transition: transform 180ms ease;
        will-change: transform;
      }

      .call-drawer {
        left: 0;
        border-right: 1px solid var(--line);
        transform: translateX(calc(-100% - 1px));
      }

      .inspector {
        right: 0;
        border-left: 1px solid var(--line);
        transform: translateX(calc(100% + 1px));
      }

      body.rail-open .call-drawer,
      body.inspector-open .inspector {
        transform: translateX(0);
      }

      body.rail-open .canvas-wrap {
        padding-left: 0;
      }

      .view-toggle[aria-pressed="true"] {
        border-color: #0a0e1924;
        background:
          linear-gradient(#cecece40 0% 100%),
          #ffffffd9;
        color: var(--ink);
      }

      .icon-button {
        width: 1.75rem;
        height: 1.75rem;
        flex: none;
        gap: 0;
        padding: 0;
      }

      .icon-button .icon {
        width: 0.82rem;
        height: 0.82rem;
      }

      .drawer-close {
        margin-top: -0.22rem;
      }

      .panel {
        padding: 1rem;
        border-bottom: 1px solid var(--line);
        background: var(--panel);
      }

      .panel-title {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.85rem;
      }

      .title-lockup {
        display: flex;
        align-items: flex-start;
        gap: 0.55rem;
      }

      .title-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.45rem;
        height: 1.45rem;
        border: 0.5px solid #cecece38;
        border-radius: 5px;
        background:
          linear-gradient(#cecece26 0% 100%),
          #ffffffd9;
        background-blend-mode: plus-darker, normal;
        color: var(--muted-strong);
      }

      .title-icon .icon,
      .canvas-kicker > .icon,
      .count-chip .icon {
        width: 0.78rem;
        height: 0.78rem;
      }

      .canvas-kicker > .icon,
      .count-chip .icon {
        color: var(--muted);
      }

      .canvas-wrap {
        position: relative;
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        background:
          linear-gradient(to right, rgba(10, 14, 25, 0.032) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(10, 14, 25, 0.028) 1px, transparent 1px),
          var(--bg);
        background-size: 72px 72px;
      }

      .canvas-wrap::after {
        position: absolute;
        right: 1.1rem;
        bottom: 1rem;
        z-index: 0;
        width: 18rem;
        height: 18rem;
        border-radius: 999px;
        background: radial-gradient(circle, #0a0e1908 0%, transparent 66%);
        content: "";
        pointer-events: none;
      }

      .canvas-toolbar {
        position: absolute;
        top: 1rem;
        left: 1rem;
        right: 1rem;
        z-index: 3;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        pointer-events: none;
      }

      .canvas-kicker,
      .canvas-legend {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border: 0.5px solid #cecece38;
        border-radius: 8px;
        background:
          linear-gradient(#cecece26 0% 100%),
          #ffffffd9;
        background-blend-mode: plus-darker, normal;
        padding: 0.45rem 0.55rem;
      }

      .canvas-kicker {
        max-width: 360px;
      }

      .canvas-kicker strong {
        font-size: 0.82rem;
      }

      .canvas-kicker span:last-child {
        color: var(--muted);
        font-size: 0.75rem;
        white-space: nowrap;
      }

      .canvas-legend {
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .canvas-brand {
        position: absolute;
        right: 1rem;
        bottom: 1rem;
        z-index: 2;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.35rem;
        height: 1.35rem;
        opacity: 0.55;
        pointer-events: none;
      }

      .canvas-brand-mark {
        display: block;
        width: 1.35rem;
        height: 1.35rem;
        filter: drop-shadow(0 1px 1px rgba(10, 14, 25, 0.08));
      }

      svg#canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
      }

      .node-layer {
        position: absolute;
        inset: 0;
        z-index: 1;
      }

      .edge {
        stroke: #8181817d;
        stroke-width: 1.05;
        fill: none;
      }

      .edge-label {
        fill: #818181;
        font-size: 11px;
        font-weight: 400;
        paint-order: stroke;
        stroke: var(--bg);
        stroke-width: 5px;
      }

      .node {
        position: absolute;
        width: var(--node-width);
        cursor: grab;
        touch-action: none;
      }

      .node.selected {
        z-index: 2;
      }

      .node.dragging {
        z-index: 3;
      }

      .node.dragging,
      .node.dragging:active {
        cursor: grabbing;
      }

      .node-card {
        position: relative;
        display: grid;
        grid-template-rows: auto auto 1fr;
        gap: 0.5rem;
        min-height: 7.75rem;
        overflow: visible;
        border: 1px solid #d8d8d2cc;
        border-left-width: 2px;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: var(--shadow-soft);
        color: var(--text);
        padding: 0.72rem 0.78rem 0.74rem;
      }

      .node.selected .node-card {
        border-color: var(--ink);
        box-shadow:
          0 0 0 1px #0a0e1924,
          var(--shadow-soft);
      }

      .node.kind-human .node-card {
        border-left-color: #afc1fd80;
        background: #ffffff;
      }

      .node.kind-ai .node-card {
        border-left-color: #dbefdbcc;
        background: #ffffff;
      }

      .node.kind-system .node-card {
        border-left-color: #cecece;
        background: #ffffff;
      }

      .node.kind-data .node-card {
        border-left-color: #cecece4d;
        background: #ffffff;
      }

      .node.kind-constraint .node-card {
        border-left-color: #c41e3a4d;
        background: #ffffff;
      }

      .node.kind-touchpoint .node-card {
        border-left-color: #efd4ff80;
        background: #ffffff;
      }

      .node-topline,
      .card-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.55rem;
        min-width: 0;
      }

      .node-kind-chip,
      .node-owner,
      .node-status,
      .status,
      .count-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.28rem;
        border: 1px solid var(--line);
        border-radius: 5px;
        color: var(--muted-strong);
        font-size: 0.68rem;
        font-weight: 400;
        letter-spacing: 0.04em;
        line-height: 1;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .node-kind-chip,
      .node-owner {
        min-width: 0;
        border: 0;
        color: var(--muted);
      }

      .node-kind-chip .icon,
      .card-title .icon,
      .palette .icon {
        width: 0.82rem;
        height: 0.82rem;
        color: var(--muted-strong);
      }

      .node-kind-chip .icon {
        color: var(--muted);
      }

      .node-status,
      .status,
      .count-chip {
        min-height: 1.48rem;
        padding: 0 0.42rem;
        background: #f9f9f980;
      }

      .node-status.run,
      .status.run {
        background: #dbefdbcc;
        color: var(--green);
        border-color: #1e3c2c26;
      }

      .node-status.wait,
      .status.wait {
        background: #afc1fd4d;
        color: var(--blue);
        border-color: #0048ff1a;
      }

      .node-status.stop,
      .status.stop {
        background: #fef2f2;
        color: var(--red);
        border-color: #ef444433;
      }

      .node-title {
        min-width: 0;
        color: var(--text);
        font-size: 0.92rem;
        font-weight: 700;
        line-height: 1.14;
        overflow-wrap: anywhere;
      }

      .node-owner {
        align-self: end;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        text-transform: none;
        font-size: 0.68rem;
        letter-spacing: 0;
      }

      .node-owner span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .node-note-text {
        overflow-wrap: anywhere;
        color: var(--muted);
        font-size: 0.72rem;
        line-height: 1.22;
      }

      .stack {
        display: grid;
        gap: 0.62rem;
      }

      .rail-list {
        display: grid;
      }

      .card {
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: var(--panel);
        padding: 0.72rem;
      }

      .rail-item {
        border: 0;
        border-top: 1px solid var(--line);
        border-radius: 0;
        background: transparent;
        padding: 0.82rem 0;
      }

      .rail-item:first-child {
        border-top: 0;
        padding-top: 0;
      }

      .rail-item:last-child {
        padding-bottom: 0;
      }

      .rail-item .card-title {
        font-size: 0.9rem;
        font-weight: 700;
      }

      .rail-item p {
        margin: 0.16rem 0 0;
        color: var(--muted);
        font-size: 0.82rem;
        line-height: 1.32;
      }

      .rail-item .actions {
        margin-top: 0.1rem;
      }

      .suggestion-card {
        display: grid;
        gap: 0.55rem;
      }

      .note-card {
        color: var(--muted-strong);
      }

      .card-title {
        display: flex;
        align-items: center;
        gap: 0.42rem;
        min-width: 0;
        font-weight: 400;
        line-height: 1.15;
      }

      .card-title span {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .card p {
        margin: 0.25rem 0 0;
        color: var(--muted);
        font-size: 0.82rem;
        line-height: 1.32;
      }

      .rail-item .status {
        border-color: #cecece66;
        background: transparent;
      }

      .palette {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.45rem;
      }

      .palette button,
      .output-bar a,
      .output-bar button,
      header button {
        min-height: 2.2rem;
        padding: 0 0.68rem;
      }

      .palette button {
        justify-content: flex-start;
      }

      .actions button .icon,
      .toolbar-link .icon {
        width: 0.86rem;
        height: 0.86rem;
      }

      .primary .icon {
        color: currentColor;
        opacity: 0.9;
      }

      .primary {
        background: var(--ink);
        color: white;
        border-color: var(--ink);
      }

      .primary:hover {
        background: #151a27;
        color: white;
      }

      .small-button {
        min-height: 1.9rem;
        padding: 0 0.58rem;
        background: #ffffff;
        color: var(--text);
      }

      .suggestion-card .small-button {
        color: var(--muted-strong);
      }

      .suggestion-card .small-button:hover {
        color: var(--ink);
      }

      textarea,
      input,
      select {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 7px;
        background: var(--panel);
        color: var(--text);
        padding: 0.7rem;
      }

      textarea::placeholder,
      input::placeholder {
        color: #81818199;
      }

      textarea {
        min-height: 92px;
        resize: vertical;
      }

      label {
        display: grid;
        gap: 0.35rem;
        color: var(--muted);
        font-size: 0.72rem;
        font-weight: 400;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .field-grid {
        display: grid;
        gap: 0.65rem;
      }

      .actions {
        display: flex;
        gap: 0.45rem;
        flex-wrap: wrap;
      }

      .actions button {
        min-height: 2.2rem;
        padding: 0 0.65rem;
      }

      .empty {
        color: var(--muted);
        font-size: 0.88rem;
        line-height: 1.45;
      }

      .terminal {
        overflow: auto;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: #101521;
        color: #f4f4ef;
        padding: 0.78rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 0.76rem;
        line-height: 1.45;
        white-space: pre-wrap;
      }

      .output-summary {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
      }

      .output-summary strong {
        font-size: 0.9rem;
      }

      @media (max-width: 1180px) {
        .drawer {
          width: min(360px, calc(100% - 1rem));
        }
      }

      @media (max-width: 780px) {
        .shell {
          grid-template-rows: auto minmax(0, 1fr) auto;
        }

        header,
        .output-bar {
          align-items: flex-start;
          flex-direction: column;
          padding: 0.8rem;
        }

        .canvas-legend,
        .session-chips {
          display: none;
        }

        .drawer {
          width: 100%;
          max-height: none;
        }

        :root {
          --node-scale: 0.92;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <header>
        <div class="brand">
          <div class="mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" focusable="false">
              <rect width="32" height="32" fill="#0A0E19"></rect>
              <path d="M16 4 26.39 10 16 16 5.61 10Z" fill="#FFFFFF"></path>
              <path d="M5.61 10 16 16 16 28 5.61 22Z" fill="#FFFFFF" fill-opacity="0.6"></path>
              <path d="M16 16 26.39 10 26.39 22 16 28Z" fill="#FFFFFF" fill-opacity="0.3"></path>
            </svg>
          </div>
          <div>
            <strong>Atlas Studio</strong>
            <span id="session-title">Loading session...</span>
          </div>
        </div>
        <div class="session-chips" aria-label="Session state">
          <span class="count-chip"><span data-lucide="radio"></span><span>Agent live</span></span>
          <span class="count-chip"><span id="suggestion-count">0 queued</span></span>
        </div>
        <div class="actions">
          <button id="rail-toggle" class="view-toggle" data-icon="messages-square" aria-pressed="false" type="button">Rail</button>
          <button id="inspector-toggle" class="view-toggle" data-icon="scan-line" aria-pressed="false" type="button">Inspector</button>
          <button id="refresh-button" data-icon="refresh-cw" type="button">Refresh</button>
          <button id="copy-command-button" data-icon="clipboard" type="button">Copy command</button>
        </div>
      </header>

      <main class="workspace">
        <section class="canvas-wrap" aria-label="Atlas workflow canvas">
          <div class="canvas-toolbar">
            <div class="canvas-kicker">
              <span data-lucide="workflow"></span>
              <strong>Workflow map</strong>
              <span id="canvas-summary">0 nodes / 0 edges</span>
            </div>
            <div class="canvas-legend" aria-label="Run wait stop legend">
              <span class="status run">Run</span>
              <span class="status wait">Wait</span>
              <span class="status stop">Stop</span>
            </div>
          </div>
          <svg id="canvas" viewBox="0 0 1180 780" role="img" aria-label="Live Atlas session map">
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#afafa7"></path>
              </marker>
            </defs>
            <g id="edge-layer"></g>
          </svg>
          <div id="node-layer" class="node-layer" aria-label="Atlas workflow nodes"></div>
          <div class="canvas-brand" aria-hidden="true">
            <svg class="canvas-brand-mark" viewBox="0 0 32 32" focusable="false">
              <rect width="32" height="32" fill="#0A0E19"></rect>
              <path d="M16 4 26.39 10 16 16 5.61 10Z" fill="#FFFFFF"></path>
              <path d="M5.61 10 16 16 16 28 5.61 22Z" fill="#FFFFFF" fill-opacity="0.6"></path>
              <path d="M16 16 26.39 10 26.39 22 16 28Z" fill="#FFFFFF" fill-opacity="0.3"></path>
            </svg>
          </div>
        </section>

        <aside id="call-drawer" class="drawer call-drawer" aria-label="Call rail">
          <section class="panel">
            <div class="panel-title">
              <div class="title-lockup">
                <span class="title-icon" data-lucide="messages-square"></span>
                <div>
                  <strong>Call Rail</strong>
                  <span>Live notes and agent suggestions</span>
                </div>
              </div>
              <button class="icon-button drawer-close" data-close-drawer="rail" type="button" aria-label="Close call rail" title="Close rail">
                <span data-lucide="x"></span>
              </button>
            </div>
            <form id="observation-form" class="stack">
              <label>
                Observation
                <textarea id="observation-input" placeholder="Capture what the client says. Mention approval, data, systems, risk, or touchpoints."></textarea>
              </label>
              <button class="primary" data-icon="plus" type="submit">Add observation</button>
            </form>
          </section>

          <section class="panel">
            <div class="panel-title">
              <div class="title-lockup">
                <span class="title-icon" data-lucide="sparkles"></span>
                <div>
                  <strong>Suggestions</strong>
                  <span>Review before truth</span>
                </div>
              </div>
              <span class="count-chip" id="suggestions-chip">0</span>
            </div>
            <div id="suggestions" class="rail-list"></div>
          </section>

          <section class="panel">
            <div class="panel-title">
              <div class="title-lockup">
                <span class="title-icon" data-lucide="notebook-tabs"></span>
                <div>
                  <strong>Recent Notes</strong>
                  <span>Shared session memory</span>
                </div>
              </div>
            </div>
            <div id="observations" class="rail-list"></div>
          </section>
        </aside>

        <aside id="inspector-drawer" class="drawer inspector" aria-label="Inspector and palette">
          <section class="panel">
            <div class="panel-title">
              <div class="title-lockup">
                <span class="title-icon" data-lucide="scan-line"></span>
                <div>
                  <strong>Inspector</strong>
                  <span id="inspector-subtitle">Select a node</span>
                </div>
              </div>
              <button class="icon-button drawer-close" data-close-drawer="inspector" type="button" aria-label="Close inspector" title="Close inspector">
                <span data-lucide="x"></span>
              </button>
            </div>
            <div id="inspector" class="field-grid"></div>
          </section>

          <section class="panel">
            <div class="panel-title">
              <div class="title-lockup">
                <span class="title-icon" data-lucide="blocks"></span>
                <div>
                  <strong>Palette</strong>
                  <span>Add Atlas primitives</span>
                </div>
              </div>
            </div>
            <div class="palette" id="palette"></div>
          </section>

          <section class="panel">
            <div class="panel-title">
              <div class="title-lockup">
                <span class="title-icon" data-lucide="terminal"></span>
                <div>
                  <strong>Agent Console</strong>
                  <span>Terminal mutation path</span>
                </div>
              </div>
            </div>
            <div id="agent-command" class="terminal"></div>
          </section>
        </aside>
      </main>

      <div class="output-bar">
        <div class="output-summary">
          <strong id="canvas-counts">0 nodes / 0 edges</strong>
          <span class="meta" id="updated-at"></span>
        </div>
        <div class="actions">
          <a id="markdown-export" class="toolbar-link" data-icon="file-text" href="#">Client summary</a>
          <a id="json-export" class="toolbar-link" data-icon="braces" href="#">JSON</a>
        </div>
      </div>
    </div>

    <script>
      const sessionId = location.pathname.match(/\/sessions\/([^/]+)/)?.[1] ?? '';
      const iconPaths = {
        'blocks': '<rect width="7" height="7" x="14" y="3" rx="1"></rect><path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1Z"></path><path d="M21 14h-7"></path><path d="M17.5 10.5v7"></path>',
        'bot': '<path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path>',
        'braces': '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"></path><path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"></path>',
        'check': '<path d="M20 6 9 17l-5-5"></path>',
        'clipboard': '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>',
        'database': '<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"></path>',
        'file-text': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z"></path><path d="M14 2v6h6"></path><path d="M16 13H8"></path><path d="M16 17H8"></path><path d="M10 9H8"></path>',
        'lock-keyhole': '<circle cx="12" cy="16" r="1"></circle><rect x="3" y="10" width="18" height="12" rx="2"></rect><path d="M7 10V7a5 5 0 0 1 10 0v3"></path>',
        'messages-square': '<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"></path><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"></path>',
        'notebook-tabs': '<path d="M2 6h4"></path><path d="M2 10h4"></path><path d="M2 14h4"></path><path d="M2 18h4"></path><rect width="16" height="20" x="4" y="2" rx="2"></rect><path d="M15 2v20"></path><path d="M15 7h5"></path><path d="M15 12h5"></path><path d="M15 17h5"></path>',
        'plus': '<path d="M5 12h14"></path><path d="M12 5v14"></path>',
        'radio': '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"></path><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"></path><circle cx="12" cy="12" r="2"></circle><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"></path><path d="M19.1 4.9c3.9 3.9 3.9 10.3 0 14.2"></path>',
        'refresh-cw': '<path d="M3 12a9 9 0 0 1 15.54-6.16L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-15.54 6.16L3 16"></path><path d="M8 16H3v5"></path>',
        'scan-line': '<path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><path d="M7 12h10"></path>',
        'shield-alert': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.68-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path>',
        'sparkles': '<path d="M9.9 2.8 8.7 7l-4.2 1.2 4.2 1.2 1.2 4.2 1.2-4.2 4.2-1.2L11.1 7z"></path><path d="M19 12.5 18.3 15l-2.5.7 2.5.7.7 2.5.7-2.5 2.5-.7-2.5-.7z"></path>',
        'terminal': '<path d="m4 17 6-6-6-6"></path><path d="M12 19h8"></path>',
        'user-round': '<circle cx="12" cy="8" r="5"></circle><path d="M20 21a8 8 0 0 0-16 0"></path>',
        'waypoints': '<circle cx="12" cy="4.5" r="2.5"></circle><path d="m10.2 6.3-3.9 3.9"></path><circle cx="4.5" cy="12" r="2.5"></circle><path d="M7 12h10"></path><circle cx="19.5" cy="12" r="2.5"></circle><path d="m13.8 6.3 3.9 3.9"></path><path d="m17.7 13.8-3.9 3.9"></path><circle cx="12" cy="19.5" r="2.5"></circle><path d="m6.3 13.8 3.9 3.9"></path>',
        'workflow': '<rect width="8" height="8" x="3" y="3" rx="2"></rect><path d="M7 11v4a2 2 0 0 0 2 2h4"></path><rect width="8" height="8" x="13" y="13" rx="2"></rect>',
        'x': '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>'
      };
      const kindIcon = {
        actor: 'user-round',
        human: 'shield-alert',
        ai: 'bot',
        system: 'workflow',
        data: 'database',
        constraint: 'lock-keyhole',
        touchpoint: 'waypoints'
      };
      let session = null;
      let palette = null;
      let selectedNodeId = null;
      let dragging = null;
      let dragFrame = null;
      let saveTimer = null;
      let sessionEvents = null;
      let fallbackTimer = null;

      function esc(value) {
        return String(value ?? '')
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;');
      }

      function icon(name) {
        const body = iconPaths[name] ?? iconPaths['workflow'];
        return '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
      }

      function formatKind(kind) {
        return kind === 'ai' ? 'AI' : String(kind ?? '');
      }

      function formatSessionClient(client) {
        const label = String(client ?? '').replace(/^CREATE SOMETHING\s*/i, '').trim();
        return label || String(client ?? '');
      }

      function hydrateIcons() {
        document.querySelectorAll('[data-lucide]').forEach((target) => {
          if (target.querySelector('svg')) return;
          target.innerHTML = icon(target.dataset.lucide);
        });
        document.querySelectorAll('[data-icon]').forEach((target) => {
          if (target.querySelector('svg')) return;
          const label = target.textContent.trim();
          target.innerHTML = icon(target.dataset.icon) + '<span>' + esc(label) + '</span>';
        });
      }

      function setDrawer(name, open) {
        const className = name === 'rail' ? 'rail-open' : 'inspector-open';
        const wasOpen = document.body.classList.contains(className);
        document.body.classList.toggle(className, open);
        const button = document.getElementById(name + '-toggle');
        if (button) button.setAttribute('aria-pressed', open ? 'true' : 'false');
        return wasOpen !== open;
      }

      function toggleDrawer(name) {
        const className = name === 'rail' ? 'rail-open' : 'inspector-open';
        setDrawer(name, !document.body.classList.contains(className));
      }

      async function requestJson(url, options = {}) {
        const res = await fetch(url, {
          ...options,
          headers: {
            'content-type': 'application/json',
            ...(options.headers ?? {})
          }
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        return res.json();
      }

      async function loadSession() {
        const next = await requestJson('/api/sessions/' + encodeURIComponent(sessionId));
        if (session && next.updatedAt === session.updatedAt) return;
        session = next;
        render();
      }

      async function loadPalette() {
        palette = await requestJson('/api/palette');
        renderPalette();
      }

      function startFallbackPoll() {
        if (fallbackTimer) return;
        fallbackTimer = setInterval(() => {
          if (!dragging) loadSession().catch(console.error);
        }, 650);
      }

      function connectSessionEvents() {
        if (!('EventSource' in window)) {
          startFallbackPoll();
          return;
        }
        if (sessionEvents) sessionEvents.close();
        sessionEvents = new EventSource('/api/sessions/' + encodeURIComponent(sessionId) + '/events');
        sessionEvents.addEventListener('session', (event) => {
          if (dragging) return;
          const next = JSON.parse(event.data);
          if (session && next.updatedAt === session.updatedAt) return;
          session = next;
          render();
        });
        sessionEvents.addEventListener('error', () => {
          sessionEvents?.close();
          sessionEvents = null;
          startFallbackPoll();
        });
      }

      const world = { width: 1180, height: 780 };

      function canvasFrame() {
        const frame = document.querySelector('.canvas-wrap').getBoundingClientRect();
        const scale = Math.min(frame.width / world.width, frame.height / world.height);
        return {
          width: frame.width,
          height: frame.height,
          scale,
          offsetX: Math.max(0, (frame.width - world.width * scale) / 2),
          offsetY: Math.max(0, (frame.height - world.height * scale) / 2)
        };
      }

      function visualWidth(node, frame = canvasFrame()) {
        const titleLength = String(node.label ?? '').length;
        const noteLength = String(node.notes || node.evidence || '').length;
        const min = frame.width < 740 ? 206 : 226;
        const max = Math.min(frame.width < 740 ? 238 : 292, frame.width * 0.36);
        const contentWidth = titleLength > 24 || noteLength > 120 ? max : 238;
        return Math.round(Math.max(min, Math.min(contentWidth, max)));
      }

      function nodeLayout(node, frame = canvasFrame()) {
        return {
          x: Math.round(frame.offsetX + node.x * frame.scale),
          y: Math.round(frame.offsetY + node.y * frame.scale),
          width: visualWidth(node, frame)
        };
      }

      function measuredNodeBounds() {
        const canvasRect = document.getElementById('canvas').getBoundingClientRect();
        return new Map(
          [...document.querySelectorAll('.node')].map((element) => {
            const rect = element.getBoundingClientRect();
            return [
              element.dataset.nodeId,
              {
                left: rect.left - canvasRect.left,
                top: rect.top - canvasRect.top,
                width: rect.width,
                height: rect.height,
                centerX: rect.left - canvasRect.left + rect.width / 2,
                centerY: rect.top - canvasRect.top + rect.height / 2
              }
            ];
          })
        );
      }

      function overlaps(a, b, gap = 12) {
        return !(
          a.left + a.width + gap <= b.left ||
          b.left + b.width + gap <= a.left ||
          a.top + a.height + gap <= b.top ||
          b.top + b.height + gap <= a.top
        );
      }

      function settleNodeCollisions() {
        const layer = document.getElementById('node-layer');
        const margin = 16;
        const toolbarClearance = 72;
        const placed = [];
        const elements = [...layer.querySelectorAll('.node')].sort((a, b) => {
          const topDelta = Number.parseFloat(a.style.top) - Number.parseFloat(b.style.top);
          if (Math.abs(topDelta) > 1) return topDelta;
          return Number.parseFloat(a.style.left) - Number.parseFloat(b.style.left);
        });

        elements.forEach((element) => {
          const width = element.offsetWidth;
          const height = element.offsetHeight;
          const maxLeft = Math.max(margin, layer.clientWidth - width - margin);
          let left = Math.min(Math.max(Number.parseFloat(element.style.left), margin), maxLeft);
          let top = Math.max(Number.parseFloat(element.style.top), toolbarClearance);
          const candidate = { left, top, width, height };

          for (let pass = 0; pass < 80; pass += 1) {
            const collision = placed.find((item) => overlaps(candidate, item));
            if (!collision) break;
            candidate.top = collision.top + collision.height + 12;
          }

          element.style.left = candidate.left + 'px';
          element.style.top = candidate.top + 'px';
          placed.push(candidate);
        });
      }

      function findNodeElement(nodeId) {
        return [...document.querySelectorAll('.node')].find((element) => element.dataset.nodeId === nodeId) ?? null;
      }

      function paintDraggingNode() {
        if (!dragging?.moved) return;
        const element = findNodeElement(dragging.node.id);
        if (!element) {
          renderNodes();
          renderEdges();
          return;
        }
        const layout = nodeLayout(dragging.node);
        element.style.left = layout.x + 'px';
        element.style.top = layout.y + 'px';
        element.classList.add('dragging', 'selected');
        renderEdges();
      }

      function scheduleDragPaint() {
        if (dragFrame) return;
        dragFrame = requestAnimationFrame(() => {
          dragFrame = null;
          paintDraggingNode();
        });
      }

      function renderEdges() {
        const svg = document.getElementById('canvas');
        const canvasRect = svg.getBoundingClientRect();
        svg.setAttribute('viewBox', '0 0 ' + canvasRect.width + ' ' + canvasRect.height);
        const layer = document.getElementById('edge-layer');
        const boundsById = measuredNodeBounds();
        layer.innerHTML = session.canvas.edges
          .map((edge) => {
            const source = boundsById.get(edge.source);
            const target = boundsById.get(edge.target);
            if (!source || !target) return '';
            const horizontal = Math.abs(target.centerX - source.centerX) >= Math.abs(target.centerY - source.centerY);
            const forward = target.centerX >= source.centerX;
            const a = horizontal
              ? { x: forward ? source.left + source.width : source.left, y: source.centerY }
              : { x: source.centerX, y: target.centerY >= source.centerY ? source.top + source.height : source.top };
            const b = horizontal
              ? { x: forward ? target.left : target.left + target.width, y: target.centerY }
              : { x: target.centerX, y: target.centerY >= source.centerY ? target.top : target.top + target.height };
            const labelX = (a.x + b.x) / 2;
            const labelY = (a.y + b.y) / 2 - 10;
            const bend = Math.max(60, Math.min(130, Math.abs(b.x - a.x) * 0.38));
            const direction = b.x >= a.x ? 1 : -1;
            return '<path class="edge" marker-end="url(#arrow)" d="M' + a.x + ',' + a.y + ' C' + (a.x + direction * bend) + ',' + a.y + ' ' + (b.x - direction * bend) + ',' + b.y + ' ' + b.x + ',' + b.y + '"></path>' +
              (edge.label ? '<text class="edge-label" x="' + labelX + '" y="' + labelY + '" text-anchor="middle">' + esc(edge.label) + '</text>' : '');
          })
          .join('');
      }

      function renderNodes() {
        const layer = document.getElementById('node-layer');
        const frame = canvasFrame();
        layer.innerHTML = session.canvas.nodes
          .map((node) => {
            const selected = node.id === selectedNodeId ? ' selected' : '';
            const dragClass = dragging?.node.id === node.id && dragging.moved ? ' dragging' : '';
            const layout = nodeLayout(node, frame);
            const owner = node.owner || node.createdBy || 'agent';
            const note = node.notes || node.evidence || 'Boundary and evidence can be added here.';
            return '<div class="node kind-' + esc(node.kind) + ' status-' + esc(node.status) + selected + dragClass + '" data-node-id="' + esc(node.id) + '" style="left: ' + layout.x + 'px; top: ' + layout.y + 'px; --node-width: ' + layout.width + 'px;">' +
              '<div class="node-card">' +
              '<div class="node-topline"><span class="node-kind-chip">' + icon(kindIcon[node.kind]) + '<span>' + esc(formatKind(node.kind)) + '</span></span><span class="node-status ' + esc(node.status) + '">' + esc(node.status) + '</span></div>' +
              '<div class="node-title">' + esc(node.label) + '</div>' +
              '<div><div class="node-owner"><span>' + esc(owner) + '</span></div><div class="node-note-text">' + esc(note) + '</div></div>' +
              '</div>' +
              '</div>';
          })
          .join('');

        if (!dragging) settleNodeCollisions();

        layer.querySelectorAll('.node').forEach((element) => {
          element.addEventListener('pointerdown', (event) => {
            if (event.button !== undefined && event.button !== 0) return;
            const node = session.canvas.nodes.find((item) => item.id === element.dataset.nodeId);
            if (!node) return;
            event.preventDefault();
            element.setPointerCapture?.(event.pointerId);
            selectedNodeId = node.id;
            dragging = {
              node,
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              originalX: node.x,
              originalY: node.y,
              frame: canvasFrame(),
              moved: false
            };
            layer.querySelectorAll('.node.selected').forEach((item) => item.classList.remove('selected'));
            element.classList.add('selected');
            renderInspector();
          });
        });
      }

      function renderLists() {
        const suggestions = document.getElementById('suggestions');
        const queued = session.suggestions.filter((item) => item.status === 'queued');
        suggestions.innerHTML = queued.length
          ? queued.slice(0, 8).map((item) =>
              '<div class="rail-item suggestion-card"><div class="card-heading"><div class="card-title">' + icon(kindIcon[item.payload.kind]) + '<span>' + esc(item.payload.label) + '</span></div><span class="status ' + esc(item.payload.status) + '">' + esc(formatKind(item.payload.kind)) + '</span></div><p>' + esc(item.reason) + '</p><div class="actions"><button class="small-button" data-accept="' + esc(item.id) + '" type="button">' + icon('check') + '<span>Accept</span></button></div></div>'
            ).join('')
          : '<p class="empty">No queued suggestions yet. Add observations from the call or let Codex write to the session.</p>';
        suggestions.querySelectorAll('[data-accept]').forEach((button) => {
          button.addEventListener('click', async () => {
            session = await requestJson('/api/sessions/' + encodeURIComponent(sessionId) + '/suggestions/' + encodeURIComponent(button.dataset.accept) + '/accept', { method: 'POST', body: '{}' });
            render();
          });
        });

        const observations = document.getElementById('observations');
        observations.innerHTML = session.observations.length
          ? session.observations.slice(0, 8).map((item) => '<div class="rail-item note-card"><div class="card-title">' + icon(item.source === 'agent' ? 'bot' : 'user-round') + '<span>' + esc(item.source) + '</span></div><p>' + esc(item.text) + '</p></div>').join('')
          : '<p class="empty">No observations captured yet.</p>';
      }

      function renderInspector() {
        const node = session.canvas.nodes.find((item) => item.id === selectedNodeId);
        const inspector = document.getElementById('inspector');
        document.getElementById('inspector-subtitle').textContent = node ? node.id : 'Select a node';
        if (!node) {
          inspector.innerHTML = '<p class="empty">Select a canvas node to edit label, owner, status, notes, and evidence.</p>';
          return;
        }

        inspector.innerHTML =
          '<label>Label<input id="field-label" value="' + esc(node.label) + '"></label>' +
          '<label>Owner<input id="field-owner" value="' + esc(node.owner ?? '') + '"></label>' +
          '<label>Status<select id="field-status">' +
          ['unknown', 'run', 'wait', 'stop'].map((status) => '<option value="' + status + '"' + (node.status === status ? ' selected' : '') + '>' + status + '</option>').join('') +
          '</select></label>' +
          '<label>Notes<textarea id="field-notes">' + esc(node.notes ?? '') + '</textarea></label>' +
          '<label>Evidence<textarea id="field-evidence">' + esc(node.evidence ?? '') + '</textarea></label>' +
          '<button class="primary" id="save-node" type="button">' + icon('check') + '<span>Save node</span></button>';
        document.getElementById('save-node').addEventListener('click', async () => {
          session = await requestJson('/api/sessions/' + encodeURIComponent(sessionId) + '/nodes/' + encodeURIComponent(node.id), {
            method: 'PATCH',
            body: JSON.stringify({
              label: document.getElementById('field-label').value,
              owner: document.getElementById('field-owner').value,
              status: document.getElementById('field-status').value,
              notes: document.getElementById('field-notes').value,
              evidence: document.getElementById('field-evidence').value
            })
          });
          render();
        });
      }

      function renderPalette() {
        if (!palette) return;
        const target = document.getElementById('palette');
        target.innerHTML = Object.keys(palette)
          .map((kind) => '<button data-kind="' + esc(kind) + '" type="button">' + icon(kindIcon[kind]) + '<span>' + esc(formatKind(kind)) + '</span></button>')
          .join('');
        target.querySelectorAll('[data-kind]').forEach((button) => {
          button.addEventListener('click', async () => {
            session = await requestJson('/api/sessions/' + encodeURIComponent(sessionId) + '/nodes', {
              method: 'POST',
              body: JSON.stringify({ kind: button.dataset.kind, createdBy: 'operator' })
            });
            selectedNodeId = session.canvas.nodes.at(-1)?.id ?? selectedNodeId;
            render();
          });
        });
      }

      function renderMeta() {
        const queuedCount = session.suggestions.filter((item) => item.status === 'queued').length;
        const counts = session.canvas.nodes.length + ' nodes / ' + session.canvas.edges.length + ' edges';
        document.getElementById('session-title').textContent = formatSessionClient(session.client) + ' / ' + session.workflow;
        document.getElementById('canvas-counts').textContent = counts;
        document.getElementById('canvas-summary').textContent = counts;
        document.getElementById('suggestion-count').textContent = queuedCount + ' queued';
        document.getElementById('suggestions-chip').textContent = String(queuedCount);
        document.getElementById('updated-at').textContent = 'Updated ' + new Date(session.updatedAt).toLocaleTimeString();
        document.getElementById('markdown-export').href = '/api/sessions/' + encodeURIComponent(sessionId) + '/export.md';
        document.getElementById('json-export').href = '/api/sessions/' + encodeURIComponent(sessionId);
        const command = 'pnpm atlas:studio observe --session ' + sessionId + ' --suggest --text "client says..."';
        document.getElementById('agent-command').textContent = command;
      }

      function render() {
        if (!session) return;
        renderMeta();
        renderNodes();
        renderEdges();
        renderLists();
        renderInspector();
      }

      hydrateIcons();

      document.getElementById('rail-toggle').addEventListener('click', () => {
        toggleDrawer('rail');
      });
      document.getElementById('inspector-toggle').addEventListener('click', () => {
        toggleDrawer('inspector');
      });
      document.querySelectorAll('[data-close-drawer]').forEach((button) => {
        button.addEventListener('click', () => {
          setDrawer(button.dataset.closeDrawer, false);
        });
      });

      window.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        const scale = dragging.frame.scale || 1;
        const dx = (event.clientX - dragging.startX) / scale;
        const dy = (event.clientY - dragging.startY) / scale;
        if (!dragging.moved && Math.hypot(event.clientX - dragging.startX, event.clientY - dragging.startY) < 6) return;
        dragging.moved = true;
        dragging.node.x = Math.round(dragging.originalX + dx);
        dragging.node.y = Math.round(dragging.originalY + dy);
        scheduleDragPaint();
      });

      function finishDrag() {
        if (!dragging) return;
        if (dragFrame) {
          cancelAnimationFrame(dragFrame);
          dragFrame = null;
          paintDraggingNode();
        }
        const node = dragging.node;
        const moved = dragging.moved;
        dragging = null;
        if (!moved) {
          setDrawer('inspector', true);
          return;
        }
        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          session = await requestJson('/api/sessions/' + encodeURIComponent(sessionId) + '/nodes/' + encodeURIComponent(node.id), {
            method: 'PATCH',
            body: JSON.stringify({ x: node.x, y: node.y })
          });
          render();
        }, 80);
      }

      window.addEventListener('pointerup', finishDrag);
      window.addEventListener('pointercancel', finishDrag);
      window.addEventListener('resize', () => {
        if (session) render();
      });

      document.getElementById('observation-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const input = document.getElementById('observation-input');
        const text = input.value.trim();
        if (!text) return;
        session = await requestJson('/api/sessions/' + encodeURIComponent(sessionId) + '/observations', {
          method: 'POST',
          body: JSON.stringify({ text, source: 'operator', suggest: true })
        });
        input.value = '';
        render();
      });

      document.getElementById('refresh-button').addEventListener('click', loadSession);
      document.getElementById('copy-command-button').addEventListener('click', async () => {
        await navigator.clipboard.writeText(document.getElementById('agent-command').textContent);
      });

      Promise.all([loadSession(), loadPalette()])
        .then(() => {
          window.addEventListener('load', () => {
            setTimeout(connectSessionEvents, 800);
          });
          if (document.readyState === 'complete') {
            setTimeout(connectSessionEvents, 800);
          }
        })
        .catch((error) => {
          document.body.innerHTML = '<pre>' + esc(error.stack || error.message) + '</pre>';
        });
    </script>
  </body>
</html>`;
}
