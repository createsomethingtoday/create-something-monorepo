import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { KineticHero } from './KineticHero';

export default declareComponent(KineticHero, {
  name: 'Kinetic Hero',
  description: 'Full-screen hero section with video/image background and CTA',
  group: 'Sections',
  props: {
    title: props.Text({
      name: 'Title',
      defaultValue: 'Innovation Meets Excellence',
    }),
    subtitle: props.Text({
      name: 'Subtitle',
      defaultValue: 'Transforming industries with cutting-edge technology and sustainable solutions.',
    }),
    ctaText: props.Text({
      name: 'CTA Button Text',
      defaultValue: 'Learn More',
    }),
    ctaHref: props.Text({
      name: 'CTA Button Link',
      defaultValue: '',
    }),
    videoSrc: props.Text({
      name: 'Video URL',
      defaultValue: '',
      tooltip: 'MP4 video URL for background',
    }),
    backgroundImage: props.Text({
      name: 'Background Image',
      defaultValue: '',
      tooltip: 'Fallback image if no video',
    }),
    variant: props.Variant({
      name: 'Brand Color',
      options: ['default', 'lithx', 'petrox', 'dme'],
      defaultValue: 'default',
    }),
    minHeight: props.Variant({
      name: 'Height',
      options: ['full', 'large', 'medium'],
      defaultValue: 'full',
    }),
    showScrollIndicator: props.Boolean({
      name: 'Show Scroll Indicator',
      defaultValue: true,
    }),
  },
});
