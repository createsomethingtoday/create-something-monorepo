import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { HeroSection } from './HeroSection';

export default declareComponent(HeroSection, {
  name: 'Hero Section',
  description: 'Simple hero with video background, bottom-aligned content',
  group: 'Sections',
  props: {
    videoSrc: props.Text({
      name: 'Video URL',
      defaultValue: '',
      tooltip: 'MP4 video URL for background',
    }),
    title: props.Text({
      name: 'Title',
      defaultValue: 'Chemistry That Outperforms',
    }),
    description: props.Text({
      name: 'Description',
      defaultValue: 'More oil. More metals. Smarter chemistry.',
    }),
    ctaText: props.Text({
      name: 'CTA Text',
      defaultValue: 'Learn More',
    }),
    ctaHref: props.Text({
      name: 'CTA Link',
      defaultValue: '/contact',
    }),
    variant: props.Variant({
      name: 'Brand Color',
      options: ['default', 'lithx', 'petrox', 'dme'],
      defaultValue: 'default',
    }),
  },
});
