"use client";

import { useEffect, useRef } from "react";
import styles from "./Land.module.css";

/**
 * Il telefono dell'apertura: un breve video registrato dall'agenda vera (arriva «Nuova prenotazione», il posto libero si riempie).
 * Parte da solo solo se il movimento non è ridotto e solo mentre è sullo schermo; altrimenti resta il primo fotogramma.
 */
export function PhoneDemo({ title }: { title: string }) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void el.play().catch(() => {});
      else el.pause();
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <video ref={video} className={styles.phoneVideo} muted loop playsInline preload="metadata" poster="/images/demo-agenda.jpg" aria-label={title} tabIndex={-1}>
      <source src="/images/demo-agenda.mp4" type="video/mp4" />
      <source src="/images/demo-agenda.webm" type="video/webm" />
    </video>
  );
}
