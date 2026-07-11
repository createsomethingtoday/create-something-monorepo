import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  assetDefaults,
  clientRows,
  clientShapeByName,
  keepUpItems,
  navItems,
  services,
  testimonials,
  tickerLogos
} from './content';

export type HalfDozenAssetProps = Partial<typeof assetDefaults> & {
  assetBaseUrl?: string;
};

export type HeroProps = HalfDozenAssetProps & {
  eyebrow?: string;
  description?: string;
};

function resolveAsset(path: string, assetBaseUrl = '') {
  if (!assetBaseUrl || /^(?:https?:|data:|blob:)/.test(path)) return path;
  return `${assetBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function useViewportVideo(restartOnEnter = false, threshold = 0.05) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.defaultMuted = true;
    video.muted = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const initialRect = video.getBoundingClientRect();
    const initiallyVisibleHeight = Math.max(
      0,
      Math.min(initialRect.bottom, window.innerHeight) - Math.max(initialRect.top, 0)
    );
    let isIntersecting = initiallyVisibleHeight / Math.max(initialRect.height, 1) >= threshold;

    let playAttempt: Promise<void> | null = null;

    const syncPlayback = () => {
      const shouldPlay = !reduceMotion.matches && isIntersecting && document.visibilityState === 'visible';

      if (reduceMotion.matches && video.readyState > 0) video.currentTime = 0;
      if (restartOnEnter && !isIntersecting && video.readyState > 0 && video.currentTime !== 0) video.currentTime = 0;
      if (shouldPlay && video.paused && !playAttempt) {
        playAttempt = video
          .play()
          .then(() => video.removeAttribute('data-playback-blocked'))
          .catch(() => video.setAttribute('data-playback-blocked', 'true'))
          .finally(() => {
            playAttempt = null;
          });
      } else if (!shouldPlay && !video.paused) {
        video.pause();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextIntersecting = (entry?.intersectionRatio ?? 0) >= threshold;
        if (restartOnEnter && nextIntersecting && !isIntersecting && video.readyState > 0) video.currentTime = 0;
        isIntersecting = nextIntersecting;
        syncPlayback();
      },
      { threshold }
    );

    observer.observe(video);
    document.addEventListener('visibilitychange', syncPlayback);
    document.addEventListener('pointerdown', syncPlayback, { passive: true });
    document.addEventListener('touchstart', syncPlayback, { passive: true });
    reduceMotion.addEventListener('change', syncPlayback);
    video.addEventListener('loadeddata', syncPlayback);
    video.addEventListener('canplay', syncPlayback);
    window.addEventListener('focus', syncPlayback);
    window.addEventListener('pageshow', syncPlayback);
    syncPlayback();

    return () => {
      observer.disconnect();
      video.pause();
      document.removeEventListener('visibilitychange', syncPlayback);
      document.removeEventListener('pointerdown', syncPlayback);
      document.removeEventListener('touchstart', syncPlayback);
      reduceMotion.removeEventListener('change', syncPlayback);
      video.removeEventListener('loadeddata', syncPlayback);
      video.removeEventListener('canplay', syncPlayback);
      window.removeEventListener('focus', syncPlayback);
      window.removeEventListener('pageshow', syncPlayback);
    };
  }, [restartOnEnter, threshold]);

  return videoRef;
}

function useRevealOnView(threshold = 0.2) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { elementRef, isVisible };
}

function useAutoplayIndex(length: number, intervalMs: number, isPaused: boolean) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let interval: number | null = null;

    const sync = () => {
      if (interval !== null) window.clearInterval(interval);
      interval = null;
      if (reduceMotion.matches || isPaused || document.visibilityState !== 'visible') return;
      interval = window.setInterval(() => {
        setActiveIndex((current) => (current + 1) % length);
      }, intervalMs);
    };

    reduceMotion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    sync();

    return () => {
      if (interval !== null) window.clearInterval(interval);
      reduceMotion.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [intervalMs, isPaused, length]);

  return [activeIndex, setActiveIndex] as const;
}

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
          <a href={item.href} key={item.label}>
            {item.label}
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
  heroMotion = assetDefaults.heroMotion,
  heroMotionPoster = assetDefaults.heroMotionPoster,
  assetBaseUrl,
  eyebrow = 'A system is an interconnected set of elements that is coherently organized in a way that achieves something.',
  description = 'Half Dozen is a strategic solutions partner helping teams in live events build better systems and do more with less.'
}: HeroProps) {
  const videoRef = useViewportVideo();

  return (
    <section className="hd-section hd-hero" id="work">
      <HalfDozenHeader />
      <div className="hd-hero__headline">
        <h1 className="hd-hero__title">
          <span>
            <span>Cut the Noise</span>
          </span>
          <span>
            <span>Make it Count</span>
          </span>
        </h1>
        <span className="hd-hero__motion" aria-hidden="true">
          <video
            className="hd-hero__motion-video"
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            controls={false}
            disablePictureInPicture
            preload="auto"
            poster={resolveAsset(heroMotionPoster, assetBaseUrl)}
          >
            <source src={resolveAsset(heroMotion, assetBaseUrl)} type="video/mp4" />
          </video>
        </span>
      </div>
      <div className="hd-hero__meta">
        <p>{eyebrow}</p>
        <div>
          <p>{description}</p>
          <div className="hd-socials" aria-label="Social links">
            <a href="https://www.linkedin.com/company/halfdozen" aria-label="LinkedIn">
              in
            </a>
            <a href="https://www.instagram.com/halfdozensolutions/" aria-label="Instagram">
              ◎
            </a>
            <a href="mailto:info@halfdozen.co" aria-label="Email">
              ✉
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ClientsSection({
  heroFullbleedMotion = assetDefaults.heroFullbleedMotion,
  heroFullbleedPoster = assetDefaults.heroFullbleedPoster,
  assetBaseUrl
}: HalfDozenAssetProps) {
  const videoRef = useViewportVideo(true, 0.25);

  return (
    <section className="hd-section hd-clients" id="clients">
      <span className="hd-clients__motion" aria-hidden="true">
        <video
          className="hd-clients__motion-video"
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          controls={false}
          disablePictureInPicture
          preload="metadata"
          poster={resolveAsset(heroFullbleedPoster, assetBaseUrl)}
        >
          <source src={resolveAsset(heroFullbleedMotion, assetBaseUrl)} type="video/mp4" />
        </video>
      </span>
      <h2>Our Clients</h2>
      <div className="hd-client-cloud" aria-label="Client list">
        {clientRows.map((row, rowIndex) => (
          <span className="hd-client-row" key={`row-${rowIndex}`}>
            {row.map((client) => (
              <span className="hd-client" key={client}>
                {client}
                <img
                  className="hd-client-chip"
                  src={resolveAsset(clientShapeByName[client], assetBaseUrl)}
                  alt=""
                  aria-hidden="true"
                />
              </span>
            ))}
          </span>
        ))}
      </div>
    </section>
  );
}

export function LogoTicker({ assetBaseUrl }: HalfDozenAssetProps) {
  return (
    <div className="hd-ticker" aria-label="Featured client logos">
      <div>
        {[...tickerLogos, ...tickerLogos, ...tickerLogos].map((item, index) => (
          <span key={`${item.name}-${index}`}>
            <img
              src={resolveAsset(item.image, assetBaseUrl)}
              alt={index < tickerLogos.length ? item.name : ''}
              style={{ '--logo-ratio': item.ratio } as CSSProperties}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

export function DetailsSection({ assetBaseUrl }: HalfDozenAssetProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useAutoplayIndex(services.length, 1500, isPaused);
  const activeService = services[activeIndex];

  return (
    <section
      className="hd-section hd-details"
      id="details"
      aria-label="Half Dozen service layers"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
      }}
    >
      <article className="hd-service-card" key={activeService.number}>
        <span>{activeService.number}</span>
        <p>{activeService.summary}</p>
        <img
          className="hd-service-artwork"
          src={resolveAsset(activeService.artwork, assetBaseUrl)}
          alt=""
          aria-hidden="true"
          style={{ '--service-rotation': `${activeService.rotation}deg` } as CSSProperties}
        />
        <h2>{activeService.title}</h2>
      </article>
      <div className="hd-service-rail" aria-label="Service system">
        {services.map((service, index) => (
          <button
            className={index === activeIndex ? 'is-active' : ''}
            key={service.number}
            type="button"
            data-service-number={service.number}
            aria-pressed={index === activeIndex}
            onClick={() => setActiveIndex(index)}
          >
            <strong>{service.number}</strong>
            {service.title}
          </button>
        ))}
      </div>
    </section>
  );
}

export function ContentCtaSection({ assetBaseUrl }: HalfDozenAssetProps) {
  const { elementRef, isVisible } = useRevealOnView();

  return (
    <section className="hd-section hd-content-cta" id="updates">
      <div className="hd-keep-up">
        <div className="hd-section-title-row">
          <h2>Keep Up</h2>
          <a className="hd-pill-link" href="https://www.halfdozen.co/community">
            View all <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="hd-feed-list">
          {keepUpItems.map((item, index) => (
            <article className="hd-feed-item" key={item.title}>
              <span className={`hd-feed-thumb hd-feed-thumb--${index + 1}`}>
                <img src={resolveAsset(item.image, assetBaseUrl)} alt="" loading="lazy" aria-hidden="true" />
                <span>{item.type}</span>
              </span>
              <span className="hd-feed-copy">
                <small>{item.type}</small>
                <strong>{item.title}</strong>
                <em>{item.summary}</em>
              </span>
            </article>
          ))}
        </div>
      </div>
      <div className={`hd-talk ${isVisible ? 'is-visible' : ''}`} id="contact" ref={elementRef}>
        <img
          className="hd-talk__mark"
          src={resolveAsset('/assets/brand/cta-mark.png', assetBaseUrl)}
          alt=""
          aria-hidden="true"
        />
        <div className="hd-talk__copy">
          <h2>Let's Talk</h2>
          <small>Looking to level up?</small>
          <p>
            Meet with our team to dive into your specific goals and challenges, discuss focused insights on how best to
            streamline your workflows, and create a path towards systemizing your operations.
          </p>
          <a className="hd-button" href="mailto:info@halfdozen.co?subject=Half%20Dozen%20consultation">
            Request consultation <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export function TestimonialSection({
  testimonialPhoto = assetDefaults.testimonialPhoto,
  assetBaseUrl
}: HalfDozenAssetProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useAutoplayIndex(testimonials.length, 6500, isPaused);
  const activeTestimonial = testimonials[activeIndex];

  return (
    <section
      className="hd-section hd-testimonial"
      id="testimonials"
      style={{ '--testimonial-bg': activeTestimonial.background } as CSSProperties}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
      }}
    >
      <img
        className="hd-testimonial__image"
        src={resolveAsset(activeIndex === 0 ? testimonialPhoto : activeTestimonial.image, assetBaseUrl)}
        alt={`${activeTestimonial.client} live event`}
      />
      <div className="hd-testimonial__copy" key={activeTestimonial.client}>
        <div className="hd-testimonial__logos" aria-label="Testimonials">
          {testimonials.map((testimonial, index) => (
            <button
              type="button"
              data-testimonial-client={testimonial.client}
              className={index === activeIndex ? 'is-active' : ''}
              key={testimonial.client}
              aria-label={`Show ${testimonial.client} testimonial`}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
            >
              <img src={resolveAsset(testimonial.logo, assetBaseUrl)} alt={testimonial.client} />
            </button>
          ))}
        </div>
        <blockquote className={activeTestimonial.quote.length > 360 ? 'is-long' : ''}>
          &ldquo;{activeTestimonial.quote}&rdquo;
        </blockquote>
        <cite>
          <strong>{activeTestimonial.name}</strong>
          <span>{activeTestimonial.title}</span>
        </cite>
        <div
          className="hd-slider-dots"
          role="progressbar"
          aria-label="Testimonial position"
          aria-valuemin={1}
          aria-valuemax={testimonials.length}
          aria-valuenow={activeIndex + 1}
        >
          <span style={{ width: `${((activeIndex + 1) / testimonials.length) * 100}%` }} />
        </div>
      </div>
    </section>
  );
}

export function FooterSection({ assetBaseUrl }: HalfDozenAssetProps) {
  return (
    <footer className="hd-footer">
      <div className="hd-footer__brand">
        <img
          className="hd-footer__mark"
          src={resolveAsset('/assets/brand/footer-mark.png', assetBaseUrl)}
          alt=""
          aria-hidden="true"
        />
        <span>Half Dozen</span>
      </div>
      <div className="hd-footer__bottom">
        <nav aria-label="Footer navigation">
          {navItems.map((item) => (
            <a href={item.href} key={item.label}>
              {item.label}
            </a>
          ))}
        </nav>
        <nav aria-label="Legal navigation">
          <a href="https://www.halfdozen.co/privacy-policy">Privacy Policy</a>
          <a href="https://www.halfdozen.co/terms-of-service">Terms of Service</a>
          <a href="https://www.halfdozen.co/cookie-settings">Cookie Settings</a>
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
      <ClientsSection {...props} />
      <LogoTicker {...props} />
      <DetailsSection {...props} />
      <ContentCtaSection {...props} />
      <TestimonialSection {...props} />
      <FooterSection {...props} />
    </main>
  );
}
