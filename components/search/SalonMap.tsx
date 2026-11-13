"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { searchCopy } from "@/lib/copy/search";
import type { SalonView } from "./types";
import styles from "./Search.module.css";

type Props = { salons: SalonView[]; center: { lat: number; lng: number }; active: string | null; onPick: (slug: string | null) => void };

const pin = (n: number, on: boolean) =>
  L.divIcon({ className: "", html: `<span class="${styles.pin}${on ? ` ${styles.pinOn}` : ""}">${n}</span>`, iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -18] });

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** La mappa dei risultati (Leaflet + OpenStreetMap): un segnaposto numerato per salone, come nell'elenco. */
export function SalonMap({ salons, center, active, onPick }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const markers = useRef(new Map<string, { marker: L.Marker; n: number }>());

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const map = L.map(el, { scrollWheelZoom: false, attributionControl: true }).setView([center.lat, center.lng], 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(map);
    const store = markers.current;
    salons.forEach((s, i) => {
      const marker = L.marker([s.lat, s.lng], { icon: pin(i + 1, false), title: s.name, alt: s.name, keyboard: true })
        .addTo(map)
        .bindPopup(
          `<a class="${styles.popup}" href="/${encodeURIComponent(s.slug)}"><strong>${escapeHtml(s.name)}</strong><span>${escapeHtml(s.where)}</span><span>${escapeHtml([s.distance, s.price].filter(Boolean).join(" · "))}</span></a>`,
        );
      marker.on("popupopen", () => onPick(s.slug));
      marker.on("popupclose", () => onPick(null));
      store.set(s.slug, { marker, n: i + 1 });
    });
    // l'inquadratura: tutti i saloni e il punto cercato. Si rifà quando il riquadro cambia misura
    // (sul telefono la mappa nasce nascosta), finché chi guarda non la sposta da sé.
    let moved = false;
    const fit = () => {
      map.invalidateSize();
      if (moved || el.clientHeight === 0) return;
      if (salons.length === 0) return void map.setView([center.lat, center.lng], 12);
      const bounds = L.latLngBounds(salons.map((s) => [s.lat, s.lng] as [number, number])).extend([center.lat, center.lng]);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15, animate: false });
    };
    const touched = () => {
      moved = true;
    };
    el.addEventListener("pointerdown", touched);
    el.addEventListener("wheel", touched, { passive: true });
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      el.removeEventListener("pointerdown", touched);
      el.removeEventListener("wheel", touched);
      ro.disconnect();
      store.clear();
      map.remove();
    };
    // la mappa si ricostruisce solo se cambiano i risultati
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salons, center.lat, center.lng]);

  // il salone su cui si passa nell'elenco ha il segnaposto acceso
  useEffect(() => {
    markers.current.forEach(({ marker, n }, slug) => {
      marker.setIcon(pin(n, slug === active));
      marker.setZIndexOffset(slug === active ? 1000 : 0);
    });
  }, [active]);

  return <div ref={box} className={styles.map} role="region" aria-label={searchCopy.results.mapLabel} />;
}
