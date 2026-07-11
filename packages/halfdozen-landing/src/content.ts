export const navItems = [
  { label: 'Work', href: '#work' },
  { label: 'Clients', href: '#clients' },
  { label: 'Team', href: 'https://www.halfdozen.co/about-us' },
  { label: 'Details', href: '#details' }
];

export const clients = [
  'BLOND:ISH',
  "Boots 'N Beats",
  'FanPad',
  'C3 Management',
  'Juice Labs',
  'Cracked Live',
  'Golden Era Rave',
  "Life's Jam",
  'Lightswitch',
  'The Melody SF',
  'KK Management',
  'Kickstand',
  'MTRNM',
  'Phase 3',
  'Stereo Punks'
];

export const clientShapeByName: Record<string, string> = {
  'BLOND:ISH': '/assets/client-shapes/shape-2.png',
  "Boots 'N Beats": '/assets/client-shapes/shape-3.png',
  FanPad: '/assets/client-shapes/shape-6.png',
  'C3 Management': '/assets/client-shapes/shape-5.png',
  'Juice Labs': '/assets/client-shapes/shape-5.png',
  'Cracked Live': '/assets/client-shapes/shape-3.png',
  'Golden Era Rave': '/assets/client-shapes/shape-4.png',
  "Life's Jam": '/assets/client-shapes/shape-6.png',
  Lightswitch: '/assets/client-shapes/shape-5.png',
  'The Melody SF': '/assets/client-shapes/shape-3.png',
  'KK Management': '/assets/client-shapes/shape-4.png',
  Kickstand: '/assets/client-shapes/shape-2.png',
  MTRNM: '/assets/client-shapes/shape-5.png',
  'Phase 3': '/assets/client-shapes/shape-5.png',
  'Stereo Punks': '/assets/client-shapes/shape-5.png'
};

export const clientRows = [
  clients.slice(0, 3),
  clients.slice(3, 5),
  clients.slice(5, 7),
  clients.slice(7, 10),
  clients.slice(10, 12),
  clients.slice(12, 15)
];

export const services = [
  {
    number: '01',
    title: 'Foundation',
    summary: 'Design the digital base layer so your team can work together and your business can grow.',
    artwork: '/assets/details/foundation.webp',
    rotation: 0
  },
  {
    number: '02',
    title: 'Workflows',
    summary: 'Understand how the business functions and create pathways to improvement.',
    artwork: '/assets/details/workflows.webp',
    rotation: 4.52
  },
  {
    number: '03',
    title: 'Operations',
    summary: 'Enable teams with hands-on support to increase output and efficiency.',
    artwork: '/assets/details/operations.webp',
    rotation: 11.23
  },
  {
    number: '04',
    title: 'Tooling',
    summary: 'Develop and manage technical solutions that act as force multipliers.',
    artwork: '/assets/details/tooling.webp',
    rotation: 8.48
  },
  {
    number: '05',
    title: 'Strategy',
    summary: 'Create scalable systems, structure, and stability from proven operating expertise.',
    artwork: '/assets/details/strategy.webp',
    rotation: 0
  },
  {
    number: '06',
    title: 'Growth',
    summary: 'Level up your business and focus on what matters.',
    artwork: '/assets/details/growth.webp',
    rotation: 11.93
  }
];

export const tickerLogos = [
  { name: "Boots 'N Beats", image: '/assets/ticker/boots-n-beats.png', ratio: 1 },
  { name: 'Stereo Punks', image: '/assets/ticker/stereo-punks.png', ratio: 1.46 },
  { name: 'Golden Era Rave', image: '/assets/ticker/golden-era-rave.png', ratio: 1.68 },
  { name: 'Laszewo', image: '/assets/ticker/laszewo.png', ratio: 4.34 },
  { name: 'FanPad', image: '/assets/ticker/fanpad.png', ratio: 4.2 },
  { name: 'Lightswitch', image: '/assets/ticker/lightswitch.png', ratio: 2.9 }
];

export const keepUpItems = [
  {
    type: 'Article',
    title: 'Why Every Team Needs an Operating System',
    summary: 'A clear operating layer keeps teams aligned when the show clock is moving.',
    image: '/assets/live-event-photo.png'
  },
  {
    type: 'Case Study',
    title: 'Custom Workflows for Production Teams',
    summary: 'How shared intake, approvals, and handoffs remove the hidden work between teams.',
    image: '/assets/hero-motion-card.png'
  },
  {
    type: 'Insights',
    title: 'Simplifying Operations Across the Live Industry',
    summary: 'Practical ways to turn scattered tools into one system people keep using.',
    image: '/assets/testimonial-crowd.png'
  }
];

export const testimonials = [
  {
    client: 'Stereo Punks',
    logo: '/assets/testimonials/stereo-punks-logo.png',
    image: '/assets/testimonials/stereo-punks-photo.webp',
    background: '#dbff4a',
    quote:
      'The system Half Dozen built was what finally let us delegate properly, with automations that actually moved work forward and kept everyone accountable and on time. Even after the engagement wrapped, we keep adding to what they started in a way that makes us 1% better every day.',
    name: 'Jake Clavette',
    title: 'Founder & CEO / Stereo Punks'
  },
  {
    client: "Boots 'N Beats",
    logo: '/assets/testimonials/boots-n-beats-logo.png',
    image: '/assets/testimonials/boots-n-beats-photo.webp',
    background: '#20d0fc',
    quote:
      'It takes a village to make it happen. Half Dozen built operating and project management systems that helped us make the jump from one show to a 100-city tour.',
    name: 'Ryan Sterne',
    title: "Co-Founder / Boots 'N Beats"
  },
  {
    client: 'MTRNM',
    logo: '/assets/testimonials/mtrnm-logo.png',
    image: '/assets/testimonials/mtrnm-photo.webp',
    background: '#dbff4a',
    quote:
      "The Half Dozen team helped transform our Notion from a data repository to a powerful operating system, empowering us to scale our systems and teams to execute at a higher, more efficient level than ever. The HD team was attentive, thoughtful, and truly a pleasure to work with. Their experience building these systems, especially for brands in the events and entertainment space made their insights extremely valuable. Could not recommend the HD team more highly - working with them was one of the highest ROI initiatives we've taken on as a business.",
    name: 'MTRNM Team',
    title: 'Client Operations'
  }
];

export const assetDefaults = {
  heroCard: '/assets/hero-motion-card.png',
  heroMotion: '/media/hero-motion.mp4',
  heroMotionPoster: '/assets/hero-motion-poster.jpg',
  heroFullbleedMotion: '/media/hero-fullbleed-motion.mp4',
  heroFullbleedPoster: '/assets/hero-fullbleed-poster.jpg',
  eventPhoto: '/assets/live-event-photo.png',
  testimonialPhoto: '/assets/testimonials/stereo-punks-photo.webp'
};
