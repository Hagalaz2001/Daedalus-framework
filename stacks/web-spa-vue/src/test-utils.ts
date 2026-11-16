import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { render } from '@app/ui-vue/testing'
import { createPinia } from 'pinia'
import type { Component } from 'vue'
import { createMemoryHistory } from 'vue-router'
import { makeRouter } from '@/app/router'

/** Render a screen with a fresh query cache (no retries), Pinia and a memory router. */
export async function renderScreen(component: Component, route = '/') {
  const router = makeRouter(createMemoryHistory())
  await router.push(route)
  await router.isReady()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(component, { global: { plugins: [createPinia(), [VueQueryPlugin, { queryClient }], router] } })
}
