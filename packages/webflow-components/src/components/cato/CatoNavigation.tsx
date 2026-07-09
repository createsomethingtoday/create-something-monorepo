import React, { useRef, useState } from 'react';
import {
  CatoInsightsMegaMenu,
  type CatoInsightLinkProp,
  type CatoInsightsDataProps
} from './CatoInsights';

export interface CatoNavigationImage {
  src: string;
  alt?: string;
}

export interface CatoNavigationProps extends CatoInsightsDataProps {
  logoImage?: CatoNavigationImage;
  homeLink?: CatoInsightLinkProp;
  homeHref?: string;
  aboutLink?: CatoInsightLinkProp;
  aboutHref?: string;
  leadershipLink?: CatoInsightLinkProp;
  leadershipHref?: string;
  boardLink?: CatoInsightLinkProp;
  boardHref?: string;
  solutionsLink?: CatoInsightLinkProp;
  solutionsHref?: string;
  technologyLink?: CatoInsightLinkProp;
  technologyHref?: string;
  insightsLink?: CatoInsightLinkProp;
  insightsHref?: string;
  insightsHomeLink?: CatoInsightLinkProp;
  resiliencyLink?: CatoInsightLinkProp;
  researchLink?: CatoInsightLinkProp;
  whitepapersLink?: CatoInsightLinkProp;
  newsroomLink?: CatoInsightLinkProp;
  caseStudiesLink?: CatoInsightLinkProp;
  caseStudiesHref?: string;
  riskRadarLink?: CatoInsightLinkProp;
  riskRadarHref?: string;
  aboutLabel?: string;
  whoWeAreLabel?: string;
  leadershipLabel?: string;
  boardLabel?: string;
  solutionsLabel?: string;
  technologyLabel?: string;
  insightsLabel?: string;
  caseStudiesLabel?: string;
  riskRadarLabel?: string;
  productSearchLink?: CatoInsightLinkProp;
  productSearchHref?: string;
  productSearchLabel?: string;
  mobileMenuLabel?: string;
  mobileMenuCloseLabel?: string;
  introKicker?: string;
  heading?: string;
  summary?: string;
  introCtaLabel?: string;
  browseKicker?: string;
  featureTitle?: string;
  featureSummary?: string;
  featureCta?: string;
  featureLabel?: string;
  featureHref?: string;
  featureItemsJson?: string;
  showFeatureItems?: boolean;
  showFeatureCta?: boolean;
  featureItemLimit?: number;
  fixed?: boolean;
  showInsightsMegaMenu?: boolean;
}

