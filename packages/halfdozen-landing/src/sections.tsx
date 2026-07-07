import { assetDefaults, clients, keepUpItems, navItems, services, testimonials } from './content';

export type HalfDozenAssetProps = Partial<typeof assetDefaults>;

export type HeroProps = HalfDozenAssetProps & {
  eyebrow?: string;
  description?: string;
};

export function HalfDozenLogo({ inverted = false }: { inverted?: boolean }) {
  return (
    <a className={`hd-logo ${inverted ? 'hd-logo--inverted' : ''}`} href="/" aria-label="Half Dozen home">
      <span className="hd-logo-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>Half Dozen</span>
    </a>
  );
}

export function HalfDozenHeader() {
  return (
    <header className="hd-header">
      <HalfDozenLogo />
      <nav className="hd-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <a href={`#${item.toLowerCase()}`} key={item}>
            {item}
          </a>
        ))}
      </nav>
      <a className="hd-button hd-button--quiet" href="#contact">
        Get in touch
      </a>
    </header>
  );
}

export function HeroSection({
  heroCard = assetDefaults.heroCard,
  eventPhoto = assetDefaults.eventPhoto,
  eyebrow = 'A system is an interconnected set of elements that is coherently organized in a way that achieves something.',
  description = 'Half Dozen is a strategic solutions partner helping teams in live events build better systems and do more with less.'
}: HeroProps) {
  return (
    <section className="hd-section hd-hero" id="work">
      <HalfDozenHeader />
      <div className="hd-hero__headline">
        <h1>
          <span>
            <span>Cut the Noise</span>
          </span>
          <span>
            <span>Make it Count</span>
          </span>
        </h1>
        <span className="hd-hero__card">
          <img src={heroCard} alt="Half Dozen live event system visual" />
        </span>
      </div>
      <div className="hd-hero__meta">
        <p>{eyebrow}</p>
        <div>
          <p>{description}</p>
          <div className="hd-socials" aria-label="Social links">
            <a href="https://www.linkedin.com" aria-label="LinkedIn">
              in
            </a>
            <a href="https://www.instagram.com" aria-label="Instagram">
              ◎
            </a>
            <a href="mailto:hello@halfdozen.co" aria-label="Email">
              ✉
            </a>
          </div>
        </div>
      </div>
      <span className="hd-hero__photo-frame">
        <img className="hd-hero__photo" src={eventPhoto} alt="DJ performing at a live event" />
      </span>
    </section>
  );
}

export function ClientsSection() {
  return (
    <section className="hd-section hd-clients" id="clients">
      <h2>Our Clients</h2>
      <div className="hd-client-cloud" aria-label="Client list">
        {clients.map((client, index) => (
          <span className="hd-client" key={client}>
            {client}
            <i className={`hd-client-chip hd-client-chip--${(index % 6) + 1}`} aria-hidden="true" />
          </span>
        ))}
      </div>
    </section>
  );
}

export function LogoTicker() {
  const tickerItems = ["Boots 'N Beats", 'Stereo Punks', 'Golden Era Rave', 'Laszewo', 'FanPad', 'Lightswitch'];
  return (
    <div className="hd-ticker" aria-label="Featured client logos">
      <div>
        {[...tickerItems, ...tickerItems, ...tickerItems].map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}

export function DetailsSection() {
  const featuredService = services[0];

  return (
    <section className="hd-section hd-details" id="details" aria-label="Half Dozen service layers">
      <article className="hd-service-card">
        <span>{featuredService.number}</span>
        <p>{featuredService.summary}</p>
        <h2>{featuredService.title}</h2>
      </article>
      <div className="hd-service-rail" aria-label="Service system">
        {services.map((service) => (
          <span key={service.number}>
            <strong>{service.number}</strong>
            {service.title}
          </span>
        ))}
      </div>
    </section>
  );
}

export function ContentCtaSection() {
  return (
    <section className="hd-section hd-content-cta" id="team">
      <div className="hd-keep-up">
        <div className="hd-section-title-row">
          <h2>Keep Up</h2>
          <a className="hd-pill-link" href="#work">
            View all <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="hd-feed-list">
          {keepUpItems.map((item, index) => (
            <a className="hd-feed-item" href="#contact" key={item.title}>
              <span className={`hd-feed-thumb hd-feed-thumb--${index + 1}`}>
                <img src={item.image} alt="" loading="lazy" aria-hidden="true" />
                <span>{item.type}</span>
              </span>
              <span className="hd-feed-copy">
                <small>{item.type}</small>
                <strong>{item.title}</strong>
                <em>{item.summary}</em>
              </span>
            </a>
          ))}
        </div>
      </div>
      <div className="hd-talk" id="contact">
        <div className="hd-talk__copy">
          <h2>Let's Talk</h2>
          <small>Looking to level up?</small>
          <p>
            Meet with our team to dive into your specific goals and challenges, discuss focused insights on how best to
            streamline your workflows, and create a path towards systemizing your operations.
          </p>
          <a className="hd-button" href="mailto:hello@halfdozen.co">
            Request consultation <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export function TestimonialSection({ testimonialPhoto = assetDefaults.testimonialPhoto }: HalfDozenAssetProps) {
  return (
    <section className="hd-section hd-testimonial">
      <img className="hd-testimonial__image" src={testimonialPhoto} alt="Crowd at a Stereo Punks live event" />
      <div className="hd-testimonial__copy">
        <div className="hd-testimonial__logos" aria-label="Testimonials">
          {testimonials.map((testimonial) => (
            <span key={testimonial.client}>{testimonial.client}</span>
          ))}
        </div>
        <blockquote>&ldquo;{testimonials[0].quote}&rdquo;</blockquote>
        <cite>
          <strong>{testimonials[0].name}</strong>
          <span>{testimonials[0].title}</span>
        </cite>
        <div className="hd-slider-dots" aria-hidden="true">
          <span />
          <span />
        </div>
      </div>
    </section>
  );
}

export function FooterSection() {
  return (
    <footer className="hd-footer">
      <HalfDozenLogo inverted />
      <div className="hd-footer__bottom">
        <nav aria-label="Footer navigation">
          {navItems.map((item) => (
            <a href={`#${item.toLowerCase()}`} key={item}>
              {item}
            </a>
          ))}
        </nav>
        <nav aria-label="Legal navigation">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
          <a href="#cookies">Cookie Settings</a>
        </nav>
        <a className="hd-footer__contact" href="#contact">
          Get in touch <span aria-hidden="true">→</span>
        </a>
        <p>&copy; 2026 Half Dozen. All rights reserved.</p>
      </div>
    </footer>
  );
}

export function HalfDozenLanding(props: HalfDozenAssetProps) {
  return (
    <main className="hd-page">
      <HeroSection {...props} />
      <ClientsSection />
      <LogoTicker />
      <DetailsSection />
      <ContentCtaSection />
      <TestimonialSection {...props} />
      <FooterSection />
    </main>
  );
}
