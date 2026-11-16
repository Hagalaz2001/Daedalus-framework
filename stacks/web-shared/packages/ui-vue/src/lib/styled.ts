import { h, type FunctionalComponent } from 'vue'
import { cn } from './cn'

/** A tag with base classes; the caller's `class` is merged with tailwind-merge so overrides win. */
export const styled =
  (tag: string, base: string): FunctionalComponent =>
  (_props, { slots, attrs }) =>
    h(tag, { ...attrs, class: cn(base, attrs['class'] as never) }, slots['default']?.())
