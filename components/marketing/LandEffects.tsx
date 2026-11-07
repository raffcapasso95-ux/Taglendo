"use client";

import { useEffect } from "react";

/**
 * Il movimento della home, tutto in un punto: entrata a cascata del titolo, sezioni che compaiono allo scorrimento (una volta sola),
 * e la barra «Prova gratis» del telefono, che c'è solo dopo l'apertura e fino alla chiusura.
 * Con `prefers-reduced-motion` non parte niente: la pagina si legge ferma.
 */
export function LandEffects() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>("[data-land]");
    if (!page) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!calm && "IntersectionObserver" in window) page.setAttribute("data-motion", "on");

    const bar = page.querySelector<HTMLElement>("[data-land-bar]");
    const hero = page.querySelector<HTMLElement>("[data-land-hero]");
    const onScroll = () => {
      const end = page.querySelector("#inizia")?.getBoundingClientRect().top ?? 1e9;
      const past = hero ? window.scrollY > hero.offsetHeight - 80 && end > window.innerHeight - 40 : false;
      bar?.setAttribute("data-hidden", past ? "false" : "true");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const observers: IntersectionObserver[] = [];
    if (!calm && "IntersectionObserver" in window) {
      const reveal = new IntersectionObserver(
        (entries) => {
          for (const e of entries)
            if (e.isIntersecting) {
              e.target.setAttribute("data-in", "true");
              reveal.unobserve(e.target);
            }
        },
        { rootMargin: "0px 0px -12% 0px" },
      );
      page.querySelectorAll("[data-reveal]").forEach((el) => reveal.observe(el));
      observers.push(reveal);
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      observers.forEach((o) => o.disconnect());
    };
  }, []);
  return null;
}
