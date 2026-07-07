import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TestimonialSection } from '../src/sections';
import './globals';

export default declareComponent(TestimonialSection, {
  name: 'Half Dozen Testimonial',
  description: 'Lime testimonial section with image, client names, quote, and slider affordance.',
  group: 'Half Dozen',
  options: { ssr: true },
  props: {
    testimonialPhoto: props.Text({ name: 'Testimonial photo URL', defaultValue: '/assets/testimonial-crowd.png' })
  }
});
