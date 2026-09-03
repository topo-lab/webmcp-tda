import './style.css';
import { computeClient } from './tda/computeClient';
import { mountApp } from './ui/app';
import { registerWebMcpTools } from './webmcp/register';
import { createWebMcpTools } from './webmcp/tools';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app root.');

mountApp(root);
const unregisterTools = registerWebMcpTools(createWebMcpTools());

window.addEventListener('beforeunload', () => {
  unregisterTools();
  computeClient.dispose();
}, { once: true });
