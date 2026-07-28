<footer class="abundance-footer">
  <div class="footer-shell">
    <div class="footer-topline">
      <a class="footer-brand" href="/" aria-label="Abundance Staffing home">
        <span class="footer-mark">A</span>
        <span>
          <strong>Abundance</strong>
          <small>Staffing</small>
        </span>
      </a>
      <span class="footer-status"><i aria-hidden="true"></i> Guided applications are open</span>
    </div>

    <div class="footer-main">
      <div class="footer-statement">
        <span>Staffing, with the handoff clear.</span>
        <h2>Better-fit work.<br />Recruiter-led decisions.</h2>
        <a href="/apply">Start an application <span aria-hidden="true">↗</span></a>
      </div>

      <div class="footer-links" aria-label="Footer navigation">
        <div>
          <strong>For people</strong>
          <a href="/nurses">Nurses</a>
          <a href="/jobs">Open roles</a>
          <a href="/apply">Start an application</a>
        </div>
        <div>
          <strong>For teams</strong>
          <a href="/facilities">Request coverage</a>
          <a href="/agents">Agent system</a>
          <a href="/facilities">Facility support</a>
        </div>
        <div>
          <strong>Trust</strong>
          <span>Recruiter review</span>
          <span>Secure verification</span>
          <span>Read-only public jobs</span>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <span>© 2026 Abundance Staffing</span>
      <span>Nurse applications · Facility coverage · Recruiter review</span>
    </div>
  </div>
</footer>

<style>
  .abundance-footer {
    --footer-ink: #020202;
    --footer-aqua: #af7c54;
    --footer-status: #1d6f8a;
    display: block;
    overflow: hidden;
    background:
      radial-gradient(circle at 85% 12%, rgba(175, 124, 84, 0.12), transparent 24%),
      var(--footer-ink);
    color: white;
  }

  .footer-shell {
    width: min(calc(100% - 64px), 1380px);
    margin-inline: auto;
    padding: 36px 0 28px;
  }

  .footer-topline,
  .footer-main,
  .footer-bottom {
    display: flex;
    justify-content: space-between;
    gap: 28px;
  }

  .footer-topline {
    align-items: center;
    padding-bottom: 32px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }

  .footer-brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    color: white;
    text-decoration: none;
  }

  .footer-mark {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border-radius: 999px;
    background: white;
    color: var(--footer-ink);
    font-size: 1rem;
  }

  .footer-brand > span:last-child {
    display: grid;
    gap: 2px;
  }

  .footer-brand strong {
    font-size: 0.94rem;
    font-weight: 620;
    line-height: 1;
  }

  .footer-brand small {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.58rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .footer-status {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: rgba(255, 255, 255, 0.58);
    font-size: 0.78rem;
  }

  .footer-status i {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--footer-status);
    box-shadow: 0 0 0 5px rgba(29, 111, 138, 0.12);
  }

  .footer-main {
    align-items: flex-start;
    padding: clamp(72px, 8vw, 118px) 0;
  }

  .footer-statement {
    display: grid;
    gap: 22px;
    max-width: 650px;
  }

  .footer-statement > span,
  .footer-links strong {
    color: var(--footer-aqua);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.68rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .footer-statement h2 {
    margin: 0;
    font-size: clamp(2.7rem, 4.5vw, 5rem);
    font-weight: 500;
    letter-spacing: -0.055em;
    line-height: 0.98;
  }

  .footer-statement a {
    display: inline-flex;
    justify-content: space-between;
    gap: 24px;
    width: fit-content;
    min-width: 240px;
    padding: 17px 20px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    color: white;
    text-decoration: none;
    transition:
      background 160ms ease,
      transform 160ms ease;
  }

  .footer-statement a:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.1);
  }

  .footer-links {
    display: grid;
    grid-template-columns: repeat(3, minmax(130px, 1fr));
    gap: clamp(30px, 5vw, 72px);
    min-width: min(100%, 550px);
  }

  .footer-links > div {
    display: grid;
    align-content: start;
    gap: 14px;
  }

  .footer-links strong {
    margin-bottom: 8px;
  }

  .footer-links a,
  .footer-links span {
    color: rgba(255, 255, 255, 0.58);
    font-size: 0.88rem;
    line-height: 1.4;
    text-decoration: none;
  }

  .footer-links a:hover {
    color: white;
  }

  .footer-bottom {
    align-items: center;
    padding-top: 26px;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.42);
    font-size: 0.72rem;
  }

  @media (max-width: 900px) {
    .footer-shell {
      width: min(calc(100% - 36px), 760px);
    }

    .footer-main {
      display: grid;
      gap: 72px;
    }

    .footer-links {
      width: 100%;
      min-width: 0;
    }
  }

  @media (max-width: 620px) {
    .footer-shell {
      width: min(calc(100% - 28px), 540px);
    }

    .footer-topline,
    .footer-bottom {
      align-items: flex-start;
      flex-direction: column;
    }

    .footer-main {
      padding: 72px 0;
    }

    .footer-links {
      grid-template-columns: 1fr 1fr;
    }

    .footer-links > div:last-child {
      grid-column: 1 / -1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .footer-statement a {
      transition: none;
    }
  }
</style>
