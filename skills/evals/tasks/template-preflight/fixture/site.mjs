// A synthetic published template, served by ../../../ablate.mjs for the
// template-preflight task. It is not a real template. expected.json lists what
// is wrong with it on purpose.
const NAME = 'Quillmere';
const SITE = '6f0000000000000000000a01';

const nav = `<div class="navbar w-nav" data-collapse="medium" role="banner"><div class="container nav-container">
<a href="/" class="brand w-nav-brand"><img src="/images/quillmere-logo.svg" alt="${NAME}" width="132" height="28" loading="eager"></a>
<nav role="navigation" class="nav-menu w-nav-menu"><a href="/about" class="nav-link w-nav-link">About</a><a href="/projects" class="nav-link w-nav-link">Projects</a><a href="/contact" class="nav-link w-nav-link">Contact</a>
<a href="https://example.com/quill-studio/quillmere" class="button small w-button">Buy this template</a></nav>
<div class="menu-button w-nav-button" aria-label="Menu"><div class="w-icon-nav-menu"></div></div></div></div>`;

const footer = `<footer class="footer"><div class="container footer-grid">
<div><a href="/" class="footer-brand"><img src="/images/quillmere-logo.svg" alt="${NAME}" width="132" height="28" loading="lazy"></a><p class="footer-note">Architecture and interiors for homes that last.</p></div>
<div class="footer-links"><a href="/about">About</a><a href="/projects">Projects</a><a href="/contact">Contact</a></div>
<div class="footer-links"><a href="/style-guide">Style Guide</a><a href="/license">Licenses</a><a href="/instructions">Instructions</a></div></div>
<div class="container footer-bottom"><div>Designed by <a href="https://example.com/quill-studio">Quill Studio</a> · <a href="https://example.com/quill-studio/templates">More templates by Quill Studio</a></div>
<a href="#" class="footer-webflow">Powered by Webflow</a></div></footer>`;

const scripts = (
  extra = ''
) => `<script src="https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=${SITE}" type="text/javascript" crossorigin="anonymous"></script>
<script src="/js/webflow.js" type="text/javascript"></script>
<script src="https://cdn.prod.website-files.com/gsap/3.13.0/gsap.min.js" type="text/javascript"></script>
<script src="https://cdn.prod.website-files.com/gsap/3.13.0/ScrollTrigger.min.js" type="text/javascript"></script>
<script src="https://unpkg.com/lenis@1.1.20/dist/lenis.min.js"></script>
<script>
const lenis = new Lenis();
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);
gsap.registerPlugin(ScrollTrigger);
gsap.from('.hero-title', { y: 40, opacity: 0, duration: 0.8, ease: 'power2.out' });
ScrollTrigger.batch('.reveal', { onEnter: (els) => gsap.from(els, { y: 24, opacity: 0, duration: 0.6, stagger: 0.08 }) });
</script>${extra}`;

function page({ path, title, description, body, base, noindex = false, head = '', tail = '' }) {
  return `<!DOCTYPE html><html data-wf-domain="quillmere.webflow.io" data-wf-page="6f00000000000000000${String(
    Math.abs(hash(path))
  )
    .padStart(5, '0')
    .slice(0, 5)}" data-wf-site="${SITE}" lang="en"><head><meta charset="utf-8">
<title>${title}</title>
<meta content="${description}" name="description">
<meta content="${title}" property="og:title"><meta content="${description}" property="og:description">
<meta content="${base}/images/og-quillmere.webp" property="og:image">
<meta property="og:type" content="website"><meta content="summary_large_image" name="twitter:card">
<meta content="width=device-width, initial-scale=1" name="viewport">
<link href="/css/quillmere.webflow.css" rel="stylesheet" type="text/css">
<link href="https://fonts.googleapis.com" rel="preconnect"><link href="https://fonts.gstatic.com" rel="preconnect" crossorigin="anonymous">
<link href="/images/favicon.png" rel="shortcut icon" type="image/x-icon"><link href="/images/webclip.png" rel="apple-touch-icon">
${noindex ? '<meta name="robots" content="noindex">' : ''}<style>body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}</style>${head}
</head><body>${nav}<main class="main">${body}</main>${footer}${scripts(tail)}</body></html>`;
}

