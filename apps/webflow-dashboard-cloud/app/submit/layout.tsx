import './submit.css';
import { wfVisualSans } from './wf-visual-sans';

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${wfVisualSans.variable} submit-route`}>{children}</div>;
}
