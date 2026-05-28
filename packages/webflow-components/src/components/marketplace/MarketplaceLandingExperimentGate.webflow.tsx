import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { MarketplaceLandingExperimentGate } from './MarketplaceLandingExperimentGate';

export default declareComponent(MarketplaceLandingExperimentGate, {
  name: 'Marketplace Landing Experiment Gate',
  description:
    'Optimizely-compatible A/B test gate for the marketplace landing page. Reveals control or Code Component treatment surfaces and tracks exposure.',
  group: 'Marketplace',
  props: {
    experimentKey: props.Text({
      name: 'Experiment Key',
      defaultValue: 'templates_landing_code_components',
    }),
    mode: props.Variant({
      name: 'Assignment Mode',
      options: ['optimizely', 'local_traffic_split', 'force_control', 'force_treatment'],
      defaultValue: 'optimizely',
      tooltip:
        'Optimizely mode waits for Optimizely variation code to call TemplateMarketplaceLandingExperiment.showTreatment() or showControl().',
    }),
    trafficPercent: props.Number({
      name: 'Local Treatment Percent',
      defaultValue: 50,
      tooltip: 'Used only in local traffic split mode. Optimizely traffic allocation should be configured in Optimizely.',
    }),
    queryParam: props.Text({
      name: 'QA Query Param',
      defaultValue: 'tm_landing_variant',
      tooltip: 'Use ?tm_landing_variant=control or ?tm_landing_variant=treatment for QA overrides.',
    }),
    storageKey: props.Text({
      name: 'Storage Key',
      defaultValue: 'wf_template_marketplace_landing_variant',
    }),
    controlSelector: props.Text({
      name: 'Control Selector',
      defaultValue: '[data-marketplace-landing-experiment="control"]',
    }),
    treatmentSelector: props.Text({
      name: 'Treatment Selector',
      defaultValue: '[data-marketplace-landing-experiment="treatment"]',
    }),
    optimizelyWaitMs: props.Number({
      name: 'Optimizely Wait MS',
      defaultValue: 500,
      tooltip: 'Delay before tracking default control exposure when Optimizely variation code does not call the gate.',
    }),
    optimizelyExposureEvent: props.Text({
      name: 'Optimizely Exposure Event',
      defaultValue: 'template_marketplace_landing_code_components_exposed',
    }),
    enableOptimizelyTracking: props.Boolean({
      name: 'Enable Optimizely Tracking',
      defaultValue: true,
    }),
    initPageAnalytics: props.Boolean({
      name: 'Initialize Page Analytics',
      defaultValue: false,
      tooltip: 'Leave off when the existing marketplace body script already initializes Template Marketplace Viewed.',
    }),
    enableAnalytics: props.Boolean({
      name: 'Enable Analytics',
      defaultValue: true,
    }),
    debug: props.Boolean({
      name: 'Debug Logging',
      defaultValue: false,
    }),
  },
});
