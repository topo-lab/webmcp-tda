import './style.css';
import { computeClient } from './tda/computeClient';
import { mountApp } from './ui/app';
import { keepWebMcpRegistered } from './webmcp/register';
import { createWebMcpTools } from './webmcp/tools';

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
