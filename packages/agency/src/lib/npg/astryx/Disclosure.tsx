import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { ChevronDown } from 'lucide-react';
import { gsap, reducedMotion } from './motion';

// Astryx layout/controls with one reversible GSAP height owner. Closed content
// loses interaction and accessibility immediately, independently of the tween.
export function Disclosure({
  trigger,
  defaultIsOpen = false,
  children
}: {
  trigger: string;
  defaultIsOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultIsOpen);
  const body = useRef<HTMLDivElement | null>(null);
  const chevron = useRef<HTMLDivElement | null>(null);
  const initial = useRef(true);
  const id = useId();
  useLayoutEffect(() => {
    const element = body.current;
    if (!element) return;
    if (initial.current) {
      initial.current = false;
      element.hidden = !open;
      gsap.set(element, { display: open ? 'flex' : 'none' });
      gsap.set(chevron.current, { rotate: open ? 180 : 0 });
      return;
    }
    const currentHeight = element.hidden ? 0 : element.getBoundingClientRect().height;
    element.hidden = false;
    gsap.set(element, { display: 'flex' });
    const context = gsap.context(() => {
      gsap.fromTo(
        element,
        { height: currentHeight, overflow: 'hidden' },
        {
          height: open ? element.scrollHeight : 0,
          opacity: open ? 1 : 0,
          duration: reducedMotion() ? 0 : 0.18,
          ease: 'power2.out',
          overwrite: true,
          onComplete: () => {
            element.hidden = !open;
            gsap.set(element, { display: open ? 'flex' : 'none' });
            gsap.set(element, { clearProps: 'height,opacity,overflow' });
          }
        }
      );
      gsap.to(chevron.current, {
        rotate: open ? 180 : 0,
        duration: reducedMotion() ? 0 : 0.18,
        overwrite: true
      });
    });
    const settle = () => context.getTweens().forEach((tween: gsap.core.Tween) => tween.progress(1));
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    media.addEventListener('change', settle);
    window.addEventListener('resize', settle);
    document.addEventListener('visibilitychange', settle);
    return () => {
      media.removeEventListener('change', settle);
      window.removeEventListener('resize', settle);
      document.removeEventListener('visibilitychange', settle);
      context.getTweens().forEach((tween: gsap.core.Tween) => tween.kill());
    };
  }, [open]);
  return (
    <VStack gap={0} className="npg-disclosure min-w-0">
      <Button
        label={trigger}
        variant="ghost"
        className="min-h-control justify-between"
        aria-expanded={open}
        aria-controls={id}
        endContent={
          <VStack as="span" ref={chevron} gap={0}>
            <Icon icon={ChevronDown} size="sm" />
          </VStack>
        }
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </Button>
      <VStack ref={body} id={id} gap={0} aria-hidden={!open} inert={!open} className="min-w-0">
        {children}
      </VStack>
    </VStack>
  );
}
