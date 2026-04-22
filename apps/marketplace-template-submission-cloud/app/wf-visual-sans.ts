import localFont from 'next/font/local';

export const wfVisualSans = localFont({
  src: [
    {
      path: '../../../packages/webflow-dashboard/static/fonts/WFVisualSans-RegularText.woff',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../../packages/webflow-dashboard/static/fonts/WFVisualSans-Medium.woff',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../../packages/webflow-dashboard/static/fonts/WFVisualSans-SemiBoldText.woff',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-wf-visual-sans',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
});
