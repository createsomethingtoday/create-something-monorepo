import { TEMPLATE_CARD_STYLES } from '../cards/TemplateCard';

/**
 * Accent used for outlines drawn on host-page elements. Those live in other
 * components' shadow roots, where our custom properties do not resolve, so the
 * literal has to travel with the inline style — from here, not by hand.
 */
export const TMCHAT_ACCENT = '#146ef5';
export const TMCHAT_ACCENT_RGB = '20,110,245';

export const CHAT_STYLES = `
/* ── Theme tokens ───────────────────────────────────────────────────────────
   The palette, radii, shadow and easing follow the Template Marketplace
   redesign (its .rd-* layer): ink #080808, secondary #5a5a5a, hairline
   #e0e0e0, surface #f0f0f0, Webflow blue for the one primary action, 4px
   controls and 8px surfaces. They are custom properties, declared on every
   root this stylesheet owns (the launcher and panel live in the component's
   shadow root; the backdrop is a sibling of the panel), so a host can retheme
   without a code deploy.

   Deliberately not switched by prefers-color-scheme: this component renders on
   light marketplace pages, and following the OS would make it the only dark
   element there. A host that wants a dark surface sets these instead. */
.tmchat-launcher, .tmchat-panel, .tmchat-backdrop {
  --tmchat-accent: #146ef5;
  --tmchat-accent-hover: #0f5bd1;
  --tmchat-accent-ring: rgba(20,110,245,0.15);
  --tmchat-fg: #080808;
  --tmchat-fg2: #5a5a5a;
  --tmchat-line: #e0e0e0;
  --tmchat-line-strong: #ababab;
  --tmchat-surface: #f0f0f0;
  --tmchat-bg: #fff;
  --tmchat-radius: 4px;
  --tmchat-radius-lg: 8px;
  --tmchat-shadow: 0 24px 48px rgba(0,21,53,0.16);
  --tmchat-shadow-sm: 0 8px 24px rgba(0,21,53,0.12);
  --tmchat-ease: cubic-bezier(0.165, 0.84, 0.44, 1);
  --tmchat-launcher-inset: 24px;
  --tmchat-z-launcher: 9000;
  --tmchat-z-panel: 9001;
  --tmchat-z-backdrop: 99999998;
  --tmchat-z-immersive: 99999999;
}
.tmchat-launcher {
  position: fixed;
  right: var(--tmchat-launcher-inset, 24px); bottom: var(--tmchat-launcher-inset, 24px);
  z-index: var(--tmchat-z-launcher, 9000);
  display: inline-flex; align-items: center; gap: 8px;
  padding: 15px 20px; border: 0; border-radius: var(--tmchat-radius); cursor: pointer;
  background: var(--tmchat-accent, #146ef5); color: #fff;
  font-family: "WF Visual Sans Variable", "WF Visual Sans", Arial, sans-serif;
  font-size: 15px; font-weight: 600; line-height: 1.2; box-shadow: var(--tmchat-shadow-sm);
  transition: background 160ms ease, transform 240ms var(--tmchat-ease), box-shadow 240ms var(--tmchat-ease);
  animation: tmchat-launcher-in 360ms var(--tmchat-ease) both;
}
@keyframes tmchat-launcher-in { from { opacity: 0; transform: translateY(8px); } }
.tmchat-launcher:hover { background: var(--tmchat-accent-hover, #0f5bd1); transform: translateY(-2px); box-shadow: var(--tmchat-shadow); }
.tmchat-launcher:active { transform: translateY(0); }
.tmchat-undo:focus-visible,
.tmchat-launcher:focus-visible,
.tmchat-iconbtn:focus-visible,
.tmchat-intro-toggle:focus-visible,
.tmchat-chip:focus-visible,
.tmchat-jump:focus-visible,
.tmchat-send:focus-visible,
.tmchat-preview-back:focus-visible,
.tmchat-devicebtn:focus-visible,
.tmchat-preview-open:focus-visible,
.tmchat-preview-cta:focus-visible,
.tmchat-input:focus-visible {
  outline: 2px solid var(--tmchat-accent, #146ef5); outline-offset: 2px;
}
.tmchat-backdrop {
  position: fixed; inset: 0; z-index: var(--tmchat-z-backdrop, 99999998);
  background: rgba(8,8,8,0.44);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  animation: tmchat-fade 240ms ease both;
}
@keyframes tmchat-fade { from { opacity: 0; } }
.tmchat-panel {
  position: fixed;
  right: var(--tmchat-launcher-inset, 24px); bottom: var(--tmchat-launcher-inset, 24px);
  z-index: var(--tmchat-z-panel, 9001);
  display: flex; flex-direction: column;
  width: min(440px, calc(100vw - 32px)); height: min(640px, calc(100vh - 48px));
  border: 1px solid var(--tmchat-line); border-radius: var(--tmchat-radius-lg); overflow: hidden;
  background: var(--tmchat-bg); box-shadow: var(--tmchat-shadow);
  font-family: "WF Visual Sans Variable", "WF Visual Sans", Arial, sans-serif;
  color: var(--tmchat-fg); font-size: 14px; line-height: 1.5;
  transform-origin: 100% 100%;
  transition: bottom 160ms ease;
}
.tmchat-panel.entering { animation: tmchat-in 320ms var(--tmchat-ease); }
@keyframes tmchat-in { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: none; } }
.tmchat-panel.inline {
  position: relative; right: auto; bottom: auto; z-index: auto;
  width: 100%; height: 100%; min-height: 560px;
  box-shadow: none;
}
.tmchat-panel.inline.entering { animation: none; }
.tmchat-panel.immersive {
  /* Above the webflow.com sticky navigation — the immersive state is a modal
     and nothing on the host page should paint over it. */
  position: fixed; top: 24px; bottom: 24px; left: 0; right: 0; margin: 0 auto; z-index: var(--tmchat-z-immersive, 99999999);
  width: min(1120px, calc(100vw - 48px)); height: auto; min-height: 0;
  box-shadow: 0 32px 80px rgba(0,21,53,0.28);
}
.tmchat-header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  min-height: 56px; padding: 10px 12px 10px 20px;
  border-bottom: 1px solid var(--tmchat-line); background: var(--tmchat-bg);
}
.tmchat-header-title { margin: 0; font-weight: 600; font-size: 16px; line-height: 1.3; letter-spacing: -0.01em; }
.tmchat-panel.immersive .tmchat-header-title { font-size: 20px; line-height: 1.4; }
.tmchat-turnstile:empty { display: none; }
.tmchat-turnstile:not(:empty) {
  flex: 0 0 auto; display: flex; justify-content: center;
  padding: 8px 16px; border-top: 1px solid var(--tmchat-line); background: var(--tmchat-bg);
}
.tmchat-header-actions { display: flex; align-items: center; gap: 4px; }
.tmchat-iconbtn {
  border: 0; background: transparent; cursor: pointer; color: var(--tmchat-fg2);
  min-width: 36px; height: 36px; padding: 0; border-radius: var(--tmchat-radius);
  font-family: inherit; font-size: 13px; font-weight: 500; line-height: 1;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  transition: background 140ms ease, color 140ms ease;
}
.tmchat-iconbtn:hover { background: var(--tmchat-surface); color: var(--tmchat-fg); }
.tmchat-iconbtn:active { background: var(--tmchat-line); }
/* New chat is destructive, so the first click only arms it: the icon gives
   way to a labelled confirm, and a second click clears the conversation. */
.tmchat-iconbtn.armed {
  padding: 0 10px; background: var(--tmchat-fg); color: #fff;
  animation: tmchat-chip-in 200ms var(--tmchat-ease) both;
}
.tmchat-iconbtn.armed:hover { background: #363636; color: #fff; }
.tmchat-scroll {
  flex: 1 1 auto; overflow-y: auto; padding: 20px;
  display: flex; flex-direction: column; gap: 16px;
  overscroll-behavior: contain; scrollbar-color: var(--tmchat-line) transparent;
  /* Wide layouts key off the conversation's own width, not the variant, so a
     narrow inline placement keeps the docked layout. */
  container-type: inline-size; container-name: tmchat;
}
/* Compositor-only entrances: transform + opacity, no layout properties. */
.tmchat-msg, .tmchat-display, .tmchat-typing, .tmchat-turn-row {
  animation: tmchat-rise 280ms var(--tmchat-ease) both;
}
@keyframes tmchat-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
/* Chips arrive one by one after the reply settles — the whole row popping in
   at once reads as a layout jump. Delay is set inline per chip. */
.tmchat-followups .tmchat-chip, .tmchat-starters .tmchat-chip { animation: tmchat-chip-in 320ms var(--tmchat-ease) both; }
@keyframes tmchat-chip-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.tmchat-grid > div, .tmchat-strip > div {
  animation: tmchat-card 420ms var(--tmchat-ease) both;
}
@keyframes tmchat-card { from { opacity: 0; transform: translateY(16px) scale(0.985); } to { opacity: 1; transform: none; } }
/* The reader's words sit in a quiet surface chip; the finder's reply is plain
   editorial text. Blue stays reserved for the actions. */
.tmchat-msg { max-width: 92%; white-space: pre-wrap; overflow-wrap: break-word; }
.tmchat-panel.immersive .tmchat-msg { max-width: 680px; font-size: 16px; }
.tmchat-msg.user {
  align-self: flex-end; background: var(--tmchat-surface); color: var(--tmchat-fg);
  padding: 10px 14px; border-radius: var(--tmchat-radius-lg) var(--tmchat-radius-lg) 2px var(--tmchat-radius-lg);
}
.tmchat-msg.assistant { align-self: flex-start; max-width: 100%; font-size: 15px; line-height: 1.55; }
.tmchat-msg.assistant strong { font-weight: 600; }
/* ── Empty state: welcome and starter ideas rest above the composer ── */
.tmchat-empty { margin-top: auto; display: grid; gap: 20px; }
.tmchat-empty-mark {
  width: 40px; height: 40px; border-radius: var(--tmchat-radius-lg);
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--tmchat-fg); color: #fff;
  animation: tmchat-rise 280ms var(--tmchat-ease) both;
}
.tmchat-msg.assistant.tmchat-welcome {
  max-width: 44ch; font-size: 16px; line-height: 1.5; color: var(--tmchat-fg);
}
.tmchat-starters { display: grid; border-top: 1px solid var(--tmchat-line); }
.tmchat-starters .tmchat-chip.tmchat-starter { text-wrap: balance; }
@container tmchat (min-width: 720px) {
  .tmchat-msg.assistant.tmchat-welcome { max-width: 52ch; font-size: 20px; line-height: 1.4; letter-spacing: -0.005em; }
  .tmchat-starters { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 32px; }
}
.tmchat-starters-label, .tmchat-refine-label {
  color: var(--tmchat-fg2); font-size: 13px; font-weight: 500; line-height: 1.4;
}
.tmchat-starters-wrap { display: grid; gap: 10px; }
.tmchat-chip.tmchat-starter {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  width: 100%; min-height: 48px; padding: 12px 0; text-align: left;
  border: 0; border-bottom: 1px solid var(--tmchat-line); border-radius: 0; background: transparent;
  color: var(--tmchat-fg); font-size: 14px; font-weight: 500; line-height: 1.4;
}
.tmchat-chip.tmchat-starter svg { flex: 0 0 auto; color: var(--tmchat-fg2); transition: transform 240ms var(--tmchat-ease), color 140ms ease; }
.tmchat-chip.tmchat-starter:hover { border-color: var(--tmchat-line); border-bottom-color: var(--tmchat-accent); color: var(--tmchat-accent); background: transparent; }
.tmchat-chip.tmchat-starter:hover svg { color: var(--tmchat-accent); transform: translate(2px, -2px); }
.tmchat-turn-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; align-self: flex-start; }
.tmchat-undo {
  display: inline-flex; align-items: center; gap: 6px; min-height: 32px;
  border: 1px solid var(--tmchat-line); border-radius: var(--tmchat-radius); background: var(--tmchat-bg); color: var(--tmchat-fg);
  padding: 0 10px; font-family: inherit; font-size: 12px; font-weight: 500; cursor: pointer;
  transition: border-color 140ms ease;
}
.tmchat-undo:hover { border-color: var(--tmchat-fg); }
.tmchat-turn-status {
  display: inline-flex; align-items: center; gap: 8px;
  color: var(--tmchat-fg2); font-size: 12px; font-weight: 500; line-height: 1.4;
}
.tmchat-turn-status::before {
  content: ""; flex: 0 0 auto; width: 6px; height: 6px; border-radius: 50%; background: var(--tmchat-accent);
}
.tmchat-turn-status[data-outcome="stopped"]::before, .tmchat-turn-status[data-outcome="failed"]::before { background: var(--tmchat-line-strong); }
.tmchat-sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
.tmchat-intro { align-self: flex-start; max-width: 92%; color: var(--tmchat-fg2); font-size: 13px; }
.tmchat-intro-toggle {
  display: inline-flex; align-items: center; gap: 6px;
  border: 0; background: transparent; cursor: pointer; padding: 4px 0; border-radius: var(--tmchat-radius);
  color: var(--tmchat-fg2); font: inherit; font-weight: 500; text-align: left;
}
.tmchat-intro-toggle::after {
  content: ""; width: 6px; height: 6px; margin-top: -3px;
  border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg); transition: transform 240ms var(--tmchat-ease);
}
.tmchat-intro-toggle[aria-expanded="true"]::after { transform: translateY(3px) rotate(-135deg); }
.tmchat-intro-toggle:hover { color: var(--tmchat-fg); }
.tmchat-intro-copy { padding: 6px 0 2px; max-width: 560px; line-height: 1.5; animation: tmchat-rise 240ms var(--tmchat-ease) both; }
.tmchat-intro-copy[hidden] { display: none; }
.tmchat-caret {
  display: inline-block; width: 2px; height: 1em; margin-left: 2px;
  background: var(--tmchat-accent); vertical-align: -0.15em;
  animation: tmchat-blink 1s steps(2, start) infinite;
}
@keyframes tmchat-blink { 50% { opacity: 0; } }
.tmchat-display { align-self: stretch; }
.tmchat-display-title { font-weight: 600; margin: 4px 0 12px; font-size: 16px; line-height: 1.3; letter-spacing: -0.01em; }
.tmchat-panel.immersive .tmchat-display-title { font-size: 20px; line-height: 1.4; margin-bottom: 16px; }
.tmchat-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 12px; }
.tmchat-grid.single { grid-template-columns: 1fr; }
/* Chat displays are curated sets (2-6 items), not a browse grid: two scaled-up
   columns by default (thumbnails are the product — bigger reads better, and 4
   items make a clean 2x2). Sets of exactly 3 or 6+ go three-across so rows
   stay complete. */
.tmchat-panel.immersive .tmchat-grid { grid-template-columns: repeat(2, minmax(0, 420px)); justify-content: start; gap: 24px; }
.tmchat-panel.immersive .tmchat-grid.wide { grid-template-columns: repeat(3, minmax(0, 380px)); gap: 24px; }
.tmchat-panel.immersive .tmchat-grid.single { grid-template-columns: minmax(0, 420px); }
.tmchat-strip {
  display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px;
  scroll-snap-type: x proximity; overscroll-behavior-inline: contain;
  -webkit-overflow-scrolling: touch; scrollbar-width: thin;
}
.tmchat-strip > * { flex: 0 0 220px; scroll-snap-align: start; }
.tmchat-panel.immersive .tmchat-strip { gap: 24px; }
.tmchat-panel.immersive .tmchat-strip > * { flex-basis: 260px; }
.tmchat-followups { display: flex; flex-wrap: wrap; gap: 8px; }
.tmchat-refine { display: grid; gap: 10px; }
.tmchat-chip {
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid var(--tmchat-line); border-radius: 999px; background: var(--tmchat-bg);
  color: var(--tmchat-fg2); padding: 8px 14px; font-size: 14px; line-height: 1.2; cursor: pointer; font-family: inherit;
  transition: border-color 140ms ease, color 140ms ease, background 140ms ease;
}
.tmchat-chip:hover { border-color: var(--tmchat-fg); color: var(--tmchat-fg); }
.tmchat-chip:active { background: var(--tmchat-surface); }
.tmchat-typing { align-self: flex-start; color: var(--tmchat-fg2); font-size: 13px; display: inline-flex; align-items: baseline; gap: 6px; }
.tmchat-progress {
  align-self: stretch; padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px;
  background: #fff; color: var(--tmchat-fg);
  animation: tmchat-rise 280ms var(--tmchat-ease) both;
}
.tmchat-progress-current { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; align-items: center; }
.tmchat-progress-current strong { display: block; color: var(--tmchat-fg); font-size: 14px; font-weight: 600; line-height: 1.35; }
.tmchat-progress-detail { display: block; margin-top: 2px; color: var(--tmchat-fg2); font-size: 13px; line-height: 1.4; }
.tmchat-progress-mark {
  width: 32px; height: 32px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center;
  background: #f0f0f0; color: var(--tmchat-accent, #146ef5);
}
/* Four steps as one segmented track: ink for done, blue for the step in hand. */
.tmchat-progress-steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin: 16px 0 0; padding: 0; list-style: none; }
.tmchat-progress-steps li {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 4px;
  padding-top: 8px; border-top: 2px solid #e0e0e0;
  color: #6b6b6b; font-size: 11px; line-height: 1.3;
  transition: border-color 320ms var(--tmchat-ease), color 320ms var(--tmchat-ease);
}
.tmchat-progress-steps li[data-state="current"] { color: var(--tmchat-accent, #146ef5); font-weight: 600; border-top-color: var(--tmchat-accent, #146ef5); }
.tmchat-progress-steps li[data-state="complete"] { color: #5a5a5a; border-top-color: #080808; }
.tmchat-progress-steps li[data-state="upcoming"] { color: #6e6e6e; }
.tmchat-progress-stepmark { color: #080808; text-align: center; }
.tmchat-progress-stepmark:empty { display: none; }
.tmchat-progress-receipt {
  margin: 14px 0 0; padding-top: 12px; border-top: 1px solid #e0e0e0;
  color: #5a5a5a; font-size: 12px; font-weight: 500;
}
/* Placeholders keep the template card's portrait thumbnail shape, so results
   land where the reader is already looking. */
.tmchat-progress-preview { display: grid; grid-template-columns: repeat(4, minmax(0, 132px)); gap: 8px; margin-top: 16px; }
.tmchat-progress-skeleton-card {
  aspect-ratio: 150 / 199; border-radius: 4px;
  background: linear-gradient(100deg, #f0f0f0 20%, #f8f8f8 40%, #f0f0f0 60%);
  background-size: 200% 100%; animation: tmchat-progress-shimmer 1.4s linear infinite;
}
.tmchat-progress-skeleton-card:nth-child(2) { animation-delay: 120ms; }
.tmchat-progress-skeleton-card:nth-child(3) { animation-delay: 240ms; }
.tmchat-progress-skeleton-card:nth-child(4) { animation-delay: 360ms; }
@keyframes tmchat-progress-shimmer { to { background-position-x: -200%; } }
.tmchat-dots { display: inline-flex; gap: 3px; }
.tmchat-dots span {
  width: 4px; height: 4px; border-radius: 50%; background: var(--tmchat-fg2);
  animation: tmchat-pulse 1.2s ease-in-out infinite;
}
.tmchat-dots span:nth-child(2) { animation-delay: 0.15s; }
.tmchat-dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes tmchat-pulse { 0%, 60%, 100% { opacity: 0.25; } 30% { opacity: 1; } }
.tmchat-scrollwrap { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.tmchat-jump {
  position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); z-index: 3;
  display: inline-flex; align-items: center; gap: 6px; min-height: 32px;
  border: 1px solid var(--tmchat-line); border-radius: 999px; background: var(--tmchat-bg); color: var(--tmchat-fg);
  padding: 0 12px; font-family: inherit; font-size: 12px; font-weight: 500; cursor: pointer;
  box-shadow: var(--tmchat-shadow-sm);
  animation: tmchat-jump-in 240ms var(--tmchat-ease) both;
  transition: border-color 140ms ease;
}
@keyframes tmchat-jump-in { from { opacity: 0; transform: translate(-50%, 6px); } to { opacity: 1; transform: translate(-50%, 0); } }
.tmchat-jump:hover { border-color: var(--tmchat-fg); }
.tmchat-inputrow { display: flex; flex-direction: column; padding: 12px 20px 10px; border-top: 1px solid var(--tmchat-line); background: var(--tmchat-bg); }
/* One field, as in the marketplace search: the send control sits inside the
   bordered box and the whole box takes the focus ring. */
.tmchat-composer {
  display: flex; align-items: flex-end; gap: 8px; padding: 5px 5px 5px 0;
  border: 1px solid var(--tmchat-line); border-radius: var(--tmchat-radius); background: var(--tmchat-bg);
  transition: border-color 140ms ease, box-shadow 140ms ease;
}
.tmchat-composer:hover { border-color: var(--tmchat-line-strong); }
.tmchat-composer:focus-within { border-color: var(--tmchat-accent, #146ef5); box-shadow: 0 0 0 3px var(--tmchat-accent-ring); }
/* Immersive (and wide inline panels): one centered content column (max 960px).
   Header, conversation, and input share the same left/right rails so every
   surface aligns. */
.tmchat-panel.inline .tmchat-header { padding: 10px max(20px, calc((100% - 960px) / 2)); }
.tmchat-panel.inline .tmchat-inputrow { padding: 12px max(20px, calc((100% - 960px) / 2)) 12px; }
.tmchat-panel.inline .tmchat-scroll { padding: 24px max(20px, calc((100% - 960px) / 2)) 24px; }
.tmchat-panel.inline .tmchat-preview-bar { padding: 10px max(20px, calc((100% - 960px) / 2)); }
.tmchat-panel.immersive .tmchat-header { padding: 12px max(clamp(16px, 5vw, 56px), calc((100% - 960px) / 2)); }
.tmchat-panel.immersive .tmchat-inputrow { padding: 16px max(clamp(16px, 5vw, 56px), calc((100% - 960px) / 2)) 14px; }
.tmchat-panel.immersive .tmchat-scroll { padding: 32px max(clamp(16px, 5vw, 56px), calc((100% - 960px) / 2)) 32px; gap: 20px; }
.tmchat-panel.immersive .tmchat-preview-bar { padding: 10px max(clamp(16px, 5vw, 56px), calc((100% - 960px) / 2)); }
.tmchat-input {
  flex: 1 1 auto; min-width: 0; min-height: 36px; max-height: 120px; padding: 8px 4px 8px 14px;
  box-sizing: border-box;
  border: 0; border-radius: var(--tmchat-radius); background: transparent; color: var(--tmchat-fg);
  font: inherit; font-size: 15px; line-height: 20px; resize: none; overflow-y: auto;
}
.tmchat-input::placeholder { color: #757575; }
/* The composer box carries the focus ring for the field inside it. */
.tmchat-composer .tmchat-input:focus-visible { outline: none; }
.tmchat-inputmeta {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin: 6px 2px 0; color: #757575; font-size: 11px; line-height: 1.25; min-height: 14px;
}
/* The limit only matters near the end. It stays in the tree (the field is
   described by it) and keeps its space so nothing shifts when it appears. */
.tmchat-counter { margin-left: auto; font-variant-numeric: tabular-nums; transition: opacity 200ms ease; }
.tmchat-counter.quiet { visibility: hidden; opacity: 0; }
.tmchat-counter.full { color: var(--tmchat-fg); font-weight: 600; }
@media (hover: none) { .tmchat-hint { display: none; } }
.tmchat-send {
  flex: 0 0 auto; width: 36px; height: 36px; padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border: 0; border-radius: var(--tmchat-radius); background: var(--tmchat-accent, #146ef5); color: #fff;
  font: inherit; font-weight: 600; cursor: pointer; align-self: flex-end;
  transition: background 140ms ease, transform 160ms var(--tmchat-ease);
}
.tmchat-send:hover:not(:disabled) { background: var(--tmchat-accent-hover, #0f5bd1); }
.tmchat-send:active:not(:disabled) { transform: scale(0.94); }
.tmchat-send:disabled { background: #f0f0f0; color: #5a5a5a; cursor: default; }
.tmchat-send.stop { background: var(--tmchat-fg); color: #fff; }
.tmchat-send.stop:hover:not(:disabled) { background: #363636; }
/* ── Live template preview (published .webflow.io site in an iframe) ── */
.tmchat-body { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.tmchat-preview {
  position: absolute; inset: 0; z-index: 4;
  display: flex; flex-direction: column; background: var(--tmchat-bg);
  animation: tmchat-preview-in 320ms var(--tmchat-ease) both;
}
@keyframes tmchat-preview-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
.tmchat-preview.closing { animation: tmchat-preview-out 160ms cubic-bezier(0.4, 0, 1, 1) both; }
@keyframes tmchat-preview-out { to { opacity: 0; transform: translateY(10px); } }
.tmchat-preview-bar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 10px 20px; border-bottom: 1px solid var(--tmchat-line); background: var(--tmchat-bg);
}
.tmchat-preview-back {
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid var(--tmchat-line); border-radius: var(--tmchat-radius); background: var(--tmchat-bg); color: var(--tmchat-fg);
  font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer;
}
.tmchat-preview-back { height: 36px; padding: 0 12px; transition: border-color 140ms ease; }
.tmchat-preview-back:hover { border-color: var(--tmchat-fg); }
.tmchat-preview-sep { width: 1px; height: 20px; background: var(--tmchat-line); flex: 0 0 auto; }
.tmchat-preview-meta { display: flex; flex-direction: column; justify-content: center; min-width: 0; margin-right: auto; min-height: 36px; }
.tmchat-preview-name { font-size: 14px; line-height: 1.25; font-weight: 600; color: var(--tmchat-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tmchat-preview-creator { font-size: 12px; line-height: 1.25; color: var(--tmchat-fg2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tmchat-devicetoggle { display: inline-flex; align-items: stretch; height: 36px; border: 1px solid var(--tmchat-line); border-radius: var(--tmchat-radius); overflow: hidden; }
.tmchat-devicebtn {
  display: inline-flex; align-items: center; gap: 6px;
  border: 0; background: var(--tmchat-bg); color: var(--tmchat-fg2); padding: 0 12px;
  font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer;
}
.tmchat-devicebtn { transition: background 140ms ease, color 140ms ease; }
.tmchat-devicebtn + .tmchat-devicebtn { border-left: 1px solid var(--tmchat-line); }
.tmchat-devicebtn:hover { color: var(--tmchat-fg); }
.tmchat-devicebtn.active { background: var(--tmchat-surface); color: var(--tmchat-fg); }
.tmchat-devicebtn:focus-visible { outline-offset: -2px; }
.tmchat-preview-cta {
  display: inline-flex; align-items: center; gap: 6px; text-decoration: none;
  height: 36px; border-radius: var(--tmchat-radius); background: var(--tmchat-accent, #146ef5); color: #fff; padding: 0 16px;
  font-family: inherit; font-size: 13px; font-weight: 600;
}
.tmchat-preview-cta { transition: background 140ms ease; }
.tmchat-preview-cta:hover { background: var(--tmchat-accent-hover, #0f5bd1); }
.tmchat-preview-open { display: inline-flex; align-items: center; gap: 5px; color: var(--tmchat-fg2); font-size: 13px; font-weight: 500; text-decoration: none; }
.tmchat-preview-open:hover { color: var(--tmchat-fg); }
.tmchat-preview-stage {
  position: relative; flex: 1 1 auto; min-height: 0; overflow: auto;
  display: flex; justify-content: center; background: var(--tmchat-surface); padding: 0;
}
.tmchat-preview-stage.mobile, .tmchat-preview-stage.tablet { padding: 24px 16px; }
.tmchat-preview-frame { border: 0; background: #fff; width: 100%; height: 100%; display: block; }
.tmchat-preview-stage.mobile .tmchat-preview-frame, .tmchat-preview-stage.tablet .tmchat-preview-frame {
  max-width: 100%; height: 100%; flex: 0 0 auto;
  border: 1px solid var(--tmchat-line); box-shadow: var(--tmchat-shadow-sm);
}
.tmchat-preview-stage.mobile .tmchat-preview-frame { width: 390px; border-radius: 16px; }
.tmchat-preview-stage.tablet .tmchat-preview-frame { width: 768px; border-radius: 8px; }
.tmchat-preview-loading {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 6px;
  color: var(--tmchat-fg2); font-size: 13px; pointer-events: none;
}
@media (max-width: 560px) {
  .tmchat-panel {
    inset: 0; width: 100vw; height: 100vh; height: 100dvh;
    border: 0; border-radius: 0; box-shadow: none;
  }
  .tmchat-panel.immersive { top: 0; bottom: 0; width: 100vw; border-radius: 0; }
  .tmchat-inputrow, .tmchat-panel.immersive .tmchat-inputrow {
    padding: 10px 12px;
    padding-bottom: max(10px, env(safe-area-inset-bottom));
  }
  .tmchat-header, .tmchat-panel.immersive .tmchat-header { padding: 8px 8px 8px 16px; }
  .tmchat-scroll, .tmchat-panel.immersive .tmchat-scroll { padding: 16px 16px 16px; gap: 16px; }
  .tmchat-iconbtn { min-width: 44px; height: 44px; }
  .tmchat-expand { display: none; }
  /* 16px keeps iOS from zooming the page when the field takes focus. */
  .tmchat-input { font-size: 16px; min-height: 44px; padding-top: 12px; padding-bottom: 12px; }
  .tmchat-send { width: 44px; height: 44px; }
  .tmchat-hint { display: none; }
  .tmchat-msg.assistant.tmchat-welcome { font-size: 18px; }
  .tmchat-progress-steps li span:first-child { overflow: hidden; text-overflow: ellipsis; }
  .tmchat-grid:not(.single), .tmchat-panel.immersive .tmchat-grid:not(.single) {
    grid-template-columns: none; grid-auto-flow: column;
    grid-auto-columns: min(76vw, 280px); justify-content: start;
    overflow-x: auto; overscroll-behavior-inline: contain;
    scroll-snap-type: x mandatory; padding-bottom: 6px;
    -webkit-overflow-scrolling: touch; scrollbar-width: thin;
  }
  .tmchat-grid:not(.single) > *, .tmchat-panel.immersive .tmchat-grid:not(.single) > * { scroll-snap-align: start; }
  .tmchat-grid.single, .tmchat-panel.immersive .tmchat-grid.single {
    grid-template-columns: 1fr; overflow: visible;
  }
  .tmchat-followups {
    flex-wrap: nowrap; overflow-x: auto; overscroll-behavior-inline: contain;
    scroll-snap-type: x proximity; padding-bottom: 4px;
    -webkit-overflow-scrolling: touch; scrollbar-width: none;
  }
  .tmchat-followups > * { flex: 0 0 auto; scroll-snap-align: start; }
  .tmchat-chip { min-height: 40px; }
  .tmchat-preview-bar, .tmchat-panel.immersive .tmchat-preview-bar { flex-wrap: nowrap; gap: 8px; padding: 8px 10px; }
  .tmchat-preview-back, .tmchat-preview-cta { height: 40px; }
  .tmchat-devicetoggle, .tmchat-preview-open, .tmchat-preview-sep { display: none; }
  .tmchat-preview-stage.mobile, .tmchat-preview-stage.tablet { padding: 0; }
  .tmchat-preview-stage.mobile .tmchat-preview-frame, .tmchat-preview-stage.tablet .tmchat-preview-frame { width: 100%; border: 0; border-radius: 0; box-shadow: none; }
}
@media (prefers-reduced-motion: reduce) {
  .tmchat-panel.entering, .tmchat-backdrop, .tmchat-dots span, .tmchat-caret, .tmchat-launcher,
  .tmchat-msg, .tmchat-display, .tmchat-typing, .tmchat-turn-row, .tmchat-progress, .tmchat-progress-skeleton-card,
  .tmchat-followups .tmchat-chip, .tmchat-starters .tmchat-chip, .tmchat-empty-mark, .tmchat-intro-copy, .tmchat-iconbtn.armed,
  .tmchat-jump, .tmchat-grid > div, .tmchat-strip > div, .tmchat-preview,
  .tmchat-preview.closing { animation: none; }
  .tmchat-panel, .tmchat-chip, .tmchat-chip.tmchat-starter svg, .tmchat-send, .tmchat-launcher, .tmchat-devicebtn, .tmchat-undo,
  .tmchat-composer, .tmchat-counter, .tmchat-intro-toggle::after, .tmchat-progress-steps li,
  .tmchat-preview-back, .tmchat-preview-cta { transition: none; }
  .tmchat-launcher:hover, .tmchat-chip.tmchat-starter:hover svg, .tmchat-send:active:not(:disabled) { transform: none; }
}
` + TEMPLATE_CARD_STYLES;
