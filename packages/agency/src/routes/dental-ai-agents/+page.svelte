<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import {
    dentalAgentAnswer,
    dentalAgentFaqs,
    dentalAgentService,
    dentalDemoHref
  } from '$lib/data/dentalAgents';
  import { enhanceDentalAgents } from '$lib/motion/dentalAgents';
  import '$lib/styles/dental-agents.css';
</script>

<SEO
  title="OpenAI Agents for Dental Practices | CREATE SOMETHING"
  description="Connect your dental website to approved practice information, appointment workflows, and visible records. Explore a working synthetic demo and scope your integration."
  canonical="https://createsomething.agency/dental-ai-agents"
  ogImage="/images/dental-agents/dental-agents-social.png"
  keywords="OpenAI integration for dental practices, dental AI agents, dental website assistant, appointment workflow"
  propertyName="agency"
  services={[dentalAgentService]}
  faqItems={dentalAgentFaqs}
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.agency' },
    { name: 'Connected tools', url: 'https://createsomething.agency/partners' },
    { name: 'Dental AI agents', url: 'https://createsomething.agency/dental-ai-agents' }
  ]}
/>

<div
  class="dental-agents property-performance"
  data-performance-mode="proof"
  data-scroll-entrance-skip
  use:enhanceDentalAgents
