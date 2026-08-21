export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@pinia/nuxt', '@nuxt/eslint'],
  css: ['~/assets/css/style.css'],
  vite: {
    build: {
      target: ['safari14', 'ios14', 'es2020', 'chrome87', 'firefox78']
    },
    esbuild: {
      target: ['safari14', 'ios14', 'es2020']
    }
  },
  app: {
    head: {
      title: 'Matrix Game',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'theme-color', content: '#0b1120' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600;700&family=Orbitron:wght@600;800;900&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap'
        }
      ]
    }
  }
})
