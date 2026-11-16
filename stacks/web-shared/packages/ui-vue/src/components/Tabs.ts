import { TabsContent as RekaContent, TabsList as RekaList, TabsRoot, TabsTrigger as RekaTrigger } from 'reka-ui'
import { defineComponent, h } from 'vue'
import { cn } from '../lib/cn'

export const Tabs = TabsRoot

export const TabsList = defineComponent({
  name: 'TabsList',
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => h(RekaList, { ...attrs, class: cn('flex gap-1 border-b border-border', attrs['class'] as never) }, slots['default'])
  },
})

export const TabsTrigger = defineComponent({
  name: 'TabsTrigger',
  inheritAttrs: false,
  props: { value: { type: String, required: true } },
  setup(props, { slots, attrs }) {
    return () =>
      h(
        RekaTrigger,
        {
          ...attrs,
          value: props.value,
          class: cn(
            '-mb-px inline-flex h-11 items-center border-b-2 border-transparent px-4 text-[0.95rem] font-medium text-text-muted transition-colors hover:text-text data-[state=active]:border-primary data-[state=active]:text-text',
            attrs['class'] as never,
          ),
        },
        slots['default'],
      )
  },
})

export const TabsContent = defineComponent({
  name: 'TabsContent',
  inheritAttrs: false,
  props: { value: { type: String, required: true } },
  setup(props, { slots, attrs }) {
    return () => h(RekaContent, { ...attrs, value: props.value, class: cn('pt-6', attrs['class'] as never) }, slots['default'])
  },
})
