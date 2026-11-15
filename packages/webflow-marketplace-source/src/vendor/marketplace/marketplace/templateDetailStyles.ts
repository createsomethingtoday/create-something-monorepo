export const TEMPLATE_DETAIL_STYLES = `
.wfdt,
.wfdt * {
  box-sizing: border-box;
}

.wfdt {
  width: 100%;
  color: #080808;
  font-family: "WF Visual Sans Variable", "WF Visual Sans", Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.wfdt a {
  color: inherit;
}

.wfdt-hero {
  display: block;
  width: 100%;
}

.wfdt-hero-copy {
  min-width: 0;
}

.wfdt-hero-main {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
}

.wfdt-hero-identity {
  flex: 1 1 auto;
  min-width: 0;
}

.wfdt-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: 0 0 18px;
  color: #5f5f5f;
  font-size: 13px;
  line-height: 1.4;
}

.wfdt .wfdt-breadcrumb-marketplace,
.wfdt .wfdt-breadcrumb-link {
  color: #146ef5;
  text-decoration: none;
}

.wfdt .wfdt-breadcrumb-marketplace {
  display: inline-flex;
  align-items: center;
}

.wfdt-breadcrumb-chevron {
  display: inline-flex;
  align-items: center;
  color: #757575;
}

.wfdt-breadcrumb-categories {
  display: inline;
  min-width: 0;
}

.wfdt-breadcrumb-comma {
  color: #757575;
}

.wfdt-title {
  margin: 0;
  max-width: none;
  color: #080808;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.3;
}

.wfdt-summary {
  max-width: 680px;
  margin: 18px 0 0;
  color: #3b3b3b;
  font-size: 17px;
  line-height: 1.58;
}

.wfdt-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 18px;
}

.wfdt-title + .wfdt-meta-row {
  margin-top: 8px;
}

.wfdt-creator-link {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.2;
}

.wfdt-chip,
.wfdt-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}

.wfdt-creator-link {
  gap: 8px;
  color: #080808;
  text-decoration: none;
}

.wfdt-avatar {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  background: #d7f8f4;
  color: #08796f;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.wfdt-chip {
  padding: 2px 8px;
  border: 1px solid #e6e6e6;
  color: #4a4a4a;
  background: #f7f7f7;
}

.wfdt-chip-savings {
  border-color: rgba(22, 163, 74, 0.22);
  color: #12813e;
  background: rgba(22, 163, 74, 0.08);
}

.wfdt-badge {
  gap: 5px;
  padding: 2px 8px;
  border: 1px solid rgba(20, 110, 245, 0.18);
  color: #146ef5;
  background: rgba(20, 110, 245, 0.08);
}

.wfdt-badge-sale {
  border-color: rgba(245, 158, 11, 0.3);
  color: #a26000;
  background: rgba(245, 158, 11, 0.12);
}

.wfdt-badge-verified {
  border-color: rgba(34, 197, 94, 0.22);
  color: #12813e;
  background: rgba(22, 163, 74, 0.08);
}

.wfdt-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  margin-top: 0;
}

.wfdt .wfdt-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 18px;
  border: 1px solid #146ef5;
  border-radius: 4px;
  background: #146ef5;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.wfdt .wfdt-button:hover {
  background: #0f55d9;
  border-color: #0f55d9;
}

.wfdt .wfdt-button:active {
  transform: translateY(1px);
}

.wfdt .wfdt-button-secondary {
  background: #fff;
  border-color: #d8d8d8;
  color: #080808;
}

.wfdt .wfdt-button-secondary:hover {
  background: #f7f7f7;
  border-color: #b8b8b8;
}

.wfdt .wfdt-button-offer {
  background: #146ef5;
  border-color: #146ef5;
}

.wfdt .wfdt-button-offer:hover {
  background: #0f55d9;
  border-color: #0f55d9;
}

.wfdt-preview-section {
  width: 100%;
  margin-top: 40px;
}

.wfdt-preview-card {
  width: 100%;
}

.wfdt-preview-controls {
  display: flex;
  width: max-content;
  max-width: 100%;
  gap: 6px;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  padding: 4px;
  border: 1px solid #d9d9d9;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(8, 8, 8, 0.08);
}

.wfdt-preview-control {
  min-width: 78px;
  min-height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #5f5f5f;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}

.wfdt-preview-control-active {
  background: #080808;
  color: #fff;
}

.wfdt-preview-stage {
  position: relative;
  width: 100%;
  overflow: hidden;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 23px 18px rgba(0, 0, 0, 0.04), 0 11px 10px rgba(0, 0, 0, 0.04), 0 6px 4px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02);
}

.wfdt-preview-stage-mobile {
  overflow: visible;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.wfdt-preview-frame {
  position: absolute;
  top: 0;
  left: 50%;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: #fff;
  transform-origin: top center;
}

.wfdt-preview-frame-mobile {
  border: 1px solid #d9d9d9;
  border-radius: 18px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.18);
}

.wfdt-preview-iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}

.wfdt-preview-loading {
  position: absolute;
  z-index: 1;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(135deg, #f8f8f8 0%, #fff 44%, #f2f2f2 100%);
  pointer-events: none;
}

.wfdt-preview-loading::before {
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 20%, rgba(255, 255, 255, 0.72) 45%, transparent 70%);
  content: "";
  transform: translateX(-100%);
  animation: wfdt-preview-loading-sheen 1.4s ease-in-out infinite;
}

.wfdt-preview-loading-sheen {
  position: absolute;
  inset: clamp(18px, 4vw, 46px);
  border: 1px solid #ededed;
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(8, 8, 8, 0.04), rgba(8, 8, 8, 0.015));
  opacity: 0.7;
}

.wfdt-preview-frame-mobile .wfdt-preview-loading,
.wfdt-preview-frame-mobile .wfdt-preview-loading-sheen {
  border-radius: 18px;
}

@keyframes wfdt-preview-loading-sheen {
  100% {
    transform: translateX(100%);
  }
}

.wfdt-panel {
  width: 100%;
  padding: 18px;
  border: 1px solid #dedede;
  border-radius: 8px;
  background: #fff;
}

.wfdt-panel-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.wfdt-panel-title {
  margin: 0;
  color: #080808;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.25;
}

.wfdt-panel-copy {
  margin: 8px 0 0;
  color: #5f5f5f;
  font-size: 14px;
  line-height: 1.5;
}

.wfdt-price-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
  margin-top: 16px;
}

.wfdt-price-primary {
  color: #080808;
  font-size: 32px;
  font-weight: 650;
  line-height: 1;
}

.wfdt-price-original {
  color: #757575;
  font-size: 14px;
  text-decoration: line-through;
}

.wfdt-panel-actions {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.wfdt-panel-actions .wfdt-button {
  width: 100%;
}

.wfdt-small-note {
  margin: 10px 0 0;
  color: #757575;
  font-size: 12px;
  line-height: 1.45;
}

.wfdt-highlights {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: clamp(20px, 4vw, 40px);
  align-items: start;
  width: 100%;
}

.wfdt-highlights-title {
  margin: 0;
  max-width: 13ch;
  color: #080808;
  font-size: clamp(30px, 4vw, 48px);
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.02;
}

.wfdt-highlights-copy {
  margin: 14px 0 0;
  color: #4a4a4a;
  font-size: 16px;
  line-height: 1.6;
}

.wfdt-highlight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.wfdt-highlight-card {
  min-height: 122px;
  padding: 16px;
  border: 1px solid #dedede;
  border-radius: 8px;
  background: #fff;
}

.wfdt-highlight-kicker {
  margin: 0;
  color: #757575;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  text-transform: uppercase;
}

.wfdt-highlight-value {
  margin: 10px 0 0;
  color: #080808;
  font-size: 19px;
  font-weight: 600;
  line-height: 1.2;
}

.wfdt-highlight-body {
  margin: 8px 0 0;
  color: #5f5f5f;
  font-size: 13px;
  line-height: 1.45;
}

.wfdt-apps {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: clamp(20px, 4vw, 40px);
  align-items: start;
  width: 100%;
  padding: 22px;
  border: 1px solid #dedede;
  border-radius: 8px;
  background: #fff;
}

.wfdt-apps-title {
  margin: 0;
  color: #080808;
  font-size: clamp(26px, 3vw, 38px);
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.04;
}

.wfdt-apps-copy {
  margin: 12px 0 0;
  color: #5f5f5f;
  font-size: 15px;
  line-height: 1.55;
}

.wfdt-app-list {
  display: grid;
  gap: 10px;
}

.wfdt-app-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 14px;
  border: 1px solid #dedede;
  border-radius: 8px;
  background: #fafafa;
}

.wfdt-app-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  overflow: hidden;
  border: 1px solid #dedede;
  border-radius: 8px;
  background: #fff;
  color: #146ef5;
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
}

.wfdt-app-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wfdt-app-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.wfdt-app-name {
  margin: 0;
  color: #080808;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.25;
}

.wfdt-app-scenario {
  margin: 6px 0 0;
  color: #5f5f5f;
  font-size: 13px;
  line-height: 1.45;
}

.wfdt-app-link {
  display: inline-flex;
  margin-top: 8px;
  color: #146ef5;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.wfdt-sticky {
  position: fixed;
  z-index: 9999;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  min-height: 76px;
  padding: 12px clamp(16px, 4vw, 40px);
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid #dedede;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.08);
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.wfdt-sticky-hidden {
  opacity: 0;
  pointer-events: none;
  transform: translateY(calc(100% + 16px));
}

.wfdt-sticky-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.wfdt-sticky-thumb {
  flex: 0 0 auto;
  width: 70px;
  height: 44px;
  border: 1px solid #dedede;
  border-radius: 4px;
  object-fit: cover;
  background: #f2f2f2;
}

.wfdt-sticky-title {
  margin: 0;
  overflow: hidden;
  color: #080808;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wfdt-sticky-subtitle {
  margin: 4px 0 0;
  overflow: hidden;
  color: #5f5f5f;
  font-size: 13px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wfdt-sticky-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  align-items: center;
}

@media (max-width: 991px) {
  .wfdt-hero-main,
  .wfdt-highlights,
  .wfdt-apps {
    grid-template-columns: 1fr;
  }

  .wfdt-hero-main {
    flex-direction: column;
  }

  .wfdt-actions {
    justify-content: flex-start;
    margin-top: 20px;
  }

  .wfdt-title {
    max-width: 14ch;
  }
}

@media (max-width: 767px) {
  .template-hero:has(.wfdt[data-template-detail-hero]) {
    position: static !important;
    top: auto !important;
    z-index: auto !important;
  }

  .wfdt-breadcrumb {
    gap: 6px;
    margin-bottom: 16px;
    font-size: 13px;
  }

  .wfdt-hero-main {
    gap: 18px;
  }

  .wfdt-actions,
  .wfdt-sticky-actions {
    align-items: stretch;
  }

  .wfdt-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    width: 100%;
    margin-top: 14px;
  }

  .wfdt-actions .wfdt-button {
    width: 100%;
    min-height: 46px;
    padding: 0 12px;
    font-size: 13px;
    line-height: 1.15;
    text-align: center;
    white-space: normal;
  }

  .wfdt-actions .wfdt-button:not(.wfdt-button-secondary) {
    grid-column: 1 / -1;
    min-height: 50px;
    font-size: 14px;
  }

  .wfdt-actions .wfdt-button-secondary {
    color: #1f1f1f;
    box-shadow: 0 1px 2px rgba(8, 8, 8, 0.04);
  }

  .wfdt-preview-section {
    margin-top: 22px;
  }

  .wfdt-preview-controls {
    margin-bottom: 14px;
    box-shadow: 0 3px 12px rgba(8, 8, 8, 0.07);
  }

  .wfdt-sticky {
    gap: 10px;
    min-height: 68px;
    padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
  }

  .wfdt-sticky-meta {
    flex: 1 1 auto;
    min-width: 0;
  }

  .wfdt-sticky-thumb {
    width: 52px;
    height: 34px;
  }

  .wfdt-sticky-title {
    font-size: 14px;
  }

  .wfdt-sticky-subtitle {
    font-size: 12px;
  }

  .wfdt-sticky-actions {
    flex: 0 0 auto;
  }

  .wfdt-sticky-actions .wfdt-button-secondary {
    display: none;
  }

  .wfdt-sticky-actions .wfdt-button {
    width: auto;
    min-height: 52px;
    padding: 0 16px;
    white-space: nowrap;
  }

  .wfdt-highlight-grid {
    grid-template-columns: 1fr;
  }
}
`;
