import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

window.addEventListener('error', (e) => {
  document.body.innerHTML += '<div id="error-log" style="color:red;z-index:9999;position:absolute;top:0;">' + e.message + '</div>';
});
window.addEventListener('unhandledrejection', (e) => {
  document.body.innerHTML += '<div id="error-log" style="color:red;z-index:9999;position:absolute;top:0;">Promise: ' + String(e.reason) + '</div>';
});

import App from './App.tsx';
import './index.css';

// Security checks to prevent F12 and Context Menu
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
    (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
  ) {
    e.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
