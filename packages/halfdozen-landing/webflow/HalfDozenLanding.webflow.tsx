import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { HalfDozenLanding } from '../src/sections';
import './globals';

export default declareComponent(HalfDozenLanding, {
  name: 'Half Dozen Landing Page',
  description: 'Full Half Dozen landing page assembled from Webflow-ready section components.',
  group: 'Half Dozen',
  options: { ssr: true },
  props: {
    heroCard: props.Text({ name: 'Hero image URL', defaultValue: '/assets/hero-motion-card.png' }),
    eventPhoto: props.Text({ name: 'Event photo URL', defaultValue: '/assets/live-event-photo.png' }),
    testimonialPhoto: props.Text({ name: 'Testimonial photo URL', defaultValue: '/assets/testimonial-crowd.png' })
  }
});
