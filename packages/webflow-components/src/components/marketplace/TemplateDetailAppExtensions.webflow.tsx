import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateDetailAppExtensions } from './TemplateDetailAppExtensions';

export default declareComponent(TemplateDetailAppExtensions, {
  name: 'Template Detail App Extensions',
  description:
    'Optional detail-page module for curated Noteworthy app pairings. Links are off by default so app discovery stays secondary to the template purchase path.',
  group: 'Marketplace',
  props: {
    templateSlug: props.Text({
      name: 'Template Slug',
      defaultValue: '',
      tooltip: 'Optional. Leave blank to infer from /templates/html/{slug}.',
    }),
    title: props.Text({
      name: 'Title',
      defaultValue: 'Optional apps for this template',
    }),
    description: props.Text({
      name: 'Description',
      defaultValue:
        'Curated app pairings can help extend this template after launch. They stay secondary so the template purchase path remains clear.',
    }),
    appsJson: props.Text({
      name: 'Apps JSON',
      defaultValue: '',
      tooltip:
        'Optional JSON array of {name, scenario, reason?, badge?, href?, iconUrl?}. Use for curated app pairings by scenario.',
    }),
    appOneName: props.Text({ name: 'App 1 Name', defaultValue: '' }),
    appOneScenario: props.Text({ name: 'App 1 Scenario', defaultValue: '' }),
    appOneBadge: props.Text({ name: 'App 1 Badge', defaultValue: 'Noteworthy' }),
    appOneUrl: props.Link({ name: 'App 1 URL' }),
    appOneIcon: props.Image({ name: 'App 1 Icon' }),
    appTwoName: props.Text({ name: 'App 2 Name', defaultValue: '' }),
    appTwoScenario: props.Text({ name: 'App 2 Scenario', defaultValue: '' }),
    appTwoBadge: props.Text({ name: 'App 2 Badge', defaultValue: 'Noteworthy' }),
    appTwoUrl: props.Link({ name: 'App 2 URL' }),
    appTwoIcon: props.Image({ name: 'App 2 Icon' }),
    appThreeName: props.Text({ name: 'App 3 Name', defaultValue: '' }),
    appThreeScenario: props.Text({ name: 'App 3 Scenario', defaultValue: '' }),
    appThreeBadge: props.Text({ name: 'App 3 Badge', defaultValue: 'Noteworthy' }),
    appThreeUrl: props.Link({ name: 'App 3 URL' }),
    appThreeIcon: props.Image({ name: 'App 3 Icon' }),
    maxApps: props.Number({
      name: 'Max Apps',
      defaultValue: 3,
      tooltip: 'Keep this small. The module is a contextual supplement, not an app marketplace listing.',
    }),
    showLinks: props.Boolean({
      name: 'Show App Links',
      defaultValue: false,
      tooltip: 'Disabled by default to avoid sending shoppers away from the template detail page.',
    }),
    linkLabel: props.Text({
      name: 'Link Label',
      defaultValue: 'Learn more',
    }),
    emptyBehavior: props.Variant({
      name: 'Empty Behavior',
      options: ['hide', 'placeholder'],
      defaultValue: 'hide',
    }),
    enableAnalytics: props.Boolean({ name: 'Enable Analytics', defaultValue: true }),
  },
});