function hash(text) {
  let value = 7;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) % 99991;
  return value;
}

const projects = [
  [
    'harbor-house',
    'Harbor House',
    'A timber home on a narrow waterfront lot, planned around the morning sun.'
  ],
  [
    'cedar-loft',
    'Cedar Loft',
    'A warehouse floor turned into a calm family apartment with a planted court.'
  ],
  [
    'field-pavilion',
    'Field Pavilion',
    'A small public pavilion for a farm market, built from local stone and larch.'
  ]
];
const cardExcerpt = 'A considered home shaped around daily life and the path of the sun.';

const home = (base) =>
  page({
    path: '/',
    base,
    title: `${NAME} - Webflow HTML Website Template`,
    description:
      'Quillmere is an architecture studio website with projects, studio pages and a contact form.',
    head: '<link href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" rel="stylesheet">',
    tail: `<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script>
new Swiper('.featured-slider', { slidesPerView: 1.2, spaceBetween: 24, loop: true });
document.querySelectorAll('.stat-number').forEach(function (el) {
  var target = Number(el.getAttribute('data-count')); var current = 0;
  var timer = setInterval(function () { current += Math.ceil(target / 40); if (current >= target) { current = target; clearInterval(timer); } el.textContent = current; }, 30);
});
</script>`,
    body: `<section class="section hero"><div class="container"><h1 class="hero-title">Architecture shaped by light</h1>
<p class="hero-text">Quillmere™ is a small studio for houses, lofts and public rooms. We design buildings that respond to light, climate and the</p>
<a href="/projects" class="button w-button">See the projects</a></div></section>
<section class="section"><div class="container stats-grid"><div class="stat reveal"><div class="stat-number" data-count="128">0</div><div class="stat-label">Homes completed</div></div>
<div class="stat reveal"><div class="stat-number" data-count="14">0</div><div class="stat-label">Years in practice</div></div>
<div class="stat reveal"><div class="stat-number" data-count="9">0</div><div class="stat-label">Design awards</div></div></div></section>
<section class="section"><div class="container"><h2>Trusted by clients and partners</h2><div class="logo-strip">
<img src="/images/logo-stripe.svg" alt="Stripe logo" width="120" height="40" loading="lazy"><img src="/images/logo-slack.svg" alt="Slack logo" width="120" height="40" loading="lazy">
<img src="/images/logo-northfold.svg" alt="Northfold logo" width="120" height="40" loading="lazy"><img src="/images/logo-alder.svg" alt="Alder and Co logo" width="120" height="40" loading="lazy"></div></div></section>
<section class="section"><div class="container"><h2>Featured projects</h2><div class="featured-slider swiper"><div class="swiper-wrapper">
${projects.map(([slug, name]) => `<a href="/project/${slug}" class="swiper-slide"><img src="/images/${slug}-wide.jpg" alt="${name} exterior" loading="lazy"><h3>${name}</h3></a>`).join('\n')}
</div></div></div></section>
<section class="section cta"><div class="container"><h2>Plan a building with us</h2><p>Tell us about the site, the budget and the people who will use the rooms.</p><a href="/contact" class="button w-button">Start a project</a></div></section>`
  });

const about = (base) =>
  page({
    path: '/about',
    base,
    noindex: true,
    title: `About - ${NAME}`,
    description:
      'Meet the Quillmere studio: who we are, how we work and what we believe about buildings.',
    body: `<div class="section page-header"><div class="container"><h1>About the studio</h1><p>Our dental clinic has cared for families in the valley since 2009, and that same care goes into every building we draw.</p></div></div>
<div class="section"><div class="container"><h1>How we work</h1><h2>Listen first</h2><p>Each project starts with a long visit to the site and a longer talk with the people who will live there.</p>
<h2>Draw less, test more</h2><p>We build large models early, so decisions about light and proportion happen before the drawings harden.</p></div></div>
<section class="section"><div class="container"><h2>The team</h2><div class="team-grid">
<div class="team-card reveal"><img src="/images/team-ines.jpg" alt="Portrait of Ines Halloran" width="480" height="600" loading="lazy"><h3>Ines Halloran</h3><p>Founding architect</p></div>
<div class="team-card reveal"><img src="/images/team-tomas.jpg" alt="Portrait of Tomas Wray" width="480" height="600" loading="lazy"><h3>Tomas Wray</h3><p>Project lead</p></div>
<div class="team-card reveal"><img src="/images/team-odile.jpg" alt="Portrait of Odile Marsh" width="480" height="600" loading="lazy"><h3>Odile Marsh</h3><p>Interior designer</p></div></div></div></section>`
  });

