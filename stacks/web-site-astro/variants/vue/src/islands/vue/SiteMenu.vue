<script setup lang="ts">
import { Button, Dialog, DialogClose, DialogTitle, DialogTrigger, IconButton, SheetContent } from '@app/ui-vue'
import { Menu } from '@lucide/vue'

// Phone navigation: a side sheet with the same links. Hidden from md up (the header shows them inline).
defineProps<{ nav: { href: string; label: string; current: boolean }[]; appUrl: string }>()
</script>

<template>
  <Dialog>
    <DialogTrigger as-child>
      <IconButton label="Menu" class="md:hidden"><Menu /></IconButton>
    </DialogTrigger>
    <SheetContent>
      <DialogTitle>Menu</DialogTitle>
      <nav aria-label="Mobile" class="flex flex-col">
        <DialogClose v-for="n in nav" :key="n.href" as-child>
          <a :href="n.href" :aria-current="n.current ? 'page' : undefined" class="flex min-h-12 items-center border-b border-border text-lg font-medium aria-[current=page]:text-primary">{{ n.label }}</a>
        </DialogClose>
      </nav>
      <Button as-child size="lg" class="mt-4"><a :href="appUrl">Open the app</a></Button>
    </SheetContent>
  </Dialog>
</template>
