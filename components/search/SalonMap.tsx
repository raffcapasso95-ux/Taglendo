"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { searchCopy } from "@/lib/copy/search";
import type { SalonView } from "./types";
import styles from "./Search.module.css";

type Props = { salons: SalonView[]; center: { lat: number; lng: number }; active: string | null; onPick: (slug: string | null) => void };

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** L'etichetta sulla mappa: il prezzo «da …», o il nome se il salone nasconde i prezzi. */
const label = (s: SalonView) => s.price ?? s.name;

const pill = (s: SalonView, on: boolean) =>
  L.divIcon({
    className: "",
    html: `<span class="${styles.pin}${on ? ` ${styles.pinOn}` : ""}">${escapeHtml(label(s))}</span>`,
    iconSize: undefined, // la misura la decide il testo
    iconAnchor: [0, 0],
  });

/** Il riquadro che si apre toccando un salone: foto, nome, zona, distanza, «Vedi il salone». */
function popupHtml(s: SalonView): string {
  const photo = s.coverUrl
    ? `<img src="${escapeHtml(s.coverUrl)}" alt="" class="${styles.popupImg}" loading="lazy" />`
    : `<span class="${styles.popupImg} ${styles.popupNoPhoto}">${escapeHtml(s.name.charAt(0))}</span>`;
  const meta = [s.distance, s.price].filter(Boolean).join(" · ");
  return `<a class="${styles.popup}" href="/${encodeURIComponent(s.slug)}">${photo}<span class="${styles.popupText}"><strong>${escapeHtml(s.name)}</strong><span>${escapeHtml(s.where)}</span><span>${escapeHtml(meta)}</span><span class="${styles.popupCta}">${escapeHtml(s.bookingOnline ? searchCopy.card.book : searchCopy.card.see)}</span></span></a>`;
}

/** La mappa dei risultati (Leaflet + OpenStreetMap, colori attenuati): un'etichetta per salone. */
export function SalonMap({ salons, center, active, onPick }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const markers = useRef(new Map<string, { marker: L.Marker; salon: SalonView }>());

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const map = L.map(el, { scrollWheelZoom: false, attributionControl: true, zoomControl: false }).setView([center.lat, center.lng], 12);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      className: styles.tiles, // colori attenuati, in tono con il sito
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(map);
    const store = markers.current;
    for (const s of salons) {
      const marker = L.marker([s.lat, s.lng], { icon: pill(s, false), title: s.name, alt: s.name, keyboard: true, riseOnHover: true })
        .addTo(map)
        .bindPopup(popupHtml(s), { className: styles.popupWrap, closeButton: false, offset: [0, -6], maxWidth: 280, minWidth: 240 });
      marker.on("popupopen", () => onPick(s.slug));
      marker.on("popupclose", () => onPick(null));
      store.set(s.slug, { marker, salon: s });
    }
    // l'inquadratura: tutti i saloni e il punto cercato. Si rifà quando il riquadro cambia misura
    // (sul telefono la mappa nasce nascosta), finché chi guarda non la sposta da sé.
    let moved = false;
    const fit = () => {
      map.invalidateSize();
      if (moved || el.clientHeight === 0) return;
      if (salons.length === 0) return void map.setView([center.lat, center.lng], 12);
      const bounds = L.latLngBounds(salons.map((s) => [s.lat, s.lng] as [number, number])).extend([center.lat, center.lng]);
      map.fitBounds(bounds, { padding: [56, 56], maxZoom: 15, animate: false });
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

  // il salone su cui si passa nell'elenco ha l'etichetta accesa e sta sopra le altre
  useEffect(() => {
    markers.current.forEach(({ marker, salon }, slug) => {
      marker.setIcon(pill(salon, slug === active));
      marker.setZIndexOffset(slug === active ? 1000 : 0);
    });
  }, [active]);

  return <div ref={box} className={styles.map} role="region" aria-label={searchCopy.results.mapLabel} />;
}
