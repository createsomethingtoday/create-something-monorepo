import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ClientsSection,
  ContentCtaSection,
  DetailsSection,
  FooterSection,
  HalfDozenLanding,
  HeroSection,
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
});
