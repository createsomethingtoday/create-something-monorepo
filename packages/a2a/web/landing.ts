import './styles.css';
import './landing-motion.css';
import { startHandoffStudy } from './landing-motion';
import {startMotion} from './motion';
startMotion();
startHandoffStudy();

document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((button) => {
  button.hidden = false;
  button.addEventListener('click', async () => {
    const status = document.querySelector('#copy-status');
    try {
      await navigator.clipboard.writeText(button.dataset.copy ?? '');
      button.textContent = 'Copied';
      if (status) status.textContent = 'MCP endpoint copied.';
      window.setTimeout(() => { button.textContent = 'Copy'; }, 2200);
    } catch {
      if (status) status.textContent = 'Copy unavailable. Select the endpoint text to copy it.';
      button.textContent = 'Select text';
    }
  });
});
