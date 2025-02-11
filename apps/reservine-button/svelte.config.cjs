const sveltePreprocess = require('svelte-preprocess');

module.exports = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: sveltePreprocess({

  }),
  compilerOptions: {
    customElement: false, // for some reason - when set to true, the bundle has over 1.5mb????!!
    css: "injected",
  }
};
