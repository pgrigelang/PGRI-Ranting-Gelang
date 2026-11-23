import { JSDOM } from 'jsdom';
JSDOM.fromURL("http://localhost:3000", { runScripts: "dangerously", resources: "usable" }).then(dom => {
  dom.window.addEventListener('error', e => console.log('JSDOM ERROR:', e.error));
  setTimeout(() => console.log('Done.'), 5000);
});
