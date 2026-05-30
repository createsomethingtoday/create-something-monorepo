import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateReviewerDifyCourse } from './TemplateReviewerDifyCourse';
import { defaultAgentEmbeds } from './TemplateReviewerDifyCourseData';

export default declareComponent(TemplateReviewerDifyCourse, {
  name: 'Template Reviewer Dify Course',
  description:
    'Interactive onboarding course for Webflow Marketplace reviewers running parallel reviews in Dify',
  group: 'Training',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Parallel reviews with Dify'
    }),
    eyebrow: props.Text({
      name: 'Eyebrow',
      defaultValue: 'Webflow Marketplace reviews'
    }),
    intro: props.Text({
      name: 'Intro',
      defaultValue:
        'Learn how to review multiple templates at once in Dify, using evidence-first agent work, Webflow-ready feedback, and reviewer-owned approval.'
    }),
    difyChatUrl: props.Text({
      name: 'Dify Chat URL',
      defaultValue: '',
      tooltip: 'Optional URL for the published Dify reviewer chat app.'
    }),
    agentInstructionsUrl: props.Text({
      name: 'Agent Instructions URL',
      defaultValue: '',
      tooltip: 'Optional URL for the Dify agent instruction source of truth.'
    }),
    courseDocUrl: props.Text({
      name: 'Course Doc URL',
      defaultValue: '',
      tooltip: 'Optional URL for the full Markdown or documentation page.'
    }),
    defaultView: props.Variant({
      name: 'Default View',
      options: ['overview', 'modules', 'agents', 'screenshots', 'pilot'],
      defaultValue: 'overview'
    }),
    screenshotAssets: props.Text({
      name: 'Screenshot Assets (JSON)',
      defaultValue: '[]',
      tooltip: 'Optional JSON array of {id,url,alt?,caption?} for S1-S18 screenshots.'
    }),
    walkthroughReviewSet: props.Text({
      name: 'Walkthrough Review Set (JSON)',
      defaultValue: '[]',
      tooltip:
        'Optional redacted JSON array of {name,publishedUrl,versionId?,assetId?,status?,notes?}. Leave blank to use the live queue prompt.'
    }),
    walkthroughBatchSize: props.Number({
      name: 'Live Queue Batch Size',
      defaultValue: 3,
      tooltip:
        'How many review-ready queue rows the live walkthrough prompt should ask Dify to pull.'
    }),
    agentEmbeds: props.Text({
      name: 'Dify Agent Embeds (JSON)',
      defaultValue: JSON.stringify(defaultAgentEmbeds),
      tooltip: 'JSON array of {id,name,embedUrl,role?} for embedded Dify reviewer chats.'
    }),
    showPilotCalculator: props.Boolean({
      name: 'Show Pilot Calculator',
      defaultValue: true
    }),
    compact: props.Boolean({
      name: 'Compact',
      defaultValue: false
    })
  }
});
