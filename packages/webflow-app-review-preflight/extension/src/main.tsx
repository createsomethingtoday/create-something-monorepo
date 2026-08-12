import { createRoot } from 'react-dom/client';
import { App } from './App';
import { createPreflightApi } from './api';

const root = document.getElementById('root');
if (!root) throw new Error('App Review Preflight root element is missing.');

createRoot(root).render(<App api={createPreflightApi()} />);
