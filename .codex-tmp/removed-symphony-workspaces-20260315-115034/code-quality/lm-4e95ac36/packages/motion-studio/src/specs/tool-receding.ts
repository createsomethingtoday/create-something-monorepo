/**
 * Tool Receding Animation Spec
 * 
 * Demonstrates Heidegger's concept of Zuhandenheit (ready-to-hand).
 * The hammer disappears when hammering - the tool recedes into transparent use.
 * 
 * Phases:
 * 1. VORHANDENHEIT (0-20%): Tool is present-at-hand, visible, noticed
 * 2. TRANSITION (20-70%): Focus shifts from tool to work
 * 3. ZUHANDENHEIT (70-100%): Tool is ready-to-hand, invisible, receded
 */

import type { AnimationSpec } from './types';

export const toolRrecedingSpec: AnimationSpec = {
  id: 'tool-receding',
  name: 'Tool Receding',
  description: 'The hammer disappears when hammering. Heidegger\'s Zuhandenheit.',
  
  duration: 5000, // 5 seconds
  fps: 30,
  
  canvas: {
    width: 800,
    height: 450,
    background: '#000000',
  },
  
  phases: [
    {
      id: 'vorhandenheit',
      label: 'VORHANDENHEIT — Present-at-hand',
      start: 0,
      end: 0.2,
    },
    {
      id: 'transition',
      label: 'TRANSITION — Focus shifts',
      start: 0.2,
      end: 0.7,
    },
    {
      id: 'zuhandenheit',
      label: 'ZUHANDENHEIT — Ready-to-hand',
      start: 0.7,
      end: 1,
    },
  ],
  
  elements: [
    // Work surface
    {
      id: 'work-surface',
      type: 'rect',
      position: { x: 'center', y: 350, anchor: 'center' },
      width: 300,
      height: 40,
      fill: '#222222',
      borderRadius: 4,
      keyframes: [
        { at: 0, opacity: 1 },
      ],
    },
    
    // Nail body (animates as it's driven in)
    {
      id: 'nail-body',
      type: 'rect',
      position: { x: 'center', y: 280, anchor: 'bottom-center' },
      width: 6,
      height: 70,
      fill: '#888888',
      borderRadius: 2,
      keyframes: [
        { at: 0, y: 0 },
        { at: 0.2, y: 0 },
        { at: 0.8, y: 50 }, // Nail driven in 50px
        { at: 1, y: 50 },
      ],
    },
    
    // Nail head
    {
      id: 'nail-head',
      type: 'rect',
      position: { x: 'center', y: 210, anchor: 'center' },
      width: 16,
      height: 5,
      fill: '#999999',
      borderRadius: 2,
      keyframes: [
        { at: 0, y: 0 },
        { at: 0.2, y: 0 },
        { at: 0.8, y: 50 }, // Moves with nail
        { at: 1, y: 50 },
      ],
    },
    
    // Hammer group
    {
      id: 'hammer',
      type: 'group',
      position: { x: 'center', y: 120, anchor: 'top-left' },
      keyframes: [
        { at: 0, opacity: 1, scale: 1, blur: 0 },
        { at: 0.2, opacity: 1, scale: 1, blur: 0 },
        { at: 0.6, opacity: 0.3, scale: 0.8, blur: 8 },
        { at: 1, opacity: 0, scale: 0.8, blur: 8 },
      ],
      children: [
        // Hammer handle
        {
          id: 'hammer-handle',
          type: 'rect',
          position: { x: 0, y: 0, anchor: 'top-left' },
          width: 14,
          height: 120,
          fill: '#8b6914',
          borderRadius: 3,
          keyframes: [],
        },
        // Hammer head
        {
          id: 'hammer-head',
          type: 'rect',
          position: { x: -23, y: -15, anchor: 'top-left' },
          width: 60,
          height: 30,
          fill: '#555555',
          borderRadius: 4,
          keyframes: [],
        },
      ],
    },
    
    // Focus ring (appears during transition)
    {
      id: 'focus-ring',
      type: 'circle',
      position: { x: 'center', y: 250, anchor: 'center' },
      radius: 25,
      stroke: '#ffffff',
      strokeWidth: 2,
      keyframes: [
        { at: 0, opacity: 0 },
        { at: 0.2, opacity: 0 },
        { at: 0.4, opacity: 0.6 },
        { at: 0.6, opacity: 0.6 },
        { at: 0.8, opacity: 0 },
      ],
    },
  ],
  
  reveal: {
    text: 'The hammer disappears when hammering.',
    style: 'fade',
    startPhase: 0.7,
  },
};

export default toolRrecedingSpec;
