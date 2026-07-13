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
    assetBaseUrl: props.Text({ name: 'Asset base URL', defaultValue: 'https://halfdozen-landing.pages.dev' }),
    testimonialPhoto: props.Text({
      name: 'Primary testimonial photo path',
      defaultValue: '/assets/testimonials/stereo-punks-photo.webp'
    })
  }
});