const CATO_NAV_CSS = `
  .cato-nav-shell {
    --cato-nav-bg: var(--background-color--background-primary, #ffffff);
    --cato-nav-text: var(--text-color--text-primary, #282723);
    --cato-nav-muted: var(--text-color--text-secondary, rgba(40,39,35,.68));
    --cato-nav-border: var(--border-color--border-primary, rgba(40,39,35,.12));
    --cato-nav-soft: var(--background-color--background-secondary, #fbf9f4);
    --cato-nav-green: var(--base-color-green--green-900, #0a452e);
    --cato-nav-green-mid: var(--base-color-green--green-800, #0d5b3c);
    --cato-nav-blue: var(--base-color-blue--blue-500, #0a3e71);
    --cato-nav-blue-mid: var(--base-color-blue--blue-700, #072c50);
    --cato-nav-blue-soft: var(--base-color-blue--blue-300, #5b7ea0);
    --cato-nav-white: var(--base-color-charcoal--white, #ffffff);
    position: relative;
    z-index: 50;
    color: var(--cato-nav-text);
    background: var(--cato-nav-bg);
    border-bottom: 1px solid rgba(40,39,35,.06);
    font-family: "Inter Variable", Inter, Arial, sans-serif;
  }
  .cato-nav-shell[data-fixed=true] {
    position: sticky;
    top: 0;
  }
  .cato-nav-shell *, .cato-nav-shell *::before, .cato-nav-shell *::after {
    box-sizing: border-box;
  }
  .cato-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    width: min(100%, 80rem);
    min-height: 5rem;
    margin: 0 auto;
    padding: .95rem 2.5rem;
  }
  .cato-nav a {
    color: inherit;
    text-decoration: none;
  }
  .cato-nav__brand {
    display: inline-flex;
    align-items: center;
    gap: .7rem;
    flex: none;
    min-width: 7.75rem;
    color: var(--cato-nav-text);
    font-family: Switzer, Arial, sans-serif;
    font-size: 1.85rem;
    font-weight: 700;
    line-height: 1;
  }
  .cato-nav__brand img {
    display: block;
    width: auto;
    max-width: 8rem;
    height: 2.35rem;
    object-fit: contain;
  }
  .cato-nav__brand-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 999rem;
    color: var(--cato-nav-white);
    background: var(--cato-nav-green-mid);
    font-size: 1.1rem;
    font-weight: 800;
  }
  .cato-nav__center {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1 1 auto;
  }
  .cato-nav__links {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: .25rem;
    border-radius: .75rem;
  }
  .cato-nav__link,
  .cato-nav__trigger {
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    min-height: 2.75rem;
    border: 0;
    border-radius: .5rem;
    background: transparent;
    color: var(--cato-nav-muted);
    padding: .5rem 1rem;
    font: inherit;
    font-size: 1rem;
    line-height: 1.2;
    white-space: nowrap;
    cursor: pointer;
  }
  .cato-nav__link:hover,
  .cato-nav__trigger:hover,
  .cato-nav__dropdown[data-open=true] > .cato-nav__trigger,
  .cato-nav__dropdown:focus-within > .cato-nav__trigger {
    color: var(--cato-nav-text);
    background: var(--cato-nav-soft);
  }
  .cato-nav__caret {
    width: .75rem;
    height: .75rem;
    flex: none;
    transition: transform .18s ease;
  }
  .cato-nav__dropdown:hover > .cato-nav__trigger .cato-nav__caret,
  .cato-nav__dropdown[data-open=true] > .cato-nav__trigger .cato-nav__caret,
  .cato-nav__dropdown:focus-within > .cato-nav__trigger .cato-nav__caret {
    transform: rotate(180deg);
  }
  .cato-nav__dropdown {
    position: relative;
  }
  .cato-nav__dropdown--mega {
    position: static;
  }
  .cato-nav__dropdown-menu {
    position: absolute;
    top: calc(100% + .65rem);
    left: 0;
    min-width: 14rem;
    border: 1px solid var(--cato-nav-border);
    border-radius: 1rem;
    background: var(--cato-nav-bg);
    box-shadow: 0 1.25rem 3rem rgba(17,16,15,.12);
    padding: 1rem 1.75rem 1rem 1.5rem;
    opacity: 0;
    transform: translate3d(0, .4rem, 0);
    pointer-events: none;
    transition: opacity .16s ease, transform .16s ease;
  }
  .cato-nav__dropdown-menu::before {
    content: "";
    position: absolute;
    top: -.85rem;
    left: -.25rem;
    right: -.25rem;
    height: .85rem;
  }
  .cato-nav__dropdown:hover > .cato-nav__dropdown-menu,
  .cato-nav__dropdown[data-open=true] > .cato-nav__dropdown-menu,
  .cato-nav__dropdown:focus-within > .cato-nav__dropdown-menu {
    opacity: 1;
    transform: translate3d(0, 0, 0);
    pointer-events: auto;
  }
  .cato-nav__dropdown-item {
    display: block;
    border-radius: .45rem;
    color: var(--cato-nav-muted);
    padding: .5rem 0;
    font-weight: 700;
  }
  .cato-nav__dropdown-item:hover,
  .cato-nav__dropdown-item:focus-visible {
    color: var(--cato-nav-green);
    background: rgba(10,69,46,.06);
  }
  .cato-nav__mega-panel {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    width: 100%;
    opacity: 0;
    transform: translate3d(0, .45rem, 0);
    pointer-events: none;
    transition: opacity .16s ease, transform .16s ease;
    z-index: 20;
  }
  .cato-nav__mega-panel::before {
    content: "";
    position: absolute;
    top: -.85rem;
    left: 0;
    right: 0;
    height: .85rem;
  }
  .cato-nav__dropdown:hover > .cato-nav__mega-panel,
  .cato-nav__dropdown[data-open=true] > .cato-nav__mega-panel,
  .cato-nav__dropdown:focus-within > .cato-nav__mega-panel {
    opacity: 1;
    transform: translate3d(0, 0, 0);
    pointer-events: auto;
  }
  .cato-nav__mega-panel .cato-cc-mega {
    border-top-color: rgba(40,39,35,.06);
  }
  .cato-nav__mega-panel .cato-cc-mega-inner {
    min-height: 18.5rem;
  }
  .cato-nav__actions {
    display: flex;
    align-items: center;
    gap: .75rem;
    flex: none;
  }
  .cato-nav__cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .65rem;
    min-height: 3.25rem;
    border-radius: .5rem;
    color: var(--cato-nav-white) !important;
    background: linear-gradient(105deg, var(--cato-nav-blue), var(--cato-nav-blue-soft) 49%, var(--cato-nav-blue-mid));
    padding: .8rem 1rem;
    font-weight: 700;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.14), 0 .7rem 1.35rem rgba(10,62,113,.14);
  }
  .cato-nav__cta:hover {
    background: linear-gradient(105deg, var(--cato-nav-blue-mid), var(--cato-nav-blue) 52%, #041a2f);
  }
  .cato-nav__cta svg {
    width: 1rem;
    height: 1rem;
    flex: none;
  }
  .cato-nav__menu-button {
    display: none;
    align-items: center;
    justify-content: center;
    min-height: 2.75rem;
    border: 1px solid var(--cato-nav-border);
    border-radius: .5rem;
    background: var(--cato-nav-bg);
    color: var(--cato-nav-text);
    padding: .65rem .8rem;
    font: inherit;
    font-weight: 700;
  }
  @media (max-width: 991px) {
    .cato-nav {
      flex-wrap: wrap;
      padding: .85rem 1.25rem;
    }
    .cato-nav__center {
      order: 3;
      flex-basis: 100%;
      justify-content: stretch;
      display: none;
    }
    .cato-nav__center[data-open=true] {
      display: block;
    }
    .cato-nav__links {
      align-items: stretch;
      flex-direction: column;
      width: 100%;
      border: 1px solid var(--cato-nav-border);
      border-radius: .75rem;
      background: var(--cato-nav-bg);
      padding: .65rem;
    }
    .cato-nav__link,
    .cato-nav__trigger {
      justify-content: space-between;
      width: 100%;
    }
    .cato-nav__dropdown-menu,
    .cato-nav__mega-panel {
      position: static;
      width: 100%;
      min-width: 0;
      opacity: 1;
      transform: none;
      pointer-events: auto;
      box-shadow: none;
      margin: .35rem 0 .75rem;
    }
    .cato-nav__dropdown-menu {
      border: 0;
      border-radius: 0;
      background: transparent;
      padding: .25rem 0 .65rem;
    }
    .cato-nav__dropdown-item {
      padding: .95rem 1.25rem;
      font-size: 1.05rem;
      line-height: 1.2;
    }
    .cato-nav__mega-panel {
      display: block;
    }
    .cato-nav__mega-panel .cato-cc-mega-inner {
      width: 100%;
      padding: 1.25rem;
    }
    .cato-nav__actions {
      margin-left: auto;
    }
    .cato-nav__cta {
      display: none;
    }
    .cato-nav__menu-button {
      display: inline-flex;
    }
  }
  @media (max-width: 767px) {
    .cato-nav__dropdown-item {
      font-size: 1rem;
      padding: .85rem 1.05rem;
    }
    .cato-nav__mega-panel .cato-cc-mega-link {
      padding: .85rem 1.05rem;
    }
    .cato-nav__mega-panel .cato-cc-mega-link strong {
      font-size: 1rem;
      line-height: 1.2;
    }
    .cato-nav__mega-panel .cato-cc-mega-link span {
      display: none;
    }
  }
`;

