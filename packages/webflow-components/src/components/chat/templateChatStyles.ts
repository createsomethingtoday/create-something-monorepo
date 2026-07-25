import { TEMPLATE_CARD_STYLES } from '../cards/TemplateCard';

export const CHAT_STYLES = `
.tmchat-launcher {
  position: fixed; right: 24px; bottom: 24px; z-index: 9000;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 18px; border: 0; border-radius: 999px; cursor: pointer;
  background: #146ef5; color: #fff;
  font-family: "WF Visual Sans Variable", "Inter", system-ui, sans-serif;
  font-size: 14px; font-weight: 600; box-shadow: 0 6px 24px rgba(0,0,0,0.18);
  transition: background 160ms ease, transform 160ms ease;
}
.tmchat-launcher:hover { background: #0f5cd0; transform: translateY(-1px); }
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
  outline: 2px solid #146ef5; outline-offset: 2px;
}
.tmchat-backdrop {
  position: fixed; inset: 0; z-index: 99999998;
  background: rgba(8,8,8,0.44);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  animation: tmchat-fade 200ms ease both;
}
@keyframes tmchat-fade { from { opacity: 0; } }
.tmchat-panel {
  position: fixed; right: 24px; bottom: 24px; z-index: 9001;
  display: flex; flex-direction: column;
  width: min(440px, calc(100vw - 32px)); height: min(640px, calc(100vh - 48px));
  border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;
  background: #fff; box-shadow: 0 12px 48px rgba(0,0,0,0.22);
  font-family: "WF Visual Sans Variable", "Inter", system-ui, sans-serif;
  color: #080808; font-size: 14px; line-height: 1.45;
  transition: bottom 160ms ease;
}
.tmchat-panel.entering { animation: tmchat-in 220ms cubic-bezier(0.2, 0, 0, 1); }
@keyframes tmchat-in { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
.tmchat-panel.inline {
  position: relative; right: auto; bottom: auto; z-index: auto;
  width: 100%; height: 100%; min-height: 560px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.tmchat-panel.immersive {
  /* Above the webflow.com sticky navigation — the immersive state is a modal
     and nothing on the host page should paint over it. */
  position: fixed; top: 24px; bottom: 24px; left: 0; right: 0; margin: 0 auto; z-index: 99999999;
  width: min(1120px, calc(100vw - 48px)); height: auto; min-height: 0;
  border-radius: 16px; box-shadow: 0 24px 80px rgba(0,0,0,0.3);
}
.tmchat-header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 14px 16px; border-bottom: 1px solid #ececec; background: #fafafa;
}
.tmchat-header-title { margin: 0; font-weight: 600; font-size: 15px; line-height: 1.3; }
.tmchat-panel.immersive .tmchat-header-title { font-size: 16px; }
.tmchat-turnstile:empty { display: none; }
.tmchat-turnstile:not(:empty) {
  flex: 0 0 auto; display: flex; justify-content: center;
  padding: 8px 16px; border-top: 1px solid #ececec; background: #fafafa;
}
.tmchat-header-actions { display: flex; align-items: center; gap: 2px; }
.tmchat-iconbtn {
  border: 0; background: transparent; cursor: pointer; color: #404040;
  width: 30px; height: 30px; border-radius: 8px; font-size: 16px; line-height: 1;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background 120ms ease;
}
.tmchat-iconbtn:hover { background: #ececec; }
.tmchat-iconbtn:active { background: #e0e0e0; }
.tmchat-scroll {
  flex: 1 1 auto; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
/* Compositor-only entrances: transform + opacity, no layout properties. */
.tmchat-msg, .tmchat-display, .tmchat-typing {
  animation: tmchat-rise 180ms cubic-bezier(0.2, 0, 0, 1) both;
}
@keyframes tmchat-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
/* Chips arrive one by one after the reply settles — the whole row popping in
   at once reads as a layout jump. Delay is set inline per chip. */
.tmchat-followups .tmchat-chip { animation: tmchat-chip-in 240ms cubic-bezier(0.2, 0, 0, 1) both; }
@keyframes tmchat-chip-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.tmchat-grid > div, .tmchat-strip > div {
  animation: tmchat-card 260ms cubic-bezier(0.2, 0, 0, 1) both;
}
@keyframes tmchat-card { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }
.tmchat-msg { max-width: 92%; white-space: pre-wrap; overflow-wrap: break-word; }
.tmchat-panel.immersive .tmchat-msg { max-width: 680px; font-size: 15px; }
.tmchat-msg.user { align-self: flex-end; background: #146ef5; color: #fff; padding: 9px 13px; border-radius: 14px 14px 4px 14px; }
.tmchat-msg.assistant { align-self: flex-start; background: #f5f5f5; padding: 9px 13px; border-radius: 14px 14px 14px 4px; }
.tmchat-turn-status {
  align-self: flex-start; padding: 6px 9px; border: 1px solid #ececec; border-radius: 7px;
  background: #fafafa; color: #5b5b5b; font-size: 12px; font-weight: 600;
}
.tmchat-sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
.tmchat-intro {
  align-self: flex-start; max-width: 92%; color: #5b5b5b; font-size: 12px;
  border: 1px solid #ececec; border-radius: 8px; background: #fafafa;
}
.tmchat-intro-toggle {
  width: 100%; border: 0; background: transparent; cursor: pointer; padding: 7px 10px;
  color: #404040; font: inherit; font-weight: 600; text-align: left;
}
.tmchat-intro-toggle:hover { color: #080808; }
.tmchat-intro-copy { padding: 0 10px 9px; max-width: 560px; }
.tmchat-intro-copy[hidden] { display: none; }
.tmchat-caret {
  display: inline-block; width: 2px; height: 1em; margin-left: 2px;
  background: currentColor; vertical-align: -0.15em;
  animation: tmchat-blink 1s steps(2, start) infinite;
}
@keyframes tmchat-blink { 50% { opacity: 0; } }
.tmchat-display { align-self: stretch; }
.tmchat-display-title { font-weight: 600; margin: 4px 0 8px; font-size: 14px; }
.tmchat-panel.immersive .tmchat-display-title { font-size: 16px; }
.tmchat-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.tmchat-grid.single { grid-template-columns: 1fr; }
/* Chat displays are curated sets (2-6 items), not a browse grid: two scaled-up
   columns by default (thumbnails are the product — bigger reads better, and 4
   items make a clean 2x2). Sets of exactly 3 or 6+ go three-across so rows
   stay complete. */
.tmchat-panel.immersive .tmchat-grid { grid-template-columns: repeat(2, minmax(0, 420px)); justify-content: start; gap: 20px; }
.tmchat-panel.immersive .tmchat-grid.wide { grid-template-columns: repeat(3, minmax(0, 380px)); gap: 16px; }
.tmchat-panel.immersive .tmchat-grid.single { grid-template-columns: minmax(0, 420px); }
.tmchat-strip {
  display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px;
  -webkit-overflow-scrolling: touch; scrollbar-width: thin;
}
.tmchat-strip > * { flex: 0 0 220px; }
.tmchat-panel.immersive .tmchat-strip > * { flex-basis: 260px; }
.tmchat-followups { display: flex; flex-wrap: wrap; gap: 8px; }
.tmchat-refine { display: grid; gap: 7px; }
.tmchat-refine-label { color: #5b5b5b; font-size: 11px; font-weight: 600; letter-spacing: 0.01em; }
.tmchat-chip {
  border: 1px solid #dbe6fb; border-radius: 999px; background: #f2f7ff;
  color: #0f5cd0; padding: 7px 12px; font-size: 13px; cursor: pointer; font-family: inherit;
  transition: background 140ms ease, transform 140ms ease;
}
.tmchat-chip:hover { background: #e3edfd; transform: translateY(-1px); }
.tmchat-chip:active { transform: translateY(0); }
.tmchat-typing { align-self: flex-start; color: #757575; font-size: 13px; display: inline-flex; align-items: baseline; gap: 6px; }
.tmchat-progress {
  align-self: stretch; padding: 13px; border: 1px solid #ececec; border-radius: 8px;
  background: #fafafa; color: #404040;
  animation: tmchat-rise 180ms cubic-bezier(0.2, 0, 0, 1) both;
}
.tmchat-progress-current { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 9px; align-items: start; }
.tmchat-progress-current strong { display: block; color: #080808; font-size: 13px; line-height: 1.35; }
.tmchat-progress-detail { display: block; margin-top: 2px; color: #5b5b5b; font-size: 12px; line-height: 1.4; }
.tmchat-progress-mark {
  width: 28px; height: 28px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;
  background: #f0f0f0; color: #146ef5;
}
.tmchat-progress-steps { display: grid; gap: 5px; margin: 11px 0 0 37px; padding: 0; list-style: none; }
.tmchat-progress-steps li { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #6b6b6b; font-size: 11px; }
.tmchat-progress-steps li[data-state="current"] { color: #146ef5; font-weight: 600; }
.tmchat-progress-steps li[data-state="complete"] { color: #5b5b5b; }
.tmchat-progress-steps li[data-state="upcoming"] { color: #6e6e6e; }
.tmchat-progress-stepmark { min-width: 12px; color: #146ef5; text-align: center; }
.tmchat-progress-receipt {
  margin: 10px 0 0 37px; padding-top: 9px; border-top: 1px solid #ececec;
  color: #5b5b5b; font-size: 11px; font-weight: 600;
}
.tmchat-progress-preview { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; margin-top: 12px; }
.tmchat-progress-skeleton-card {
  height: 42px; border-radius: 7px;
  background: linear-gradient(100deg, #ececec 20%, #f5f5f5 40%, #ececec 60%);
  background-size: 200% 100%; animation: tmchat-progress-shimmer 1.4s linear infinite;
}
@keyframes tmchat-progress-shimmer { to { background-position-x: -200%; } }
.tmchat-dots { display: inline-flex; gap: 3px; }
.tmchat-dots span {
  width: 4px; height: 4px; border-radius: 50%; background: #757575;
  animation: tmchat-pulse 1.2s ease-in-out infinite;
}
.tmchat-dots span:nth-child(2) { animation-delay: 0.15s; }
.tmchat-dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes tmchat-pulse { 0%, 60%, 100% { opacity: 0.25; } 30% { opacity: 1; } }
.tmchat-scrollwrap { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.tmchat-jump {
  position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); z-index: 3;
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid #e0e0e0; border-radius: 999px; background: #fff; color: #080808;
  padding: 6px 12px; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,0.14);
  animation: tmchat-chip-in 200ms cubic-bezier(0.2, 0, 0, 1) both;
}
.tmchat-jump:hover { background: #f5f5f5; }
.tmchat-inputrow { display: flex; align-items: flex-end; gap: 8px; padding: 12px; border-top: 1px solid #ececec; background: #fff; }
/* Immersive (and wide inline panels): one centered content column (max 960px).
   Header, conversation, and input share the same left/right rails so every
   surface aligns. */
.tmchat-panel.inline .tmchat-header { padding: 14px max(16px, calc((100% - 960px) / 2)); }
.tmchat-panel.inline .tmchat-inputrow { padding: 12px max(16px, calc((100% - 960px) / 2)) 14px; }
.tmchat-panel.inline .tmchat-scroll { padding: 16px max(16px, calc((100% - 960px) / 2)) 24px; }
.tmchat-panel.inline .tmchat-preview-bar { padding: 10px max(16px, calc((100% - 960px) / 2)); }
.tmchat-panel.immersive .tmchat-header { padding: 14px max(clamp(16px, 5vw, 56px), calc((100% - 960px) / 2)); }
.tmchat-panel.immersive .tmchat-inputrow { padding: 14px max(clamp(16px, 5vw, 56px), calc((100% - 960px) / 2)) 18px; }
.tmchat-panel.immersive .tmchat-scroll { padding: 24px max(clamp(16px, 5vw, 56px), calc((100% - 960px) / 2)) 32px; gap: 14px; }
.tmchat-panel.immersive .tmchat-preview-bar { padding: 10px max(clamp(16px, 5vw, 56px), calc((100% - 960px) / 2)); }
.tmchat-input {
  width: 100%; min-height: 40px; max-height: 120px; padding: 9px 12px;
  box-sizing: border-box;
  border: 1px solid #e0e0e0; border-radius: 8px; font: inherit; resize: none; overflow-y: auto;
}
.tmchat-inputfield { flex: 1 1 auto; min-width: 0; }
.tmchat-inputmeta { margin: 4px 2px 0; color: #757575; font-size: 11px; line-height: 1.25; }
.tmchat-send {
  border: 0; border-radius: 8px; background: #146ef5; color: #fff;
  padding: 0 16px; font: inherit; font-weight: 600; cursor: pointer; align-self: flex-end; min-height: 40px;
  transition: background 140ms ease, transform 120ms ease;
}
.tmchat-send:active:not(:disabled) { transform: scale(0.97); }
.tmchat-send:disabled { background: #ececec; color: #5b5b5b; cursor: default; }
.tmchat-send.stop { background: #fff; color: #404040; border: 1px solid #e0e0e0; }
.tmchat-send.stop:hover { background: #f5f5f5; }
/* ── Live template preview (published .webflow.io site in an iframe) ── */
.tmchat-body { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.tmchat-preview {
  position: absolute; inset: 0; z-index: 4;
  display: flex; flex-direction: column; background: #fff;
  animation: tmchat-preview-in 220ms cubic-bezier(0.2, 0, 0, 1) both;
}
@keyframes tmchat-preview-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.tmchat-preview.closing { animation: tmchat-preview-out 160ms cubic-bezier(0.4, 0, 1, 1) both; }
@keyframes tmchat-preview-out { to { opacity: 0; transform: translateY(10px); } }
.tmchat-preview-bar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 10px 14px; border-bottom: 1px solid #ececec; background: #fff;
}
.tmchat-preview-back {
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; color: #080808;
  padding: 7px 12px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
}
.tmchat-preview-back { height: 36px; padding: 0 12px; transition: background 120ms ease; }
.tmchat-preview-back:hover { background: #f5f5f5; }
.tmchat-preview-sep { width: 1px; height: 20px; background: #e0e0e0; flex: 0 0 auto; }
.tmchat-preview-meta { display: flex; flex-direction: column; justify-content: center; min-width: 0; margin-right: auto; min-height: 36px; }
.tmchat-preview-name { font-size: 14px; line-height: 1.25; font-weight: 600; color: #080808; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tmchat-preview-creator { font-size: 12px; line-height: 1.25; color: #757575; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tmchat-devicetoggle { display: inline-flex; align-items: stretch; height: 36px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
.tmchat-devicebtn {
  display: inline-flex; align-items: center; gap: 6px;
  border: 0; background: #fff; color: #757575; padding: 0 12px;
  font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
}
.tmchat-devicebtn { transition: background 140ms ease, color 140ms ease; }
.tmchat-devicebtn + .tmchat-devicebtn { border-left: 1px solid #e0e0e0; }
.tmchat-devicebtn.active { background: #f0f5ff; color: #146ef5; }
.tmchat-preview-cta {
  display: inline-flex; align-items: center; gap: 6px; text-decoration: none;
  height: 36px; border-radius: 8px; background: #146ef5; color: #fff; padding: 0 14px;
  font-family: inherit; font-size: 13px; font-weight: 600;
}
.tmchat-preview-cta { transition: background 140ms ease; }
.tmchat-preview-cta:hover { background: #0f5cd0; }
.tmchat-preview-open { display: inline-flex; align-items: center; gap: 5px; color: #757575; font-size: 12px; text-decoration: none; }
.tmchat-preview-open:hover { color: #080808; }
.tmchat-preview-stage {
  position: relative; flex: 1 1 auto; min-height: 0; overflow: auto;
  display: flex; justify-content: center; background: #f2f2f2; padding: 0;
}
.tmchat-preview-stage.mobile, .tmchat-preview-stage.tablet { padding: 20px 16px; }
.tmchat-preview-frame { border: 0; background: #fff; width: 100%; height: 100%; display: block; }
.tmchat-preview-stage.mobile .tmchat-preview-frame, .tmchat-preview-stage.tablet .tmchat-preview-frame {
  max-width: 100%; height: 100%; flex: 0 0 auto;
  border: 1px solid #d9d9d9; box-shadow: 0 12px 40px rgba(0,0,0,0.14);
}
.tmchat-preview-stage.mobile .tmchat-preview-frame { width: 390px; border-radius: 20px; }
.tmchat-preview-stage.tablet .tmchat-preview-frame { width: 768px; border-radius: 14px; }
.tmchat-preview-loading {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 6px;
  color: #757575; font-size: 13px; pointer-events: none;
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
  .tmchat-header, .tmchat-panel.immersive .tmchat-header { padding: 8px 10px; }
  .tmchat-scroll, .tmchat-panel.immersive .tmchat-scroll { padding: 12px 16px 16px; gap: 12px; }
  .tmchat-iconbtn { width: 40px; height: 40px; }
  .tmchat-expand { display: none; }
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
    -webkit-overflow-scrolling: touch;
  }
  .tmchat-followups > * { flex: 0 0 auto; scroll-snap-align: start; }
  .tmchat-preview-bar, .tmchat-panel.immersive .tmchat-preview-bar { flex-wrap: nowrap; gap: 8px; padding: 8px 10px; }
  .tmchat-preview-back, .tmchat-preview-cta { height: 40px; }
  .tmchat-devicetoggle, .tmchat-preview-open, .tmchat-preview-sep { display: none; }
  .tmchat-preview-stage.mobile, .tmchat-preview-stage.tablet { padding: 0; }
  .tmchat-preview-stage.mobile .tmchat-preview-frame, .tmchat-preview-stage.tablet .tmchat-preview-frame { width: 100%; border: 0; border-radius: 0; box-shadow: none; }
}
@media (prefers-reduced-motion: reduce) {
  .tmchat-panel.entering, .tmchat-backdrop, .tmchat-dots span, .tmchat-caret,
  .tmchat-msg, .tmchat-display, .tmchat-typing, .tmchat-progress, .tmchat-progress-skeleton-card, .tmchat-followups .tmchat-chip,
  .tmchat-jump, .tmchat-grid > div, .tmchat-strip > div, .tmchat-preview,
  .tmchat-preview.closing { animation: none; }
  .tmchat-panel, .tmchat-chip, .tmchat-send, .tmchat-launcher, .tmchat-devicebtn,
  .tmchat-preview-back, .tmchat-preview-cta { transition: none; }
  .tmchat-chip:hover, .tmchat-launcher:hover, .tmchat-send:active:not(:disabled) { transform: none; }
}
` + TEMPLATE_CARD_STYLES;
