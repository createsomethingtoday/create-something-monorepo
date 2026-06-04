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
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 42%);
  gap: clamp(24px, 5vw, 56px);
  align-items: center;
  width: 100%;
}

.wfdt-hero-copy {
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

.wfdt-breadcrumb-link {
  color: #146ef5;
  text-decoration: none;
}

.wfdt-title {
  margin: 0;
  max-width: 13ch;
  color: #080808;
  font-size: clamp(42px, 6vw, 74px);
  font-weight: 600;
  letter-spacing: 0;
  line-height: 0.96;
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

.wfdt-creator-link,
.wfdt-chip,
.wfdt-badge {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.2;
}

.wfdt-creator-link {
  gap: 8px;
  color: #080808;
  text-decoration: none;
}

.wfdt-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  background: #efefef;
}

.wfdt-chip {
  padding: 0 10px;
  color: #4a4a4a;
  background: #f2f2f2;
}

.wfdt-badge {
  gap: 6px;
  padding: 0 10px;
  border: 1px solid #c7defe;
  color: #0f55d9;
  background: #eef5ff;
  font-weight: 600;
}

.wfdt-badge-sale {
  border-color: #ffd8a8;
  color: #915c00;
  background: #fff5e6;
}

.wfdt-badge-verified {
  border-color: #b9e5d0;
  color: #106b43;
  background: #eefaf4;
}

.wfdt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 28px;
}

.wfdt-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 18px;
  border: 1px solid #080808;
  border-radius: 4px;
  background: #080808;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.wfdt-button:hover {
  background: #2f2f2f;
  border-color: #2f2f2f;
}

.wfdt-button:active {
  transform: translateY(1px);
}

.wfdt-button-secondary {
  background: #fff;
  border-color: #d8d8d8;
  color: #080808;
}

.wfdt-button-secondary:hover {
  background: #f7f7f7;
  border-color: #b8b8b8;
}

.wfdt-button-offer {
  background: #146ef5;
  border-color: #146ef5;
}

.wfdt-button-offer:hover {
  background: #0f55d9;
  border-color: #0f55d9;
}

.wfdt-media-card {
  position: relative;
  overflow: hidden;
  border: 1px solid #dedede;
  border-radius: 8px;
  background: #f3f3f3;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.08);
}

.wfdt-media-card::before {
  content: "";
  display: block;
  aspect-ratio: 16 / 11;
}

.wfdt-media-card img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wfdt-media-placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #757575;
  font-size: 14px;
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
  border-top: 1px solid #dedede;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.08);
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
  .wfdt-hero,
  .wfdt-highlights,
  .wfdt-apps {
    grid-template-columns: 1fr;
  }

  .wfdt-title {
    max-width: 14ch;
  }
}

@media (max-width: 767px) {
  .wfdt-actions,
  .wfdt-sticky,
  .wfdt-sticky-actions {
    align-items: stretch;
  }

  .wfdt-actions,
  .wfdt-sticky {
    flex-direction: column;
  }

  .wfdt-actions .wfdt-button,
  .wfdt-sticky-actions,
  .wfdt-sticky-actions .wfdt-button {
    width: 100%;
  }

  .wfdt-sticky {
    gap: 10px;
    padding: 10px 14px;
  }

  .wfdt-sticky-meta {
    width: 100%;
  }

  .wfdt-highlight-grid {
    grid-template-columns: 1fr;
  }
}
`;
