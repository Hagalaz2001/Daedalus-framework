import { useEffect, useRef, useState } from "react";

/**
 * True while the element is near the viewport (or its scroll container). Artboards use it to mount an
 * iframe only when needed: an off-screen artboard costs a placeholder, not a document.
 */
export function useNearViewport<T extends HTMLElement>(margin = "400px 600px") {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setNear(entry?.isIntersecting ?? false), {
      rootMargin: margin,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [margin]);
  return { ref, near };
}
