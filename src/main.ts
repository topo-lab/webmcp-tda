import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './style.css';
import { installTrustedWorkerPolicy } from './tda/trustedWorker';
import { computeClient } from './tda/computeClient';
import { mountApp } from './ui/app';
import { keepWebMcpRegistered } from './webmcp/register';
import { createWebMcpTools } from './webmcp/tools';

installTrustedWorkerPolicy();

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app root.');

const unmountApp = mountApp(root);
const stopWebMcp = keepWebMcpRegistered(createWebMcpTools());

// `pagehide` fires for every way a page can go away. A page stored in the back/forward cache must keep
// working when it is restored, so only a page that is really being discarded is torn down.
window.addEventListener('pagehide', (event) => {
  if (event.persisted) return;
  unmountApp();
  stopWebMcp();
  computeClient.dispose();
});