const projectsPage = (base) =>
  page({
    path: '/projects',
    base,
    title: `About - ${NAME}`,
    description:
      'Meet the Quillmere studio: who we are, how we work and what we believe about buildings.',
    body: `<section class="section page-header"><div class="container"><h1>Projects</h1><p>Houses, lofts and public rooms from the last ten years.</p></div></section>
<section class="section"><div class="container"><div class="w-dyn-list"><div role="list" class="project-grid w-dyn-items">
${projects.map(([slug, name]) => `<div role="listitem" class="project-card w-dyn-item reveal"><a href="/project/${slug}" class="project-image-link"><img src="/images/${slug}.jpg" alt="${name}" loading="lazy" class="project-image"></a><h2 class="project-name">${name}</h2><p class="project-excerpt">${cardExcerpt}</p></div>`).join('\n')}
</div></div></div></section>`
  });

const project = (base, [slug, name, summary]) =>
  page({
    path: `/project/${slug}`,
    base,
    title: `${name} - ${NAME}`,
    description: `${summary} A Quillmere project.`,
    body: `<section class="section page-header"><div class="container"><h1>${name}</h1><p>${summary}</p></div></section>
<section class="section"><div class="container"><img src="/images/${slug}-hero.jpg" alt="${name} seen from the street" width="1600" height="900" loading="eager">
<div class="rich-text w-richtext"><h2>The brief</h2><p>The owners asked for rooms that stay cool in summer without machines, and a kitchen that opens to the garden.</p><h2>The result</h2><p>Deep eaves, a planted court and one long window wall do most of the work. The house uses a third of the energy of its neighbours.</p></div>
<a href="/projects" class="button secondary w-button">All projects</a></div></section>`
  });

const contact = (base) =>
  page({
    path: '/contact',
    base,
    title: 'Contact | Quilmere',
    description:
      'Write to the Quillmere studio about a new house, a renovation or a public building.',
    body: `<section class="section page-header"><div class="container"><h1>Contact</h1><p>We answer every message within two working days.</p></div></section>
<section class="section"><div class="container"><div class="form-block w-form"><form id="email-form" name="email-form" data-name="Email Form" method="get" class="form">
<label for="name">Name</label><input class="text-field w-input" maxlength="256" name="name" data-name="Name" placeholder="Your name" type="text" id="name" required>
<label for="email">Email address</label><input class="text-field w-input" maxlength="256" name="email" data-name="Email" placeholder="you@example.com" type="email" id="email" required>
<input class="text-field w-input" maxlength="256" name="field-2" data-name="Field 2" placeholder="Example Text" type="text" id="field-2">
<label for="message">Message</label><textarea id="message" name="message" maxlength="5000" data-name="Message" placeholder="Tell us about the project" class="text-field w-input"></textarea>
<input type="submit" data-wait="Please wait..." class="button w-button" value="Send message"></form>
<div class="w-form-done"><div>Thank you! Your submission has been received!</div></div><div class="w-form-fail"><div>Oops! Something went wrong while submitting the form.</div></div></div></div></section>`
  });

