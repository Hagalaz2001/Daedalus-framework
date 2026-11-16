import { defineComponent, h } from 'vue'
import { RouterLink as Link } from 'vue-router'

/** Adapts vue-router's RouterLink to the kit's `linkAs` prop (AppShell), which passes `href`. */
export const RouterLink = defineComponent({
  name: 'AppRouterLink',
  inheritAttrs: false,
  props: { href: { type: String, required: true } },
  setup(props, { slots, attrs }) {
    return () => h(Link, { ...attrs, to: props.href }, slots)
  },
})
