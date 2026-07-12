export function roomPage(input: { roomId: string; nonce: string }): string {
  const roomId = escapeHtml(input.roomId);
  const nonce = escapeHtml(input.nonce);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta name="csp-nonce" content="${nonce}">
  <title>CREATE SOMETHING / ROOM</title>
  <link rel="preconnect" href="https://api.fontshare.com">
  <link rel="preconnect" href="https://cdn.fontshare.com" crossorigin>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&amp;display=swap">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ibm/plex-mono/css/ibm-plex-mono-all.css">
  <style nonce="${nonce}">
    :root{color-scheme:light;--paper:#f3f3f0;--panel:#fff;--ink:#090909;--muted:#5e6268;--line:#d7d7d2;--signal:#0057b8;--signal-soft:#dce8f5;--ready:#007a4d;--stop:#c62026;--mono:"IBM Plex Mono",SFMono-Regular,Menlo,Monaco,Consolas,monospace;--sans:"Satoshi","Helvetica Neue",Helvetica,Arial,system-ui,sans-serif}
    *{box-sizing:border-box}html,body{margin:0;min-width:320px;min-height:100%;background:var(--paper);color:var(--ink);font:16px/1.45 var(--sans)}
    body{background-image:linear-gradient(rgb(9 9 9/.035) 1px,transparent 1px),linear-gradient(90deg,rgb(9 9 9/.035) 1px,transparent 1px);background-size:40px 40px}
    button,input,rtk-meeting{border-radius:0}.shell{min-height:100vh;padding:18px}.bar{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);background:var(--panel)}
    .bar div{display:grid;gap:5px;padding:12px 15px;border-right:1px solid var(--line)}.bar div:last-child{border:0}.label,.eyebrow{color:var(--muted);font:700 9px/1.2 var(--mono);letter-spacing:.08em;text-transform:uppercase}.bar strong{font:700 11px/1.2 var(--mono);text-transform:uppercase}
    .hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.4fr);gap:32px;align-items:end;margin-top:18px;padding:clamp(28px,5vw,60px);border-bottom:5px solid var(--signal);background:var(--ink);color:white}.hero .eyebrow{color:#8fc1f2}.hero h1{margin:12px 0 0;font:800 clamp(2.4rem,7vw,6rem)/.88 var(--sans);letter-spacing:-.06em;text-transform:uppercase}.spec{display:grid;gap:11px;padding-left:22px;border-left:1px solid rgb(255 255 255/.25);font:700 10px/1.3 var(--mono);text-transform:uppercase}
    .gate{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:18px;margin-top:18px}.panel{padding:clamp(20px,4vw,38px);border:1px solid var(--line);border-top:4px solid var(--ink);background:var(--panel)}h2{margin:0 0 12px;font:800 clamp(1.5rem,3vw,2.5rem)/1 var(--sans);letter-spacing:-.035em;text-transform:uppercase}.lede{max-width:62ch;color:var(--muted)}
    form{display:grid;gap:12px;margin-top:26px;padding-top:22px;border-top:4px solid var(--signal)}label{display:grid;gap:7px;color:var(--muted);font:700 10px/1.2 var(--mono);letter-spacing:.06em;text-transform:uppercase}input{width:100%;min-height:50px;padding:12px;border:1px solid #9c9c96;background:white;color:var(--ink);font:16px/1.2 var(--sans)}button{min-height:46px;padding:12px 16px;border:1px solid var(--ink);background:var(--ink);color:white;font:700 11px/1 var(--mono);letter-spacing:.05em;text-transform:uppercase;cursor:pointer;box-shadow:inset 5px 0 var(--signal)}button:hover{background:var(--signal)}button:focus-visible,input:focus-visible{outline:3px solid var(--signal);outline-offset:3px}button:disabled{cursor:not-allowed;opacity:.5}
    .status{padding:14px 16px;border-left:5px solid var(--signal);background:var(--signal-soft);font:700 11px/1.45 var(--mono);text-transform:uppercase}.checklist{display:grid;gap:0;margin-top:18px;border:1px solid var(--line)}.checklist div{display:grid;grid-template-columns:94px 1fr;gap:12px;padding:13px 15px;border-bottom:1px solid var(--line)}.checklist div:last-child{border:0}.checklist strong{font:700 10px/1.3 var(--mono);text-transform:uppercase}
    .meeting{display:grid;grid-template-rows:auto minmax(0,1fr);height:calc(100vh - 36px);min-height:620px;border:1px solid var(--line);background:var(--ink)}.meeting-head{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:12px 14px;background:var(--panel);border-bottom:1px solid var(--line)}.meeting-head strong{font:800 12px/1 var(--mono);text-transform:uppercase}.meeting-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}.meeting-actions button{min-height:38px;padding:9px 12px}.meeting-actions .danger{border-color:var(--stop);background:white;color:var(--stop);box-shadow:inset 5px 0 var(--stop)}rtk-meeting{display:block;width:100%;height:100%;min-height:0;background:var(--ink)}
    [hidden]{display:none!important}.error{border-left-color:var(--stop);background:#f3dadd;color:var(--stop)}
    @media(max-width:760px){.shell{padding:10px}.bar{grid-template-columns:repeat(2,1fr)}.bar div:nth-child(2){border-right:0}.bar div:nth-child(-n+2){border-bottom:1px solid var(--line)}.hero,.gate{grid-template-columns:1fr}.spec{padding:18px 0 0;border-top:1px solid rgb(255 255 255/.25);border-left:0}.meeting{height:calc(100vh - 20px);min-height:540px}.meeting-head{align-items:flex-start;flex-direction:column}.meeting-actions{width:100%}.meeting-actions button{flex:1}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}}
  </style>
</head>
<body>
  <main class="shell" data-room-id="${roomId}">
    <section id="room-gate">
      <div class="bar" aria-label="Room system status">
        <div><span class="label">System</span><strong>CREATE SOMETHING / ROOM</strong></div>
        <div><span class="label">Mode</span><strong>1 HOST / 1 GUEST</strong></div>
        <div><span class="label">Media</span><strong>ENCRYPTED IN TRANSIT</strong></div>
        <div><span class="label">Recording</span><strong>OFF</strong></div>
      </div>
      <header class="hero">
        <div><span class="eyebrow">CONTROLLED MEETING SURFACE</span><h1>Meet without the meeting tax.</h1></div>
        <div class="spec"><span>30 / 60 minute workflow</span><span>Audio · video · screen share</span><span>BACKGROUND BLUR</span><span>No account required</span></div>
      </header>
      <div class="gate">
        <section class="panel">
          <span class="eyebrow">DEVICE CHECK</span>
          <h2>Enter the room</h2>
          <p class="lede">Use the name other participants should see. Camera and microphone selection happens on the next screen before you join.</p>
          <form id="join-form">
            <label for="display-name">Display name<input id="display-name" name="displayName" autocomplete="name" maxlength="80" required></label>
            <button id="join-room" type="submit">Continue to device setup</button>
          </form>
        </section>
        <aside class="panel">
          <div id="room-status" class="status" role="status" aria-live="polite">Validating secure room access.</div>
          <div class="checklist">
            <div><span class="label">01 / Access</span><strong>Room-bound capability</strong></div>
            <div><span class="label">02 / Setup</span><strong>Choose camera and microphone</strong></div>
            <div><span class="label">03 / Join</span><strong>Connect when ready</strong></div>
            <div><span class="label">04 / Privacy</span><strong>Available from the live room controls</strong></div>
          </div>
        </aside>
      </div>
    </section>
    <section id="meeting-stage" class="meeting" hidden>
      <div class="meeting-head">
        <strong>CREATE SOMETHING / LIVE ROOM</strong>
        <div class="meeting-actions"><button id="toggle-microphone" type="button" aria-pressed="true" hidden>Mute mic</button><button id="toggle-camera" type="button" aria-pressed="true" hidden>Turn camera off</button><button id="toggle-screen-share" type="button" aria-pressed="false" hidden>Share screen</button><button id="background-blur" type="button" aria-pressed="false" hidden>Blur background</button><button id="end-room" class="danger" type="button" hidden>End for everyone</button></div>
      </div>
      <rtk-meeting id="realtimekit-meeting" mode="fill" show-setup-screen="true"></rtk-meeting>
    </section>
  </main>
  <script type="module" src="/assets/room-client.js"></script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character] ?? character);
}
