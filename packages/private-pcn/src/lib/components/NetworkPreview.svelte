<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  const formats = [
    {
      label: 'Engineering academy',
      name: 'Agent engineering',
      description: 'A structured home for teaching people how to build and ship agents.',
      series: 'From prototype to production',
      lessons: ['Design the tool boundary', 'Build an MCP integration', 'Evaluate before you ship'],
      tags: ['ARCHITECTURE', 'MCP', 'EVALUATION']
    },
    {
      label: 'Builder collective',
      name: 'The build room',
      description: 'A shared reference library for independent builders learning from each other.',
      series: 'Inside the implementation',
      lessons: ['Walk through the agent loop', 'Debug a failed handoff', 'Review the deployment'],
      tags: ['WALKTHROUGH', 'DEBUGGING', 'DEPLOYMENT']
    },
    {
      label: 'Research circle',
      name: 'Applied agent lab',
      description: 'A private space to explain experiments, methods, and what you learned.',
      series: 'Experiments worth repeating',
      lessons: [
        'Frame the research question',
        'Compare retrieval approaches',
        'Read the evaluation results'
      ],
      tags: ['METHODS', 'RETRIEVAL', 'RESULTS']
    }
  ];
  let selected = $state(0);
  let name = $state('');
  let audience = $state('Members only');
  const format = $derived(formats[selected]);
</script>

<section class="network-builder" id="network-preview" aria-labelledby="preview-heading">
  <div class="builder-intro">
    <p class="eyebrow">02 / SHAPE YOUR NETWORK</p>
    <h2 id="preview-heading">Your format.<br /><em>Your way of teaching.</em></h2>
    <p>
      Start with a direction. Try a name and an access model to see how your network could take
      shape.
    </p>
    <fieldset class="format-options">
      <legend>Choose a starting point</legend>
      {#each formats as item, index}
        <label class:chosen={selected === index}>
          <input type="radio" name="network-format" value={index} bind:group={selected} />
          <span>{item.label}</span><span aria-hidden="true"
            ><Icon name={selected === index ? 'check' : 'plus'} /></span
          >
        </label>
      {/each}
    </fieldset>
    <div class="builder-controls">
      <label>Network name<input bind:value={name} maxlength="48" placeholder={format.name} /></label
      >
      <label
        >Access model<select bind:value={audience}
          ><option>Members only</option><option>Public preview + members</option></select
        ></label
      >
    </div>
    <p class="muted">
      Illustrative preview. Changes stay on this page; no network or account is created.
    </p>
  </div>
  <div class="network-window" aria-label="Illustrative network preview">
    <div class="window-bar"><span>YOUR NETWORK / PREVIEW</span><span>01—03</span></div>
    <div class="network-window-body">
      <div class="network-heading">
        <div class="network-monogram" aria-hidden="true"><Icon name="network" size={24} /></div>
        <div>
          <p class="eyebrow">INDEPENDENT KNOWLEDGE NETWORK</p>
          <h3>{name.trim() || format.name}</h3>
        </div>
      </div>
      <p class="network-description">{format.description}</p>
      <div class="network-feature">
        <span class="eyebrow">FEATURED SERIES</span>
        <h4>{format.series}</h4>
        <div class="execution-diagram" aria-label="Build, evaluate, and share">
          <span>BUILD</span><b aria-hidden="true"><Icon name="arrow-right" /></b><span
            >EVALUATE</span
          ><b aria-hidden="true"><Icon name="arrow-right" /></b><span>SHARE</span>
        </div>
        <span class="example-label">EXAMPLE CONTENT / NOT PLAYABLE</span>
      </div>
      <ol class="lesson-list" aria-live="polite">
        {#each format.lessons as lesson, index}<li>
            <span class="lesson-number">0{index + 1}</span>
            <div><small>{format.tags[index]}</small><strong>{lesson}</strong></div>
            <span class="access-label"
              >{audience === 'Public preview + members' && index === 0 ? 'PUBLIC' : 'MEMBERS'}</span
            >
          </li>{/each}
      </ol>
      <div class="network-window-footer">
        <span>Your brand. Your domain.</span><span>{audience}</span>
      </div>
    </div>
  </div>
</section>
