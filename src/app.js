import App from './App.svelte';

const app = new App({
    target: document.getElementById('demo'),
    data: {
      name: 'world'
    }
  });

window.app = app;