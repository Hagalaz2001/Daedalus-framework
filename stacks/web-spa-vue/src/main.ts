import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { makeRouter } from './app/router'
import './index.css'

createApp(App)
  .use(createPinia())
  .use(VueQueryPlugin, { queryClientConfig: { defaultOptions: { queries: { retry: 1, staleTime: 15_000 } } } })
  .use(makeRouter())
  .mount('#app')
