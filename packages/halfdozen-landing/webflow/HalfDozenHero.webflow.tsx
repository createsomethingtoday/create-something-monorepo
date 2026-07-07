import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { HeroSection } from '../src/sections';
import './globals';

export default declareComponent(HeroSection, {
  name: 'Half Dozen Hero',
  description: 'Hero section with navigation, headline, brand proof, social links, and live-event imagery.',
  group: 'Half Dozen',
  options: { ssr: true },
  props: {
    heroCard: props.Text({ name: 'Hero image URL', defaultValue: '/assets/hero-motion-card.png' }),
    eventPhoto: props.Text({ name: 'Event photo URL', defaultValue: '/assets/live-event-photo.png' }),
    eyebrow: props.Text({
      name: 'Left quote',
      defaultValue:
        'A system is an interconnected set of elements that is coherently organized in a way that achieves something.'
    }),
    description: props.Text({
      name: 'Right intro',
      defaultValue:
        'Half Dozen is a strategic solutions partner helping teams in live events build better systems and do more with less.'
    })
  }
});
