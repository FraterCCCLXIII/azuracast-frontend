import { useEffect, useRef } from "react";

/**
 * Tracks the previously-selected glass variant on a `.switcher` element so
 * that CSS can animate the transition between variants.
 *
 * Mirrors the vanilla JS pattern:
 *   const switcher = document.querySelector(".switcher");
 *   trackPrevious(switcher);
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   useGlassSwitcher(ref);
 *   <div ref={ref} className="switcher"> ... radio inputs with c-option="light|dark|frost" ... </div>
 */
export function useGlassSwitcher(ref: React.RefObject<HTMLElement | null>) {
  const previousValueRef = useRef<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const radios = el.querySelectorAll<HTMLInputElement>('input[type="radio"]');

    const initiallyChecked = el.querySelector<HTMLInputElement>(
      'input[type="radio"]:checked'
    );
    if (initiallyChecked) {
      previousValueRef.current =
        initiallyChecked.getAttribute("c-option") ?? null;
      if (previousValueRef.current) {
        el.setAttribute("c-previous", previousValueRef.current);
      }
    }

    const cleanups: Array<() => void> = [];

    radios.forEach((radio) => {
      const handler = () => {
        if (radio.checked) {
          el.setAttribute("c-previous", previousValueRef.current ?? "");
          previousValueRef.current = radio.getAttribute("c-option");
        }
      };
      radio.addEventListener("change", handler);
      cleanups.push(() => radio.removeEventListener("change", handler));
    });

    return () => cleanups.forEach((fn) => fn());
  }, [ref]);
}
