import { useEffect } from "react";

/**
 * Revela elementos con el atributo data-reveal cuando entran al viewport
 * añadiendo la clase 'nc-revealed'. Usa transición CSS definida por las utilidades.
 */
export function useReveal() {
  useEffect(() => {
    const selector = "[data-reveal]";
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (elements.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("nc-revealed");
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );

    elements.forEach((el) => {
      el.classList.add("nc-reveal");
      obs.observe(el);
    });

    return () => obs.disconnect();
  }, []);
}