>
  <section
    class="dental-chapter dental-opening"
    id="dental-opening"
    tabindex="-1"
    aria-labelledby="dental-title"
  >
    <div class="dental-register mono">
      <span>OpenAI integration / Dental practices</span><span>One front-desk workflow</span>
    </div>
    <div class="dental-hero-grid">
      <div class="dental-hero-copy">
        <p class="dental-eyebrow">A useful pair of hands.</p>
        <h1 id="dental-title">
          A little backup.<br />For your <span>dental<br class="desktop-break" /> front desk.</span>
        </h1>
        <p class="dental-lede">
          The next question. The right information.<br />A booking your team can trace.
        </p>
        <p class="dental-direct-answer">{dentalAgentAnswer}</p>
        <a class="dental-action" href={agencyCoreMessaging.dentalAgentsMappingSessionHref}
          >{agencyCoreMessaging.bookMappingSessionLabel}<span aria-hidden="true">↗</span></a
        >
        <p class="dental-action-note">
          Bring one inquiry-to-appointment workflow.<br />No patient details or credentials needed.
        </p>
        <a
          class="dental-demo-link"
          data-dental-demo-link
          href={dentalDemoHref}
          aria-label="Explore the dental demo"
          >Explore the dental demo <span aria-hidden="true">↗</span></a
        >
      </div>
      <figure class="dental-front-desk" aria-labelledby="dental-map-caption">
        <div class="desk-register mono">
          <span>Website → practice tools</span><span>Read / confirm / record</span>
        </div>
        <div class="desk-question">
          <span class="mono">A visitor asks</span>
          <p>“Can I book a first visit?”</p>
        </div>
        <ol class="desk-route" aria-label="A bounded appointment workflow">
          <li>
            <span class="desk-mark" aria-hidden="true">01</span>
            <div>
              <strong>Read approved information.</strong>
              <p>Care options, hours, and the next open time.</p>
            </div>
          </li>
          <li class="desk-gate">
            <span class="desk-mark" aria-hidden="true">⊣</span>
            <div>
              <strong>Wait for confirmation.</strong>
              <p>Show the details before anything is booked.</p>
            </div>
          </li>
          <li>
            <span class="desk-mark" aria-hidden="true">□</span>
            <div>
              <strong>Leave a record.</strong>
              <p>Save the confirmed result. Keep staff in the loop.</p>
            </div>
          </li>
        </ol>
        <img
          class="dental-canon"
          src="/images/agency-sales/canon-guide-cutout-v1.webp"
          alt="Canon, our illustrated graphite collaborator, pointing toward the workflow."
          width="307"
          height="384"
          fetchpriority="high"
        />
        <p class="desk-footnote mono">Useful work.<br />Visible boundaries.</p>
        <figcaption id="dental-map-caption">
          Concept illustration · booking access depends on your approved systems.
        </figcaption>
      </figure>
    </div>
    <a class="dental-reading-rail mono" href="#dental-proof"
      ><span>From a helpful answer to a checked result.</span><span>See the example ↓</span></a
    >
  </section>

  <section
    class="dental-chapter dental-proof"
    id="dental-proof"
    tabindex="-1"
    aria-labelledby="dental-proof-title"
  >
    <div class="dental-register mono">
      <span>01 / A working example</span><span>Fictional practice · synthetic records</span>
    </div>
    <div class="dental-section-heading">
      <h2 id="dental-proof-title">A conversation.<br />With a <span>follow-through.</span></h2>
      <p>
        We built Lumen Dental to make the connection inspectable. Ask a question, check the source,
        confirm a demo visit, and find the saved record.
      </p>
    </div>
    <figure class="lumen-evidence">
      <div class="lumen-frame-bar mono">
        <span>Lumen Dental / Connected front desk</span><span
          >Captured demonstration · November 2026</span
        >
      </div>
      <a
        href={dentalDemoHref}
        data-dental-demo-link
        aria-label="Open the interactive Lumen Dental demonstration"
        ><img
          src="/images/dental-agents/lumen-connected-desk-20261109.png"
          alt="Captured Lumen Dental demo: Lumi’s confirmation and a matching synthetic booking appear beside the practice database. No real patient records are shown."
          width="1241"
          height="876"
          loading="lazy"
        /></a
      >
      <figcaption>
        <span>Actual demonstration interface · synthetic bookings, not patient data.</span><a
          href={dentalDemoHref}
          data-dental-demo-link
          aria-label="Explore the live dental demo">Explore the live dental demo ↗</a
        >
      </figcaption>
    </figure>
    <fieldset class="dental-sequence">
      <legend>Follow the appointment request</legend>
      <input
        class="sequence-radio"
        type="radio"
        name="dental-step"
        id="dental-ask"
        value="ask"
        checked
      />
      <input class="sequence-radio" type="radio" name="dental-step" id="dental-read" value="read" />
      <input
        class="sequence-radio"
        type="radio"
        name="dental-step"
        id="dental-confirm"
        value="confirm"
      />
      <input
        class="sequence-radio"
        type="radio"
        name="dental-step"
        id="dental-record"
        value="record"
      />
      <div class="sequence-controls">
        <label for="dental-ask"><span class="mono">01</span>Ask</label><label for="dental-read"
          ><span class="mono">02</span>Read</label
        ><label for="dental-confirm"><span class="mono">03</span>Confirm</label><label
          for="dental-record"><span class="mono">04</span>Record</label
        >
      </div>
      <div class="sequence-panels">
        <div class="sequence-panel" data-step="ask">
          <span class="sequence-mark" aria-hidden="true">?</span>
          <div>
            <h3>Start where the visitor is.</h3>
            <p>
              The agent answers an approved practice question or helps the visitor find a suitable
              visit. The model chooses from the tools it has been allowed to use.
            </p>
            <span class="source-label mono">Visitor question → bounded tool request</span>
          </div>
        </div>
        <div class="sequence-panel" data-step="read">
          <span class="sequence-mark" aria-hidden="true">↗</span>
          <div>
            <h3>Read the practice’s source.</h3>
            <p>
              Care options come from approved records. Available times come from the connected
              calendar. The answer can point back to the information used.
            </p>
            <span class="source-label mono">Practice records → checked answer</span>
          </div>
        </div>
        <div class="sequence-panel" data-step="confirm">
          <span class="sequence-mark" aria-hidden="true">⊣</span>
          <div>
            <h3>Hold the booking for a decision.</h3>
            <p>
              The visitor reviews the service and time. Confirmation triggers another availability
              check. If the slot has gone, the system asks for another choice.
            </p>
            <span class="source-label mono">Review → confirmation → availability recheck</span>
          </div>
        </div>
        <div class="sequence-panel" data-step="record">
          <span class="sequence-mark" aria-hidden="true">□</span>
          <div>
            <h3>Make the result easy to inspect.</h3>
            <p>
              The demonstration saves a synthetic booking and a tool receipt. Separate website and
              agent analytics show recorded activity without inventing a business result.
            </p>
            <span class="source-label mono"
              >Confirmed record → tool receipt → aggregate activity</span
            >
          </div>
        </div>
      </div>
      <p class="sequence-boundary">
        Illustrative sequence based on the tested demonstration. These controls explain the
        workflow; they do not run a live agent or make a booking.
      </p>
    </fieldset>
    <div class="dental-proof-boundary">
      <strong>What the example establishes</strong>
      <p>
        Working model-to-tool calls, confirmed synthetic bookings, visible records, and aggregate
        interaction analytics. It does not establish a real clinic integration, time savings,
        revenue, or patient outcomes. The live demonstration is public: open it to explore the
        fictional practice, try the concierge, and inspect its synthetic records.
      </p>
    </div>
  </section>

  <section
    class="dental-chapter dental-fit"
    id="dental-fit"
    tabindex="-1"
    aria-labelledby="dental-fit-title"
  >
    <div class="dental-register mono">
      <span>02 / Built around your practice</span><span>Your sources. Your authority.</span>
    </div>
    <div class="dental-section-heading">
      <h2 id="dental-fit-title">Connect the work.<br /><span>Keep the care human.</span></h2>
      <p>
        Your front desk knows the exceptions. We map those decisions before giving an agent access
        to your systems.
      </p>
    </div>
    <dl class="dental-scope-list">
      <div>
        <dt><span class="mono">01</span>Practice questions</dt>
        <dd>
          Connect approved services, hours, location, and general visit information. Your team owns
          the answers and when they change.
        </dd>
      </div>
      <div>
        <dt><span class="mono">02</span>Appointment workflow</dt>
        <dd>
          Check scheduler APIs, access, booking rules, and confirmation. If an approved booking
          connection is unavailable, prepare a staff request instead.
        </dd>
      </div>
      <div>
        <dt><span class="mono">03</span>Staff handoff</dt>
        <dd>
          Send clinical questions, exceptions, and unsupported actions to a person. Diagnosis,
          treatment recommendations, and benefits verification stay outside this example.
        </dd>
      </div>
      <div>
        <dt><span class="mono">04</span>Records and recovery</dt>
        <dd>
          Keep the result, source, and tool history your team needs. Agree on access, failures, and
          recovery before launch. Real patient information is never a public demo artifact.
        </dd>
      </div>
    </dl>
    <div class="dental-search-boundary">
      <div>
        <span class="dental-eyebrow">Search and discovery</span>
        <h3>Public answers people<br />can actually find.</h3>
        <p>
          We can make approved practice information clear, crawlable, and consistent across the
          website and agent sources. Suitable metadata and structured data support that foundation.
        </p>
      </div>
      <div>
        <span class="dental-eyebrow">Measurement</span>
        <h3>A useful record.<br />An honest measure.</h3>
        <p>
          Website visits, agent requests, tool use, and confirmed records show what ran. Search
          performance and AI citations need separate evidence. We do not turn chat activity into a
          ranking or revenue claim.
        </p>
      </div>
    </div>
    <p class="dental-privacy-note">
      Before patient information is connected, we review the minimum data needed, access, retention,
      provider agreements, and applicable privacy and security requirements. A synthetic
      demonstration is not a compliance determination.
    </p>
    <p class="dental-related">
      Explore the wider approach: <a href="/workflows/mcp-vs-api">MCP or an API?</a>
      <span aria-hidden="true">/</span> <a href="/security">Access and security</a>
      <span aria-hidden="true">/</span> <a href="/services">How we work</a>
      <span aria-hidden="true">/</span>
      <a href="/use-cases/business">AI workflows for businesses</a>
    </p>
  </section>

  <section
    class="dental-chapter dental-next"
    id="dental-next"
    tabindex="-1"
    aria-labelledby="dental-next-title"
  >
    <div class="dental-register mono">
      <span>03 / A place to begin</span><span>One useful workflow</span>
    </div>
    <div class="dental-next-grid">
      <div>
        <h2 id="dental-next-title">
          Bring the question<br />your team keeps<br /><span>answering.</span>
        </h2>
        <p>
          We’ll look at the route from a website inquiry to an appointment: the information,
          connected tools, person in charge, and first result to check.
        </p>
        <a class="dental-action" href={agencyCoreMessaging.dentalAgentsMappingSessionHref}
          >{agencyCoreMessaging.bookMappingSessionLabel}<span aria-hidden="true">↗</span></a
        >
        <p class="dental-action-note">
          This books a CREATE SOMETHING workflow session, not dental care.
        </p>
        <p class="dental-commercial-note">
          Implementation is scoped before work begins. Hosting, OpenAI API usage, and ongoing
          operation need an agreed budget. Your practice keeps its accounts, data, and approval
          authority.
        </p>
      </div>
      <div class="dental-faq">
        <h3>Before we connect anything.</h3>
        {#each dentalAgentFaqs as faq}<details>
            <summary>{faq.question}<span aria-hidden="true">+</span></summary>
            <p>{faq.answer}</p>
          </details>{/each}
      </div>
    </div>
  </section>
</div>
