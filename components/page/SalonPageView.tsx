"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import listino from "@/components/listino/Listino.module.css";
import rules from "@/components/settings/Rules.module.css";
import settings from "@/components/settings/Settings.module.css";
import { CloseIcon, GlobeIcon, OpenIcon, PlusIcon, StarIcon, TagIcon, ClockIcon } from "@/components/settings/SettingsIcons";
import { Field, ToastProvider, useToast } from "@/components/ui";
import { Button } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import field from "@/components/ui/Field.module.css";
import toggle from "@/components/ui/Toggle.module.css";
import { paginaCopy as copy } from "@/lib/copy/pagina";
import { addSalonPhoto, makeCover, removeSalonPhoto, saveSalonPage, setSalonSwitch, type PageResult } from "@/lib/page/actions";

type Initial = { name: string; area: string; description: string; phone: string; address: string; bookingOnline: boolean; showPrices: boolean };
type Photo = { id: string; url: string };

export function SalonPageView(props: { host: string; slug: string; initial: Initial; photos: Photo[] }) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function SwitchRow({ tone, icon, label, sub, on, onToggle }: { tone: 0 | 1 | 2; icon: ReactNode; label: string; sub: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={cx(settings.row, settings.rowButton, settings.pfSwitch)} onClick={onToggle}>
      <span className={cx(settings.icon, settings[`t${tone}` as "t0"])}>{icon}</span>
      <span className={settings.text}>
        <span className={settings.label}>{label}</span>
        <span className={settings.sub}>{sub}</span>
      </span>
      <span className={cx(toggle.track, settings.Toggle_track)} aria-hidden="true">
        <span className={cx(toggle.knob, settings.Toggle_knob)} />
      </span>
    </button>
  );
}

