<footer class="footer-wrapper abundance-footer">
  <section class="footer container-full">
    <div class="container-fluid">
      <div class="footer-content">
        <div class="footer-wrap">
          <div class="footer-left">
            <div class="footer-left-head">
              <div class="abundance-footer-brand">
                <span>A</span>
                <strong>Abundance Staffing</strong>
              </div>
              <h2 class="footer-left-title heading-03">Abundance Staffing</h2>
              <p class="footer-left-text p2-regular">
                Nurse staffing support for applications, facility coverage, public jobs, and
                recruiter-reviewed placements.
              </p>
              <div class="footer-left-btns">
                <a href="/apply" class="abundance-footer-action">Start application</a>
              </div>
            </div>
          </div>
          <div class="footer-right-wrap">
            <div class="footer-right">
              <div class="footer-body">
                <div class="title-small">Paths</div>
                <div class="footer-body-links">
                  <div class="footer-link-wrap"><a href="/nurses" class="footer-link">Nurses</a></div>
                  <div class="footer-link-wrap"><a href="/jobs" class="footer-link">Jobs</a></div>
                  <div class="footer-link-wrap"><a href="/facilities" class="footer-link">Facilities</a></div>
                  <div class="footer-link-wrap"><a href="/agents" class="footer-link">Agents</a></div>
                </div>
              </div>
              <div class="footer-body">
                <div class="title-small">Start</div>
                <div class="footer-body-links">
                  <div class="footer-link-wrap"><a href="/apply" class="footer-link">Apply now</a></div>
                  <div class="footer-link-wrap"><a href="/facilities" class="footer-link">Request coverage</a></div>
                  <div class="footer-link-wrap"><a href="/jobs" class="footer-link">Browse jobs</a></div>
                </div>
              </div>
              <div class="footer-body abundance-footer-trust">
                <div class="title-small">Trust</div>
                <div class="footer-body-links">
                  <span>Recruiters review staffing moves.</span>
                  <span>Verification protects private steps.</span>
                  <span>Public jobs stay read-only.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <div class="footer-copyright-wrap">
            <div class="footer-copyright-text">(c) 2026 Abundance Staffing.</div>
            <div class="abundance-footer-bottom-links">
              <a href="/agents">Agent system</a>
              <a href="/apply">Start</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</footer>

<style>
  .abundance-footer {
    display: block;
    background: #0b0b0a;
  }

  .abundance-footer .footer.container-full {
    padding-top: 46px;
    padding-bottom: 46px;
    background:
      radial-gradient(circle at 18% 10%, rgba(175, 124, 84, 0.18), transparent 28%),
      #0b0b0a;
  }

  .abundance-footer .footer-wrap {
    display: grid;
    grid-template-columns: minmax(280px, 0.85fr) minmax(0, 1.45fr);
    gap: clamp(32px, 6vw, 86px);
    align-items: stretch;
    max-width: 1320px;
    padding-bottom: 54px;
  }

  .abundance-footer .footer-left {
    max-width: none;
    min-height: 320px;
    padding: 34px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
      rgba(255, 255, 255, 0.04);
  }

  .abundance-footer .footer-left-head {
    display: grid;
    gap: 22px;
  }

  .abundance-footer-brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    color: var(--white);
  }

  .abundance-footer-brand span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 999px;
    background: var(--white);
    color: var(--black);
    font-size: 18px;
  }

  .abundance-footer-brand strong {
    font-size: 17px;
    font-weight: 500;
  }

  .abundance-footer .footer-left-title {
    max-width: 280px;
    margin: 0;
    color: var(--white);
  }

  .abundance-footer .footer-left-text {
    max-width: 310px;
    margin: 0;
    color: rgba(255, 255, 255, 0.62);
  }

  .abundance-footer-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 54px;
    width: 100%;
    max-width: 280px;
    padding: 0 22px;
    border-radius: 999px;
    background: var(--secondary);
    color: var(--white);
    font-size: 16px;
    line-height: 1;
    text-decoration: none;
  }

  .abundance-footer .footer-right-wrap {
    max-width: none;
    justify-content: stretch;
  }

  .abundance-footer .footer-right {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    max-width: none;
    height: 100%;
  }

  .abundance-footer .footer-body {
    display: grid;
    align-content: start;
    gap: 22px;
    min-height: 260px;
    padding: 30px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.025);
  }

  .abundance-footer .title-small {
    color: rgba(255, 255, 255, 0.92);
    font-size: 18px;
  }

  .abundance-footer .footer-body-links {
    display: grid;
    grid-template-columns: 1fr;
    grid-auto-flow: row;
    gap: 16px;
    max-width: none;
  }

  .abundance-footer .footer-link-wrap {
    display: block;
    min-width: 0;
  }

  .abundance-footer .footer-link,
  .abundance-footer-trust span,
  .abundance-footer-bottom-links a {
    display: block;
    color: rgba(255, 255, 255, 0.62);
    font-size: 15px;
    line-height: 1.35;
    text-decoration: none;
    overflow-wrap: anywhere;
  }

  .abundance-footer .footer-link:hover,
  .abundance-footer-bottom-links a:hover {
    color: var(--white);
  }

  .abundance-footer-trust span {
    display: block;
    padding-left: 14px;
    border-left: 2px solid rgba(175, 124, 84, 0.55);
  }

  .abundance-footer .footer-bottom {
    padding-top: 28px;
    padding-bottom: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .abundance-footer .footer-copyright-wrap {
    display: flex;
    justify-content: space-between;
    gap: 18px;
  }

  .abundance-footer .footer-copyright-text {
    color: rgba(255, 255, 255, 0.58);
    font-size: 14px;
  }

  .abundance-footer-bottom-links {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  @media (max-width: 991px) {
    .abundance-footer .footer-wrap,
    .abundance-footer .footer-right {
      grid-template-columns: 1fr;
    }

    .abundance-footer .footer-left,
    .abundance-footer .footer-body {
      min-height: auto;
    }

    .abundance-footer .footer-copyright-wrap {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
