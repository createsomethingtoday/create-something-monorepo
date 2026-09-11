<script lang="ts">
  let { onContactClick }: { onContactClick: () => void } = $props();
  const links = [
    ['Oil & Gas', '/oil-gas'],
    ['Mining', '/mining'],
    ['About', '/about'],
    ['News', '/news'],
    ['Careers', 'https://jobs.lever.co/maverickx']
  ];
</script>

<section class="contact-cta">
  <h2>Put Biology to Work</h2>
  <p>Tell us about your operation. We'll put our chemistry to work on it.</p>
  <button type="button" onclick={onContactClick}>Contact Us</button>
</section>
<footer>
  <div>
    <a href="/" aria-label="Maverick X home"
      ><img src="/images/full-logo.svg" alt="Maverick X" width="105" height="31" /></a
    >
    <p>Revitalizing critical resource extraction with precision biologics.</p>
  </div>
  <nav aria-label="Footer navigation">
    <span>Company</span>{#each links as [label, href]}<a {href}>{label}</a>{/each}<a href="/privacy"
      >Privacy Policy</a
    ><a href="/terms">Terms of Service</a>
  </nav>
  <div class="contact-details">
    <span>Get in Touch</span>
    <address>444 E. St. Elmo Rd, Bldg. B<br />Austin, TX 78745</address>
    <a href="mailto:info@maverickx.com">info@maverickx.com</a>
  </div>
  <div class="social">
    <div>
      <a href="https://x.com/maverickx" target="_blank" rel="noopener noreferrer">X</a><a
        href="https://www.linkedin.com/company/maverickx"
        target="_blank"
        rel="noopener noreferrer">LinkedIn</a
      >
    </div>
    <p>Backed by Chord Energy, Y Combinator,<br />and other leading organizations</p>
  </div>
</footer>

<style>
  .contact-cta {
    padding: 140px 48px;
    text-align: center;
    border-bottom: 1px solid #ffffff20;
  }
  h2 {
    margin: 0 0 16px;
    font:
      600 clamp(40px, 5vw, 72px)/1 'Barlow Condensed',
      sans-serif;
    text-transform: uppercase;
  }
  .contact-cta p {
    margin: 0 0 36px;
    color: #ffffffb3;
    font-size: 17px;
  }
  button {
    padding: 18px 44px;
    background: white;
    color: black;
    font:
      600 13px 'Barlow',
      sans-serif;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    cursor: pointer;
    border: 0;
  }
  footer {
    padding: 56px 48px;
    display: flex;
    justify-content: space-between;
    align-items: start;
    flex-wrap: wrap;
    gap: 32px;
  }
  img {
    display: block;
    object-fit: contain;
  }
  footer p {
    max-width: 280px;
    font-size: 13px;
    line-height: 1.6;
    color: #ffffffa6;
  }
  nav,
  .contact-details {
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 12px;
  }
  nav,
  footer span,
  .social {
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  footer span {
    color: #ffffffa6;
  }
  address {
    font:
      normal 13px/1.6 'Barlow',
      sans-serif;
  }
  .social {
    text-align: right;
    font-size: 12px;
  }
  .social a + a {
    margin-left: 20px;
  }
  .social p {
    font-size: 11px;
    line-height: 1.8;
  }
  a {
    color: #fff;
    text-decoration: none;
  }
  @media (max-width: 600px) {
    .contact-cta {
      padding: 80px 24px;
    }
    footer {
      padding: 48px 24px;
      display: grid;
      grid-template-columns: 1fr;
    }
    .social {
      text-align: left;
    }
  }
</style>
