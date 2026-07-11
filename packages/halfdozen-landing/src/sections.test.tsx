import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, readFileSync } from 'node:fs';
import { clientShapeByName, services, testimonials, tickerLogos } from './content';
import {
  ClientsSection,
  ContentCtaSection,
  DetailsSection,
  FooterSection,
  HalfDozenLanding,
  HeroSection,
  LogoTicker,
  TestimonialSection
} from './sections';

describe('Half Dozen landing components', () => {
  it('renders the production page landmarks and corrected CTA copy', () => {
    const html = renderToStaticMarkup(<HalfDozenLanding />);

    expect(html).toContain('Cut the Noise');
    expect(html).toContain('Our Clients');
    expect(html).toContain('Foundation');
    expect(html).toContain('Request consultation');
    expect(html).not.toContain('consultion');
    expect(html).toContain('business can grow');
    expect(html).toContain('/media/hero-motion.mp4');
    expect(html).toContain('/media/hero-fullbleed-motion.mp4');
    expect(html).toContain('/assets/live-event-photo.png');
  });

  it('keeps each section renderable as an independent Webflow-ready component', () => {
    const components = [
      [<HeroSection key="hero" />, 'Make it Count'],
      [<ClientsSection key="clients" />, 'BLOND:ISH'],
      [<DetailsSection key="details" />, 'Foundation'],
      [<ContentCtaSection key="cta" />, 'Request consultation'],
      [<TestimonialSection key="testimonial" />, 'Stereo Punks'],
      [<FooterSection key="footer" />, 'Privacy Policy']
    ];

    for (const [component, expectedText] of components) {
      const html = renderToStaticMarkup(component);
      expect(html).toContain(expectedText);
      expect(html).toContain('class=');
    }
  });

  it('renders the exact Figma artwork contracts instead of visual placeholders', () => {
    const clientsHtml = renderToStaticMarkup(<ClientsSection />);
    const tickerHtml = renderToStaticMarkup(<LogoTicker />);
    const detailsHtml = renderToStaticMarkup(<DetailsSection />);
    const testimonialHtml = renderToStaticMarkup(<TestimonialSection />);
    const footerHtml = renderToStaticMarkup(<FooterSection />);

    expect(clientsHtml).toContain('/assets/client-shapes/shape-2.png');
    expect(clientsHtml).not.toContain('hd-client-chip--');
    expect(tickerHtml).toContain('/assets/ticker/boots-n-beats.png');
    expect(tickerHtml).not.toContain("Boots 'N Beats</span>");
    expect(detailsHtml).toContain('/assets/details/foundation.webp');
    expect(detailsHtml.match(/aria-pressed=/g)).toHaveLength(6);
    expect(testimonialHtml).toContain('/assets/testimonials/stereo-punks-logo.png');
    expect(testimonialHtml).toContain('Show Stereo Punks testimonial');
    expect(footerHtml).toContain('/assets/brand/footer-mark.png');
  });

  it('ships launch metadata for social previews and canonical discovery', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

    expect(html).toContain('rel="canonical"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('application/ld+json');
  });

  it('uses verified destinations and does not expose unpublished feed cards as links', () => {
    const heroHtml = renderToStaticMarkup(<HeroSection />);
    const contentHtml = renderToStaticMarkup(<ContentCtaSection />);
    const footerHtml = renderToStaticMarkup(<FooterSection />);

    expect(heroHtml).toContain('https://www.linkedin.com/company/halfdozen');
    expect(heroHtml).toContain('https://www.instagram.com/halfdozensolutions/');
    expect(heroHtml).toContain('https://www.halfdozen.co/about-us');
    expect(contentHtml).toContain('mailto:info@halfdozen.co');
    expect(contentHtml).not.toContain('href="#contact"');
    expect(footerHtml).toContain('https://www.halfdozen.co/privacy-policy');
    expect(footerHtml).toContain('https://www.halfdozen.co/terms-of-service');
    expect(footerHtml).toContain('https://www.halfdozen.co/cookie-settings');
  });

  it('keeps every Figma-derived asset path backed by a checked-in file', () => {
    const paths = [
      ...Object.values(clientShapeByName),
      ...services.map((service) => service.artwork),
      ...tickerLogos.map((logo) => logo.image),
      ...testimonials.flatMap((testimonial) => [testimonial.logo, testimonial.image]),
      '/assets/brand/cta-mark.png',
      '/assets/brand/footer-mark.png'
    ];

    for (const path of new Set(paths)) {
      expect(existsSync(new URL(`../public${path}`, import.meta.url)), path).toBe(true);
    }
  });
});