function normalizePrefix(prefix = '') {
  if (!prefix) return '';
  return prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
}

function hrefForPage(
  page: string,
  linkMode: CatoInsightsDataProps['linkMode'] = 'webflow',
  pathPrefix = ''
) {
  const prefix = normalizePrefix(pathPrefix);
  const clean = linkMode === 'export' ? page : page.replace(/\.html$/, '');
  return `${prefix}/${clean}`.replace(/\/{2,}/g, '/');
}

function displayHref(value: string | undefined, fallback: string) {
  const cleaned = value?.trim();
  return cleaned && cleaned !== '#' ? cleaned : fallback;
}

function displayLabel(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function resolveLink(
  link: CatoInsightLinkProp | undefined,
  href: string | undefined,
  fallback: string
) {
  const resolvedHref = displayHref(link?.href, displayHref(href, fallback));
  const target = link?.target || undefined;
  return {
    href: resolvedHref,
    target,
    rel: target === '_blank' ? 'noreferrer' : undefined
  };
}

function CaretIcon() {
  return (
    <svg
      className="cato-nav__caret"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M7.5 15L12.5 10L7.5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type OpenDropdown = 'about' | 'insights' | null;

export const CatoNavigation: React.FC<CatoNavigationProps> = ({
  logoImage,
  homeLink,
  homeHref,
  aboutLink,
  aboutHref,
  leadershipLink,
  leadershipHref,
  boardLink,
  boardHref,
  solutionsLink,
  solutionsHref,
  technologyLink,
  technologyHref,
  insightsLink,
  insightsHref,
  caseStudiesLink,
  caseStudiesHref,
  riskRadarLink,
  riskRadarHref = 'https://app.catosupply.com/risk_radar/',
  aboutLabel,
  whoWeAreLabel,
  leadershipLabel,
  boardLabel,
  solutionsLabel,
  technologyLabel,
  insightsLabel,
  caseStudiesLabel,
  riskRadarLabel,
  productSearchLink,
  productSearchHref = 'https://app.catosupply.com/product_search/',
  productSearchLabel = 'Product Search',
  mobileMenuLabel = 'Menu',
  mobileMenuCloseLabel = 'Close',
  fixed = false,
  showInsightsMegaMenu = true,
  linkMode = 'webflow',
  pathPrefix = '',
  ...dataProps
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedHomeLink = resolveLink(
    homeLink,
    homeHref,
    linkMode === 'export' ? 'index.html' : '/'
  );
  const resolvedAboutLink = resolveLink(
    aboutLink,
    aboutHref,
    hrefForPage('about-us.html', linkMode, pathPrefix)
  );
  const resolvedLeadershipLink = resolveLink(
    leadershipLink,
    leadershipHref,
    hrefForPage('leadership.html', linkMode, pathPrefix)
  );
  const resolvedBoardLink = resolveLink(
    boardLink,
    boardHref,
    hrefForPage('board-of-directors.html', linkMode, pathPrefix)
  );
  const resolvedSolutionsLink = resolveLink(
    solutionsLink,
    solutionsHref,
    hrefForPage('solutions.html', linkMode, pathPrefix)
  );
  const resolvedTechnologyLink = resolveLink(
    technologyLink,
    technologyHref,
    hrefForPage('technology.html', linkMode, pathPrefix)
  );
  const resolvedInsightsLink = resolveLink(
    insightsLink,
    insightsHref,
    hrefForPage('insights.html', linkMode, pathPrefix)
  );
  const resolvedCaseStudiesLink = resolveLink(
    caseStudiesLink,
    caseStudiesHref,
    hrefForPage('case-studies.html', linkMode, pathPrefix)
  );
  const resolvedRiskRadarLink = resolveLink(
    riskRadarLink,
    riskRadarHref,
    'https://app.catosupply.com/risk_radar/'
  );
  const resolvedProductSearchLink = resolveLink(
    productSearchLink,
    productSearchHref,
    'https://app.catosupply.com/product_search/'
  );
  const logoSrc = logoImage?.src || '';
  const labels = {
    about: displayLabel(aboutLabel, 'About Us'),
    whoWeAre: displayLabel(whoWeAreLabel, 'Who We Are'),
    leadership: displayLabel(leadershipLabel, 'Leadership'),
    board: displayLabel(boardLabel, 'Board of Directors'),
    solutions: displayLabel(solutionsLabel, 'Solutions'),
    technology: displayLabel(technologyLabel, 'Technology'),
    insights: displayLabel(insightsLabel, 'Insights'),
    caseStudies: displayLabel(caseStudiesLabel, 'Case Studies'),
    riskRadar: displayLabel(riskRadarLabel, 'Risk Radar'),
    mobileMenu: displayLabel(mobileMenuLabel, 'Menu'),
    mobileMenuClose: displayLabel(mobileMenuCloseLabel, 'Close')
  };
  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const openMenu = (name: Exclude<OpenDropdown, null>) => {
    clearCloseTimer();
    setOpenDropdown(name);
  };
  const scheduleCloseMenu = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpenDropdown(null);
      closeTimerRef.current = null;
    }, 220);
  };
  const closeWhenFocusLeaves = (event: React.FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }
    scheduleCloseMenu();
  };

  return (
    <header className="cato-nav-shell" data-fixed={fixed ? 'true' : undefined}>
      <style>{CATO_NAV_CSS}</style>
      <nav className="cato-nav" aria-label="Primary navigation">
        <a
          className="cato-nav__brand"
          href={resolvedHomeLink.href}
          target={resolvedHomeLink.target}
          rel={resolvedHomeLink.rel}
          aria-label="Cato home"
        >
          {logoSrc ? (
            <img src={logoSrc} alt={logoImage?.alt || 'Cato'} loading="eager" />
          ) : (
            <>
              <span className="cato-nav__brand-mark">C</span>
              <span>cato</span>
            </>
          )}
        </a>

        <div className="cato-nav__center" data-open={menuOpen ? 'true' : undefined}>
          <div className="cato-nav__links">
            <div
              className="cato-nav__dropdown"
              data-open={openDropdown === 'about' ? 'true' : undefined}
              onMouseEnter={() => openMenu('about')}
              onMouseLeave={scheduleCloseMenu}
              onFocus={() => openMenu('about')}
              onBlur={closeWhenFocusLeaves}
            >
              <a
                href={resolvedAboutLink.href}
                target={resolvedAboutLink.target}
                rel={resolvedAboutLink.rel}
                className="cato-nav__trigger"
                aria-haspopup="true"
                aria-expanded={openDropdown === 'about'}
              >
                <span>{labels.about}</span>
                <CaretIcon />
              </a>
              <div className="cato-nav__dropdown-menu">
                <a
                  href={resolvedAboutLink.href}
                  target={resolvedAboutLink.target}
                  rel={resolvedAboutLink.rel}
                  className="cato-nav__dropdown-item"
                >
                  {labels.whoWeAre}
                </a>
                <a
                  href={resolvedLeadershipLink.href}
                  target={resolvedLeadershipLink.target}
                  rel={resolvedLeadershipLink.rel}
                  className="cato-nav__dropdown-item"
                >
                  {labels.leadership}
                </a>
                <a
                  href={resolvedBoardLink.href}
                  target={resolvedBoardLink.target}
                  rel={resolvedBoardLink.rel}
                  className="cato-nav__dropdown-item"
                >
                  {labels.board}
                </a>
                <a
                  href={resolvedSolutionsLink.href}
                  target={resolvedSolutionsLink.target}
                  rel={resolvedSolutionsLink.rel}
                  className="cato-nav__dropdown-item"
                >
                  {labels.solutions}
                </a>
                <a
                  href={resolvedTechnologyLink.href}
                  target={resolvedTechnologyLink.target}
                  rel={resolvedTechnologyLink.rel}
                  className="cato-nav__dropdown-item"
                >
                  {labels.technology}
                </a>
              </div>
            </div>

            <div
              className="cato-nav__dropdown cato-nav__dropdown--mega"
              data-open={openDropdown === 'insights' ? 'true' : undefined}
              onMouseEnter={() => openMenu('insights')}
              onMouseLeave={scheduleCloseMenu}
              onFocus={() => openMenu('insights')}
              onBlur={closeWhenFocusLeaves}
            >
              <a
                href={resolvedInsightsLink.href}
                target={resolvedInsightsLink.target}
                rel={resolvedInsightsLink.rel}
                className="cato-nav__trigger"
                aria-haspopup="true"
                aria-expanded={openDropdown === 'insights'}
              >
                <span>{labels.insights}</span>
                <CaretIcon />
              </a>
              {showInsightsMegaMenu ? (
                <div className="cato-nav__mega-panel">
                  <CatoInsightsMegaMenu
                    linkMode={linkMode}
                    pathPrefix={pathPrefix}
                    {...dataProps}
                    insightsHomeLink={dataProps.insightsHomeLink || insightsLink}
                  />
                </div>
              ) : null}
            </div>

            <a
              href={resolvedCaseStudiesLink.href}
              target={resolvedCaseStudiesLink.target}
              rel={resolvedCaseStudiesLink.rel}
              className="cato-nav__link"
            >
              {labels.caseStudies}
            </a>
            <a
              href={resolvedRiskRadarLink.href}
              target={resolvedRiskRadarLink.target}
              rel={resolvedRiskRadarLink.rel}
              className="cato-nav__link"
            >
              {labels.riskRadar}
            </a>
          </div>
        </div>

        <div className="cato-nav__actions">
          <a
            href={resolvedProductSearchLink.href}
            target={resolvedProductSearchLink.target}
            rel={resolvedProductSearchLink.rel}
            className="cato-nav__cta"
          >
            <span>{productSearchLabel}</span>
            <ArrowIcon />
          </a>
          <button
            className="cato-nav__menu-button"
            type="button"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? labels.mobileMenuClose : labels.mobileMenu}
          </button>
        </div>
      </nav>
    </header>
  );
};