function Inner({ host, slug, initial, photos }: { host: string; slug: string; initial: Initial; photos: Photo[] }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [online, setOnline] = useState(initial.bookingOnline);
  const [prices, setPrices] = useState(initial.showPrices);
  const [errors, setErrors] = useState<Partial<Record<"name" | "phone" | "address" | "description" | "form", string>>>({});
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof Initial) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const dirty = (["name", "area", "description", "phone", "address"] as const).some((k) => form[k].trim() !== initial[k]);

  const run = (action: () => Promise<PageResult>, done?: string) =>
    start(async () => {
      setErrors({});
      const r = await action();
      if (!r.ok) return setErrors(r.field ? { [r.field]: r.error } : { form: r.error });
      if (done) toast(done);
      router.refresh();
    });

  const flip = (key: "booking_online" | "show_prices") => {
    const next = key === "booking_online" ? !online : !prices;
    (key === "booking_online" ? setOnline : setPrices)(next);
    start(async () => {
      const r = await setSalonSwitch(key, next);
      if (!r.ok) {
        (key === "booking_online" ? setOnline : setPrices)(!next);
        return setErrors({ form: r.error });
      }
      router.refresh();
    });
  };

  const upload = (file: File | undefined) => {
    if (!file) return;
    const data = new FormData();
    data.set("photo", file);
    run(() => addSalonPhoto(data));
    if (fileRef.current) fileRef.current.value = "";
  };

  const cover = photos[0]?.url ?? "/images/foto/hero.jpg";

  return (
    <main className={cx(listino.page, settings.page, settings.pfPage)}>
      <header className={listino.head}>
        <Link href="/salone" className={rules.back}>
          ‹ {copy.back}
        </Link>
        <h1 className={listino.title}>{copy.title}</h1>
      </header>

      <div className={settings.pfColumns}>
        <div className={settings.pfCol}>
          <a className={settings.pgPreview} href={`/${slug}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className={settings.pgPreviewImg} width={900} height={675} />
            <span className={settings.pgPreviewText}>
              <span className={settings.pgPreviewName}>{initial.name}</span>
              <span className={settings.pgPreviewUrl}>
                {host}/{slug}
              </span>
            </span>
            <span className={settings.pgPreviewOpen}>
              <OpenIcon />
              {copy.open}
            </span>
          </a>

          <section className={settings.section} aria-labelledby="pg-foto">
            <div className={settings.phHead}>
              <h2 className={settings.title} id="pg-foto">
                {copy.photos}
              </h2>
              <span className={settings.phCount}>{copy.count(photos.length)}</span>
            </div>
            <ul className={settings.phGrid}>
              {photos.map((p, i) => (
                <li key={p.id} className={settings.phTile}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" width={900} height={675} />
                  {i === 0 ? <span className={settings.phCover}>{copy.cover}</span> : null}
                  <span className={settings.phActions}>
                    {i > 0 ? (
                      <button type="button" className={settings.phButton} aria-label={copy.makeCover} disabled={pending} onClick={() => run(() => makeCover(p.id))}>
                        <StarIcon />
                      </button>
                    ) : null}
                    <button type="button" className={settings.phButton} aria-label={copy.remove} disabled={pending} onClick={() => run(() => removeSalonPhoto(p.id))}>
                      <CloseIcon />
                    </button>
                  </span>
                </li>
              ))}
              {photos.length < 8 ? (
                <li className={cx(settings.phTile, settings.phAddTile)}>
                  <button type="button" className={settings.phAdd} disabled={pending} onClick={() => fileRef.current?.click()}>
                    <PlusIcon />
                    <span>{copy.add}</span>
                    <span className={settings.phAddSub}>{copy.addSub}</span>
                  </button>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files?.[0])} />
                </li>
              ) : null}
            </ul>
            <p className={settings.phHint}>{copy.hint}</p>
          </section>
        </div>

        <div className={settings.pfCol}>
          <section className={settings.section} aria-labelledby="pg-desc">
            <h2 className={settings.title} id="pg-desc">
              {copy.present}
            </h2>
            <form
              className={settings.pfForm}
              onSubmit={(e) => {
                e.preventDefault();
                run(() => saveSalonPage(form), copy.saved);
              }}
            >
              <Field size="large" label={copy.name} name="name" value={form.name} onChange={(e) => set("name")(e.target.value)} maxLength={60} error={errors.name} />
              <Field size="large" label={copy.area} name="area" value={form.area} onChange={(e) => set("area")(e.target.value)} maxLength={80} />
              <div className={field.field}>
                <label className={field.label} htmlFor="pg-desc-t">
                  {copy.description}
                </label>
                <textarea
                  className={settings.textarea}
                  id="pg-desc-t"
                  rows={3}
                  maxLength={160}
                  value={form.description}
                  onChange={(e) => set("description")(e.target.value)}
                  aria-describedby="pg-desc-h"
                />
                <p className={field.hint} id="pg-desc-h">
                  {errors.description ?? copy.descriptionHint}
                </p>
              </div>
              <Field size="large" label={copy.phone} name="phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone")(e.target.value)} maxLength={20} error={errors.phone} />
              <Field size="large" label={copy.address} name="address" value={form.address} onChange={(e) => set("address")(e.target.value)} maxLength={120} error={errors.address} />
              {errors.form ? (
                <p className={field.error} role="alert">
                  {errors.form}
                </p>
              ) : null}
              <Button type="submit" size="large" disabled={pending || !dirty}>
                {copy.save}
              </Button>
            </form>
          </section>

          <section className={settings.section} aria-labelledby="pg-pren">
            <h2 className={settings.title} id="pg-pren">
              {copy.booking}
            </h2>
            <div className={settings.group}>
              <SwitchRow tone={2} icon={<GlobeIcon />} label={copy.online} sub={copy.onlineSub} on={online} onToggle={() => flip("booking_online")} />
              <SwitchRow tone={1} icon={<TagIcon />} label={copy.prices} sub={copy.pricesSub} on={prices} onToggle={() => flip("show_prices")} />
              <Link className={settings.row} href="/listino">
                <span className={cx(settings.icon, settings.t0)}>
                  <ClockIcon />
                </span>
                <span className={settings.text}>
                  <span className={settings.label}>{copy.services}</span>
                  <span className={settings.sub}>{copy.servicesSub}</span>
                </span>
                <span className={settings.chev} aria-hidden="true">
                  ›
                </span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
