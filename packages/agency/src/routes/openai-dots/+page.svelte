<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { dotsAnswer, dotsFaqItems as faqItems } from '$lib/data/openaiDots';
  import { enhanceDotsGuide } from '$lib/motion/openaiDots';
  import '$lib/styles/openai-dots.css';
</script>

<SEO
  title="OpenAI dots: A little more room with Canon | CREATE SOMETHING .agency"
  description="What are OpenAI dots? Meet Canon, our personal dot, and follow an illustrative task through context, creation, permissions, and human review."
  canonical="https://createsomething.agency/openai-dots"
  ogImage="/images/agency-sales/canon-guide-test-v1.webp"
  keywords="OpenAI dots, personal AI agent, Canon, dot permissions, workflow mapping"
  propertyName="agency"
  {faqItems}
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.agency' },
    { name: 'Workflow Guides', url: 'https://createsomething.agency/workflows' },
    { name: 'OpenAI dots', url: 'https://createsomething.agency/openai-dots' }
  ]}
/>

<div class="openai-dots" use:enhanceDotsGuide data-scroll-entrance-skip>
  <div class="page-shell">
    <nav class="guide-breadcrumb mono" aria-label="Breadcrumb">
      <a href="/workflows">Workflow Guides</a><span aria-hidden="true">/</span><span
        aria-current="page">OpenAI dots</span
      >
    </nav>

    <section class="hero" id="intro" tabindex="-1" aria-labelledby="hero-title">
      <div class="eyebrow hero-eyebrow">
        <span class="tiny-dot" aria-hidden="true"></span> A field guide to OpenAI dots
        <span class="edition">No. 01 / Canon</span>
      </div>
      <div class="hero-grid">
        <div class="hero-copy">
          <h1 id="hero-title">
            A little<br /><span class="hero-last-line"
              >more room<span class="title-period">.</span></span
            >
          </h1>
          <p class="hero-description">
            For the thinking. The making.<br />The things you keep meaning to do.
          </p>
          <p class="hero-context">
            Meet Canon, our personal OpenAI dot. A personal agent that carries context forward and
            helps move work along between conversations.
          </p>
          <a class="action" href="#with-canon"
            >Spend a day with Canon <span aria-hidden="true">↘</span></a
          >
        </div>
        <figure class="canon-portrait" aria-labelledby="portrait-caption">
          <div class="portrait-register mono">
            <span>Meet your collaborator</span><span aria-hidden="true">[ 01 ]</span>
          </div>
          <div class="portrait-field">
            <svg class="portrait-guides" viewBox="0 0 540 480" fill="none" aria-hidden="true">
              <circle cx="270" cy="235" r="178" />
              <path d="M40 235H500M270 25V445" stroke-dasharray="3 8" />
              <path class="hero-arc" d="M92 235a178 178 0 1 1 356 0" />
              <path d="M40 36h18M49 27v18M482 427h18M491 418v18" />
            </svg>
            <span class="portrait-note mono">A familiar face.<br />A useful pair of hands.</span>
            <img
              class="canon-hero"
              src="/images/agency-sales/canon-guide-cutout-v1.webp"
              alt="Canon, a small graphite robot, attentively pointing toward the next step."
              width="307"
              height="384"
              fetchpriority="high"
            />
            <span class="portrait-name"
              >canon<span class="name-dot" aria-hidden="true">●</span></span
            >
            <span class="portrait-spec mono">Curious by nature.<br />Capable by design.</span>
          </div>
          <figcaption id="portrait-caption">
            <span>Our dot, with a character of its own.</span><span class="mono"
              >Concept illustration</span
            >
          </figcaption>
        </figure>
      </div>
      <a class="reading-rail mono" href="#why"
        ><span>Less starting over. More moving forward.</span><span
          >Keep exploring <span aria-hidden="true">↓</span></span
        ></a
      >
    </section>

    <section class="possibilities chapter" id="why" tabindex="-1" aria-labelledby="why-title">
      <div class="section-register mono">
        <span>01 / The possibilities</span><span>What a dot makes room for</span>
      </div>
      <div class="section-intro">
        <h2 id="why-title">Good company.<br />Useful continuity.</h2>
        <p>Some work needs a conversation.<br />Some needs someone to keep the thread.</p>
      </div>
      <div class="definition" aria-labelledby="definition-title">
        <h3 id="definition-title">What are OpenAI dots?</h3>
        <p>{dotsAnswer}</p>
        <p>
          Canon is our personal OpenAI dot. This independently authored guide uses an illustrative
          task to explain the possibilities and the decisions that stay with you.
        </p>
      </div>

      <div class="benefit-list">
        <article class="benefit">
          <span class="benefit-number mono">01.1</span>
          <h3>A little less<br />catching up.</h3>
          <p>
            Your dot can build on shared context and feedback. The next conversation has somewhere
            to begin.
          </p>
          <span class="benefit-mark" aria-hidden="true"><i></i><i></i><i></i></span>
        </article>
        <article class="benefit">
          <span class="benefit-number mono">01.2</span>
          <h3>A little more<br />follow-through.</h3>
          <p>
            Give it a goal and the tools it needs. It can research, create, and return work for you
            to review.
          </p>
          <span class="benefit-mark route-mark" aria-hidden="true">↗</span>
        </article>
        <article class="benefit">
          <span class="benefit-number mono">01.3</span>
          <h3>A little closer<br />to your work.</h3>
          <p>
            Talk in ChatGPT or supported Slack and Teams connections. Keep the work within reach,
            with the access you choose.
          </p>
          <span class="benefit-mark connection-mark" aria-hidden="true">⊙</span>
        </article>
      </div>
      <p class="source-note">
        Read OpenAI’s capability overview:
        <a href="https://openai.com/index/introducing-dots/"
          >Introducing dots <span aria-hidden="true">↗</span></a
        >
      </p>
    </section>

    <section class="day chapter" id="with-canon" tabindex="-1" aria-labelledby="day-title">
      <div class="section-register mono">
        <span>02 / A day with Canon</span><span>One idea, carried further</span>
      </div>
      <div class="section-intro">
        <h2 id="day-title">You leave a thought.<br />Come back to a start.</h2>
        <p>A small example: turn a scattered idea into a walkthrough your team can review.</p>
      </div>
      <div class="request">
        <span class="mono">You → Canon</span>
        <blockquote>
          “Help me turn our brand notes into a short guide for the team. Bring me a draft before we
          share it.”
        </blockquote>
        <span class="request-stamp mono">Illustrative brief</span>
      </div>
      <fieldset class="workbench">
        <legend class="sr-only">Explore the three steps of this illustrative workflow</legend>
        <input
          class="step-radio"
          type="radio"
          id="dots-gather"
          name="canon-step"
          value="0"
          checked
        />
        <label class="step-label" for="dots-gather"
          ><span class="mono">01</span><span>Gather</span><span aria-hidden="true">↗</span></label
        >
        <input class="step-radio" type="radio" id="dots-make" name="canon-step" value="1" />
        <label class="step-label" for="dots-make"
          ><span class="mono">02</span><span>Make</span><span aria-hidden="true">↗</span></label
        >
        <input class="step-radio" type="radio" id="dots-return" name="canon-step" value="2" />
        <label class="step-label" for="dots-return"
          ><span class="mono">03</span><span>Hand back</span><span aria-hidden="true">↗</span
          ></label
        >
        <div class="workbench-body">
          <div class="artifact-stage" aria-hidden="true">
            <div class="artifact-orbit"></div>
            <div class="paper paper-back">
              <span class="paper-mini">CONTEXT</span>
              <div class="paper-lines"></div>
            </div>
            <div class="paper paper-middle">
              <span class="paper-mini">DIRECTION</span>
              <div class="paper-lines"></div>
            </div>
            <div class="paper paper-front">
              <div class="paper-topline">
                <span class="paper-mini"
                  ><span class="artifact-step" data-scene="0">THE STARTING POINT</span><span
                    class="artifact-step"
                    data-scene="1">SOMETHING TAKING SHAPE</span
                  ><span class="artifact-step" data-scene="2">BACK TO YOU</span></span
                ><span>↗</span>
              </div>
              <span class="paper-title"
                ><span class="artifact-step" data-scene="0">A few<br />good notes.</span><span
                  class="artifact-step"
                  data-scene="1">A guide.<br />A first draft.</span
                ><span class="artifact-step" data-scene="2">Your turn<br />to review.</span></span
              >
              <div class="paper-lines"></div>
              <span class="paper-footer"
                ><span class="artifact-step" data-scene="0">Notes + references + your brief</span
                ><span class="artifact-step" data-scene="1">Guide + walkthrough outline</span><span
                  class="artifact-step"
                  data-scene="2">Draft + questions + next steps</span
                ></span
              >
            </div>
            <img
              class="canon-desk"
              src="/images/agency-sales/canon-guide-test-v1.webp"
              alt=""
              width="246"
              height="307"
              loading="lazy"
            />
            <span class="artifact-caption mono"
              ><span class="artifact-step" data-scene="0">01 / Context, brought together</span><span
                class="artifact-step"
                data-scene="1">02 / Direction, made tangible</span
              ><span class="artifact-step" data-scene="2">03 / Work, ready for your judgment</span
              ></span
            >
          </div>
          <div class="step-copy">
            <article class="step-panel" data-panel="0" id="gather-panel">
              <span class="step-kicker mono">First, find the thread.</span>
              <h3>Start with<br />what matters.</h3>
              <p>
                Canon’s example begins with the brief and the approved brand notes. The useful
                context is gathered before the making begins.
              </p>
              <dl>
                <dt class="mono">You give</dt>
                <dd>A goal, sources, and a boundary.</dd>
                <dt class="mono">You get</dt>
                <dd>A clearer starting point.</dd>
              </dl>
            </article>
            <article class="step-panel" data-panel="1" id="make-panel">
              <span class="step-kicker mono">Then, give it shape.</span>
              <h3>A thought becomes<br />something to use.</h3>
              <p>
                The next step is a draft guide and a walkthrough outline. Your direction gives the
                work its shape; connected tools make the next step possible.
              </p>
              <dl>
                <dt class="mono">You give</dt>
                <dd>Direction on what good looks like.</dd>
                <dt class="mono">You get</dt>
                <dd>Something concrete to respond to.</dd>
              </dl>
            </article>
            <article class="step-panel" data-panel="2" id="return-panel">
              <span class="step-kicker mono">Finally, back to you.</span>
              <h3>Ready for<br />your judgment.</h3>
              <p>
                The guide, open questions, and next steps come back together. You review the work,
                change the direction, and decide when it is ready to share.
              </p>
              <dl>
                <dt class="mono">You give</dt>
                <dd>Your review and explicit sharing approval.</dd>
                <dt class="mono">You get</dt>
                <dd>A considered handoff.</dd>
              </dl>
            </article>
            <button class="replay mono" type="button" hidden>
              Replay this step <span aria-hidden="true">↻</span>
            </button>
          </div>
        </div>
      </fieldset>
      <p class="example-note">
        <span class="tiny-dot" aria-hidden="true"></span> An explanation of what’s possible, not a recording
        of Canon working. Nothing is sent or connected here.
      </p>
    </section>

    <section class="control chapter" id="your-call" tabindex="-1" aria-labelledby="control-title">
      <div class="section-register mono">
        <span>03 / Your call</span><span>Capability, with boundaries</span>
      </div>
      <div class="control-grid">
        <div class="control-copy">
          <h2 id="control-title">A capable dot.<br />A human compass.</h2>
          <p class="control-lead">You bring the judgment.<br />Canon helps carry the work.</p>
          <p>
            Choose the apps your dot can access. Set rules for supported actions. Inspect progress,
            give feedback, or ask it to stop.
          </p>
          <a
            class="text-link"
            href="https://help.openai.com/en/articles/20001529-dots-privacy-security-and-safety-faqs"
            >Read about permissions and control <span aria-hidden="true">↗</span></a
          >
        </div>
        <div class="boundary-study">
          <span class="mono">An example boundary</span>
          <blockquote>Prepare the draft.<br /><span>Ask before publishing.</span></blockquote>
          <div class="decision-line" aria-hidden="true">
            <span>Canon</span><i></i><span class="decision-gate">You</span><i></i><span>Share</span>
          </div>
          <p>
            A useful rule for this example. Your dot’s action rules, permissions, and built-in
            safeguards still apply. Review consequential work.
          </p>
        </div>
      </div>
      <div class="faq" id="questions" tabindex="-1" aria-labelledby="questions-title">
        <div class="section-register mono">
          <span>Questions / Before you begin</span><span>Context and control</span>
        </div>
        <h3 id="questions-title">A few useful answers.</h3>
        {#each faqItems as item}
          <details>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        {/each}
      </div>
    </section>

    <section class="invitation chapter" id="begin" tabindex="-1" aria-labelledby="begin-title">
      <div class="section-register mono">
        <span>04 / A place to begin</span><span>Small is a good start</span>
      </div>
      <span class="closing-dot" aria-hidden="true"></span>
      <h2 id="begin-title">One good job.<br />A little more room.</h2>
      <p>
        Pick something you keep putting off.<br />We can help map the task, its sources, and the
        decisions that need you.
      </p>
      <a class="action" href={agencyCoreMessaging.openaiDotsMappingSessionHref}
        >{agencyCoreMessaging.bookMappingSessionLabel} <span aria-hidden="true">↗</span></a
      >
      <p class="next-paths">
        <a href={agencyCoreMessaging.selfMapHref}>Map it yourself</a><span aria-hidden="true">
          /
        </span><a href={agencyCoreMessaging.membershipHref}>Explore technical support</a>
      </p>
      <a class="text-link" href="https://chatgpt.com/dots"
        >Create your own dot with OpenAI <span aria-hidden="true">↗</span></a
      >
      <p class="availability">
        Access depends on your plan, region, and workspace settings.<br /><a
          href="https://help.openai.com/en/articles/20001530-getting-started-with-your-dot"
          >Check current availability</a
        >
      </p>
    </section>

    <details class="source-details">
      <summary>About this field guide & sources</summary>
      <div>
        <p>
          A CREATE SOMETHING field guide using Canon, our personal OpenAI dot, as the example. Canon
          artwork is illustrative. This is an independently authored guide, not an OpenAI product
          page.
        </p>
        <ul>
          <li>
            <a href="https://chatgpt.com/features/dots/">OpenAI’s dots campaign</a> — relationship, responsibility,
            and everyday work.
          </li>
          <li>
            <a href="https://openai.com/index/introducing-dots/">Introducing dots</a> — capabilities and
            connected work.
          </li>
          <li>
            <a href="https://help.openai.com/en/articles/20001530-getting-started-with-your-dot"
              >Getting started with your dot</a
            >
            — setup, review, and availability.
          </li>
          <li>
            <a
              href="https://help.openai.com/en/articles/20001529-dots-privacy-security-and-safety-faqs"
              >Privacy, security, and safety</a
            >
            — permissions and action boundaries.
          </li>
        </ul>
        <p>
          Sources checked November 8, 2026. Capabilities and access can change; consult OpenAI’s
          current documentation.
        </p>
      </div>
    </details>
  </div>
</div>
