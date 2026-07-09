import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { HeroSection } from '../src/sections';
import './globals';

export default declareComponent(HeroSection, {
  name: 'Half Dozen Hero',
  description: 'Hero section with navigation, Figma-authored motion, brand proof, and social links.',
  group: 'Half Dozen',
  options: { ssr: true },
  props: {
    heroMotion: props.Text({ name: 'Hero motion video URL', defaultValue: '/assets/hero-motion.mp4' }),
    heroMotionPoster: props.Text({ name: 'Hero motion poster URL', defaultValue: '/assets/hero-motion-poster.jpg' }),
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
