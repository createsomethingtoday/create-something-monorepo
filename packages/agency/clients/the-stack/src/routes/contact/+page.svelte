<script lang="ts">
  import { inview } from '$lib/actions/inview';
  import { enhance } from '$app/forms';

  let formState = $state<'idle' | 'submitting' | 'success' | 'error'>('idle');
</script>

<svelte:head>
  <title>Contact - The Stack Indoor Pickleball</title>
  <meta name="description" content="Get in touch with The Stack Indoor Pickleball. Book a court, join a class, or inquire about personalized coaching." />
</svelte:head>

<section class="section is-contact" use:inview>
  <div class="container-large">
    <div class="contact_wrap">
      <!-- Left: Form Content -->
      <div class="contact_content">
        <div class="margin-bottom-24">
          <h1 class="heading-style-h1">
            <span class="is-word is-1">Contact</span>
          </h1>
        </div>

        <div class="max-width-440">
          <p class="text-size-medium fade-in">
            Whether you want to book a court, join a class, or inquire about personalized
            coaching, fill out the form and we'll get back to you as soon as possible.
          </p>
        </div>

        <div class="margin-top-24">
          <ul class="list_wrap fade-in" style="animation-delay: 0.2s;">
            <li class="list_wrap-item">
              <a href="#" class="text-style-inlinelink">
                <span class="text-size-medium">Instagram</span>
              </a>
            </li>
            <li class="list_wrap-item">
              <a href="#" class="text-style-inlinelink">
                <span class="text-size-medium">LinkedIn</span>
              </a>
            </li>
            <li class="list_wrap-item">
              <a href="#" class="text-style-inlinelink">
                <span class="text-size-medium">TikTok</span>
              </a>
            </li>
          </ul>
        </div>

        <div class="margin-top-64">
          <div class="contact_form-block fade-in" style="animation-delay: 0.3s;">
            {#if formState === 'success'}
              <div class="form-success">
                <p>Thank you! Your submission has been received!</p>
              </div>
            {:else if formState === 'error'}
              <div class="form-error">
                <p>Oops! Something went wrong while submitting the form.</p>
              </div>
            {:else}
              <form
                method="POST"
                class="contact_form"
                use:enhance={() => {
                  formState = 'submitting';
                  return async ({ result }) => {
                    if (result.type === 'success') {
                      formState = 'success';
                    } else {
                      formState = 'error';
                    }
                  };
                }}
              >
                <div class="form-field-wrapper">
                  <label for="first_name" class="field-label">First Name</label>
                  <input
                    class="form-input"
                    type="text"
                    name="first_name"
                    id="first_name"
                    placeholder="First name"
                    required
                  />
                </div>

                <div class="form-field-wrapper">
                  <label for="last_name" class="field-label">Last Name</label>
                  <input
                    class="form-input"
                    type="text"
                    name="last_name"
                    id="last_name"
                    placeholder="Last Name"
                    required
                  />
                </div>

                <div class="form-field-wrapper is-full">
                  <label for="email" class="field-label">Email</label>
                  <input
                    class="form-input"
                    type="email"
                    name="email"
                    id="email"
                    placeholder="email@example.com"
                    required
                  />
                </div>

                <div class="form-field-wrapper is-full">
                  <label for="phone" class="field-label">Phone</label>
                  <input
                    class="form-input"
                    type="tel"
                    name="phone"
                    id="phone"
                    placeholder="Phone Number"
                    required
                  />
                </div>

                <div class="form-field-wrapper is-full">
                  <label for="message" class="field-label">Message</label>
                  <textarea
                    class="form-input is-text-area"
                    name="message"
                    id="message"
                    placeholder="Message"
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  class="button fade-in"
                  style="animation-delay: 0.5s;"
                  disabled={formState === 'submitting'}
                >
                  {formState === 'submitting' ? 'Please wait...' : 'Send Message'}
                </button>
              </form>
            {/if}
          </div>
        </div>
      </div>

      <!-- Right: Visual -->
      <div class="contact_visual">
        <div class="contact_img">
          <img
            src="/images/tennis-contact_1tennis-contact.avif"
            alt="Indoor pickleball court"
            loading="eager"
            class="img-cover"
          />
          <div class="contact_visual-mask"></div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .section.is-contact {
    padding-top: 10rem;
    padding-bottom: 6rem;
    background-color: var(--black);
    min-height: 100vh;
  }

  .container-large {
    max-width: 82rem;
    margin-left: auto;
    margin-right: auto;
    padding-left: 2rem;
    padding-right: 2rem;
  }

  .contact_wrap {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    align-items: start;
  }

  .contact_content {
    padding-right: 2rem;
  }

  .margin-bottom-24 {
    margin-bottom: 1.5rem;
  }

  .margin-top-24 {
    margin-top: 1.5rem;
  }

  .margin-top-64 {
    margin-top: 4rem;
  }

  .max-width-440 {
    max-width: 27.5rem;
  }

  .heading-style-h1 {
    font-family: var(--font-coolvetica);
    font-size: clamp(4rem, 10vw, 11.25rem);
    line-height: 0.95;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    color: var(--white);
    margin: 0;
  }

  .heading-style-h1 .is-word {
    display: inline-block;
    opacity: 0;
    transform: translateY(0.5em);
    animation: wordReveal 0.8s var(--ease-stack) forwards;
  }

  @keyframes wordReveal {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .text-size-medium {
    font-family: var(--font-satoshi);
    font-size: 1.125rem;
    line-height: 1.6;
    color: var(--light-grey);
    margin: 0;
  }

  .fade-in {
    opacity: 0;
    transform: translateY(0.5em);
    animation: fadeUp 0.8s var(--ease-stack) forwards;
    animation-delay: 0.1s;
  }

  @keyframes fadeUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Social Links */
  .list_wrap {
    display: flex;
    gap: 1.5rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .list_wrap-item {
    display: inline-block;
  }

  .text-style-inlinelink {
    color: var(--white);
    text-decoration: none;
    position: relative;
  }

  .text-style-inlinelink::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 100%;
    height: 1px;
    background-color: var(--white);
    transform: scaleX(0);
    transform-origin: right;
    transition: transform 0.3s var(--ease-stack);
  }

  .text-style-inlinelink:hover::after {
    transform: scaleX(1);
    transform-origin: left;
  }

  .text-style-inlinelink .text-size-medium {
    color: var(--white);
  }

  /* Form */
  .contact_form-block {
    width: 100%;
  }

  .contact_form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .form-field-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-field-wrapper.is-full {
    grid-column: span 2;
  }

  .field-label {
    font-family: var(--font-satoshi);
    font-size: 0.875rem;
    color: var(--light-grey);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .form-input {
    font-family: var(--font-satoshi);
    font-size: 1rem;
    color: var(--white);
    background-color: transparent;
    border: 1px solid var(--green);
    border-radius: var(--input-radius);
    padding: 1rem 1.5rem;
    outline: none;
    transition: border-color 0.3s var(--ease-stack), box-shadow 0.3s var(--ease-stack);
  }

  .form-input::placeholder {
    color: var(--dark-grey);
  }

  .form-input:focus {
    border-color: var(--white);
    box-shadow: 0 0 0 1px var(--white);
  }

  .form-input.is-text-area {
    min-height: 10rem;
    resize: vertical;
  }

  .button {
    grid-column: span 2;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-family: var(--font-satoshi);
    font-size: 1rem;
    font-weight: 500;
    color: var(--black);
    background-color: var(--white);
    border: none;
    border-radius: var(--button-radius);
    padding: 1rem 2rem;
    cursor: pointer;
    transition: transform 0.3s var(--ease-stack), background-color 0.3s var(--ease-stack);
    width: fit-content;
    margin-top: 1rem;
  }

  .button:hover {
    transform: scale(1.02);
  }

  .button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* Form States */
  .form-success,
  .form-error {
    padding: 2rem;
    border-radius: var(--hero-video-radius);
    text-align: center;
  }

  .form-success {
    background-color: rgba(150, 110, 68, 0.2);
    border: 1px solid var(--green);
  }

  .form-error {
    background-color: rgba(255, 68, 68, 0.2);
    border: 1px solid #f44;
  }

  .form-success p,
  .form-error p {
    font-family: var(--font-satoshi);
    font-size: 1.125rem;
    color: var(--white);
    margin: 0;
  }

  /* Visual */
  .contact_visual {
    position: sticky;
    top: 6rem;
  }

  .contact_img {
    position: relative;
    border-radius: var(--hero-video-radius);
    overflow: hidden;
    aspect-ratio: 3 / 4;
  }

  .contact_img .img-cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .contact_visual-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--black);
    transform: translateX(-100%);
    animation: maskReveal 1s var(--ease-stack) 0.3s forwards;
  }

  @keyframes maskReveal {
    to {
      transform: translateX(100%);
    }
  }

  /* Responsive */
  @media (max-width: 991px) {
    .section.is-contact {
      padding-top: 8rem;
    }

    .contact_wrap {
      grid-template-columns: 1fr;
      gap: 3rem;
    }

    .contact_content {
      padding-right: 0;
    }

    .contact_visual {
      position: relative;
      top: 0;
      order: -1;
    }

    .contact_img {
      aspect-ratio: 16 / 9;
    }
  }

  @media (max-width: 767px) {
    .contact_form {
      grid-template-columns: 1fr;
    }

    .form-field-wrapper.is-full {
      grid-column: span 1;
    }

    .button {
      grid-column: span 1;
      width: 100%;
    }
  }

  @media (max-width: 479px) {
    .section.is-contact {
      padding-top: 6rem;
      padding-bottom: 4rem;
    }

    .list_wrap {
      flex-direction: column;
      gap: 0.75rem;
    }
  }
</style>
