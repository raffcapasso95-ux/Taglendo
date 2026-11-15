"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { searchCopy } from "@/lib/copy/search";
import type { SalonView } from "./types";
import styles from "./Cerca.module.css";

const copy = searchCopy.map;

type Props = {
  salons: SalonView[];
  center: { lat: number; lng: number };
  radiusKm: number;
  /** «Vicino a me»: il punto è la posizione di chi cerca, e si mostra «Tu sei qui». */
  near: boolean;
  /** Il salone su cui si passa (nell'elenco o sulla mappa). */
  hovered: string | null;
  /** Il salone scelto: la sua scheda sta in basso. */
  selected: string | null;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string | null) => void;
  /** «Cerca in questa zona»: il centro della mappa dove l'ha lasciata chi guarda. */
  onSearchZone: (center: { lat: number; lng: number }) => void;
  searchingZone: boolean;
  toast: string | null;
};

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** L'etichetta sulla mappa: il primo orario libero («17:30»); bordo verde se oggi, tratteggiato se da domani. Al passaggio e alla scelta compare anche il nome. */
const pill = (s: SalonView, state: "" | "hov" | "on") => {
  const cls = [styles.pin, s.pin && !s.pin.today ? styles.pinTom : "", state === "hov" ? styles.pinHov : "", state === "on" ? styles.pinOn : ""].filter(Boolean).join(" ");
  return L.divIcon({
    className: "",
    html: `<span class="${cls}"><i class="${styles.pdot}"></i><span>${escapeHtml(s.pin?.text ?? s.name)}</span><span class="${styles.pname}">· ${escapeHtml(s.name)}</span></span>`,
    iconSize: undefined, // la misura la decide il testo
    iconAnchor: [0, 0],
  });
};

const Icon = ({ d }: { d: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/**
 * La mappa dei risultati (Leaflet + OpenStreetMap, colori attenuati): un'etichetta per salone con il primo orario libero,
 * controlli + / − / «torna alla mia posizione», legenda, e «Cerca in questa zona» dopo aver spostato la mappa.
 */
export function SalonMap({ salons, center, radiusKm, near, hovered, selected, onHover, onSelect, onSearchZone, searchingZone, toast }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const home = useRef<() => void>(() => {});
  const markers = useRef(new Map<string, { marker: L.Marker; salon: SalonView }>());
  const handlers = useRef({ onHover, onSelect });
  // i gestori dei segnaposto leggono sempre le funzioni più recenti
  useEffect(() => {
    handlers.current = { onHover, onSelect };
  });
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    setMoved(false);
    const map = L.map(el, { scrollWheelZoom: false, attributionControl: true, zoomControl: false }).setView([center.lat, center.lng], 12);
    mapRef.current = map;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      className: styles.tiles, // colori attenuati, in tono con il sito
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(map);
    if (radiusKm > 0) L.circle([center.lat, center.lng], { radius: radiusKm * 1000, interactive: false, className: styles.zone }).addTo(map);
    if (near) L.marker([center.lat, center.lng], { icon: L.divIcon({ className: "", html: `<span class="${styles.me}"></span>`, iconSize: [0, 0] }), interactive: false, keyboard: false, title: copy.here }).addTo(map);
    const store = markers.current;
    for (const s of salons) {
      const marker = L.marker([s.lat, s.lng], { icon: pill(s, ""), title: copy.pinAria(s.name, s.pin?.text ?? null), alt: s.name, keyboard: true, riseOnHover: true }).addTo(map);
      marker.on("click", () => handlers.current.onSelect(s.slug));
      marker.on("mouseover", () => handlers.current.onHover(s.slug));
      marker.on("mouseout", () => handlers.current.onHover(null));
      store.set(s.slug, { marker, salon: s });
    }
    // l'inquadratura: tutti i saloni e il punto cercato. Si rifà quando il riquadro cambia misura
    // (sul telefono la mappa nasce nascosta), finché chi guarda non la sposta da sé.
    let touched = false;
    let programmatic = false;
    const fit = () => {
      map.invalidateSize();
      if (touched || el.clientHeight === 0) return;
      programmatic = true;
      if (salons.length === 0) map.setView([center.lat, center.lng], 12, { animate: false });
      else map.fitBounds(L.latLngBounds(salons.map((s) => [s.lat, s.lng] as [number, number])).extend(radiusKm > 0 ? [center.lat, center.lng] : [salons[0].lat, salons[0].lng]), { padding: [64, 64], maxZoom: 15, animate: false });
      programmatic = false;
    };
    home.current = () => {
      touched = false;
      setMoved(false);
      fit();
    };
    // «Cerca in questa zona» compare solo se è chi guarda a spostare o ingrandire
    const user = () => {
      if (programmatic) return;
      touched = true;
      setMoved(true);
    };
    map.on("dragend", user);
    map.on("zoomend", user);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      ro.disconnect();
      store.clear();
      mapRef.current = null;
      map.remove();
    };
    // la mappa si ricostruisce solo se cambiano i risultati
  }, [salons, center.lat, center.lng, radiusKm, near]);

  // passaggio e scelta: l'etichetta si accende e sta sopra le altre
  useEffect(() => {
    markers.current.forEach(({ marker, salon }, slug) => {
      const state = slug === selected ? "on" : slug === hovered ? "hov" : "";
      marker.setIcon(pill(salon, state));
      marker.setZIndexOffset(state === "on" ? 2000 : state === "hov" ? 1000 : 0);
    });
  }, [hovered, selected, salons]);

  // scelto un salone dall'elenco, la mappa lo porta in vista
  useEffect(() => {
    const m = selected ? markers.current.get(selected) : null;
    const map = mapRef.current;
    if (m && map && !map.getBounds().pad(-0.15).contains(m.marker.getLatLng())) map.panTo(m.marker.getLatLng(), { animate: true });
  }, [selected]);

  const zoom = (by: number) => mapRef.current?.setZoom(mapRef.current.getZoom() + by);

  return (
    <>
      <div ref={box} className={styles.map} role="region" aria-label={searchCopy.results.mapLabel} />
      <p className={styles.legend} aria-hidden="true">
        <span>
          <i /> {copy.free}
        </span>
        <span>
          <i className={styles.legendTom} /> {copy.freeLater}
        </span>
      </p>
      <div className={styles.ctl}>
        <button type="button" aria-label={copy.zoomIn} onClick={() => zoom(1)}>
          <Icon d="M12 5v14M5 12h14" />
        </button>
        <button type="button" aria-label={copy.zoomOut} onClick={() => zoom(-1)}>
          <Icon d="M5 12h14" />
        </button>
        <button type="button" aria-label={copy.locate} onClick={() => home.current()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
            <circle cx="12" cy="12" r="7.5" />
          </svg>
        </button>
      </div>
      {toast ? (
        <p className={styles.toast} role="status">
          {toast}
        </p>
      ) : moved ? (
        <button type="button" className={styles.zoneBtn} disabled={searchingZone} onClick={() => mapRef.current && onSearchZone(mapRef.current.getCenter())}>
          {searchingZone ? copy.zoneBusy : copy.zone}
        </button>
      ) : null}
    </>
  );
}