const styleGuide = (base) =>
  page({
    path: '/style-guide',
    base,
    title: `Style Guide - ${NAME}`,
    description: 'Colors, type styles, buttons and form elements used in the Quillmere template.',
    body: `<section class="section page-header"><div class="container"><h1>Style Guide</h1><p>The building blocks of this template.</p></div></section>
<section class="section"><div class="container"><h2>Typography</h2><h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3><h4>Heading 4</h4><h5>Heading 5</h5><h6>Heading 6</h6>
<p>Paragraph text with a <a href="/about">text link</a>.</p><ul role="list"><li>Unordered item</li><li>Unordered item</li></ul><ol role="list"><li>Ordered item</li><li>Ordered item</li></ol>
<blockquote>Good buildings come from good questions.</blockquote><figure><img src="/images/harbor-house.jpg" alt="Harbor House" width="800" height="600" loading="lazy"><figcaption>Figure caption</figcaption></figure>
<h2>Buttons</h2><a href="/contact" class="button w-button">Primary button</a> <a href="/projects" class="button secondary w-button">Secondary button</a>
<h2>Colors</h2><div class="swatch-grid"><div class="swatch ink">Ink</div><div class="swatch clay">Clay</div><div class="swatch paper">Paper</div></div></div></section>`
  });

const licenses = (base) =>
  page({
    path: '/license',
    base,
    noindex: true,
    title: `Licenses - ${NAME}`,
    description:
      'Sources and licenses for the fonts, images and icons used in the Quillmere template.',
    body: `<section class="section page-header"><div class="container"><h1>Licenses</h1><p>Every asset in this template is free to use in personal and commercial projects. Details for each asset are below.</p></div></section>
<section class="section"><div class="container"><h2>Fonts</h2><p><a href="https://fonts.google.com/specimen/Inter">Inter</a> and <a href="https://fonts.google.com/specimen/Fraunces">Fraunces</a>, from Google Fonts under the Open Font License.</p>
<h2>Images</h2><p>Photographs from <a href="https://unsplash.com/license">Unsplash</a> under the Unsplash License.</p>
<h2>Icons</h2><p>Icons from <a href="https://phosphoricons.com">Phosphor Icons</a> under the MIT License.</p></div></section>`
  });

const instructions = (base) =>
  page({
    path: '/instructions',
    base,
    noindex: true,
    title: `Instructions - ${NAME}`,
    description:
      'How to change colors, replace the logo and turn off smooth scrolling in the Quillmere template.',
    body: `<section class="section page-header"><div class="container"><h1>Instructions</h1><p>Short guides for the parts of this template that need more than the Designer panel.</p></div></section>
<section class="section"><div class="container"><h2>Change the colors</h2><p>Open the Variables panel and edit Ink, Clay and Paper. Every page updates.</p>
<h2>Replace the logo</h2><p>Open the Navbar component, select the logo image and choose your file. Do the same in the Footer component.</p>
<h2>Turn off smooth scrolling</h2><p>Smooth scrolling uses Lenis. To remove it, open Site settings, go to Custom code and delete the Lenis script tag and the three lines that start it.</p></div></section>`
  });

const notFound = (base) =>
  page({
    path: '/404',
    base,
    title: `Not Found - ${NAME}`,
    description:
      'This page does not exist. Go back to the Quillmere home page or see the projects.',
    body: `<section class="section page-header"><div class="container"><h1>Page not found</h1><p>The page you asked for has moved or never existed.</p><a href="/" class="button w-button">Back to home</a> <a href="/projects" class="button secondary w-button">See the projects</a></div></section>`
  });

const css = `body{font-family:Inter,sans-serif;color:#1d1b18;background:#f7f4ee}h1,h2,h3{font-family:Fraunces,serif}.container{max-width:1200px;margin:0 auto;padding:0 5%}.section{padding:6rem 0}.button{background:#1d1b18;color:#f7f4ee;padding:.9rem 1.4rem;transition:background-color .2s}.project-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem}`;

// routes(base) → { path: html | { status, type, body } }. Paths that are absent answer 404 with the 404 page.
export function routes(base) {
  const pages = {
    '/': home(base),
    '/about': about(base),
    '/projects': projectsPage(base),
    '/contact': contact(base),
    '/style-guide': styleGuide(base),
    '/license': licenses(base),
    '/instructions': instructions(base)
  };
  for (const entry of projects) pages[`/project/${entry[0]}`] = project(base, entry);
  pages['/css/quillmere.webflow.css'] = { status: 200, type: 'text/css', body: css };
  pages['/js/webflow.js'] = { status: 200, type: 'text/javascript', body: '/* Webflow runtime */' };
  return { pages, notFound: notFound(base) };
}
