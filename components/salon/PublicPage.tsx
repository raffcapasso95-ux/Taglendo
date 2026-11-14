import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BookPick } from "./BookPick";
import { BottomBar } from "./BottomBar";
import { CookieConsent } from "./CookieConsent";
import { Gallery } from "./Gallery";
import { ShareButton } from "./ShareButton";
import { ShopBooking } from "./ShopBooking";
import { cx } from "@/components/ui/cx";
import { shopCopy } from "@/lib/copy/shop";
import { formatPrice } from "@/lib/dates/format";
import { citySlug } from "@/lib/places/comuni";
import type { PublicSalon } from "@/lib/public/load";
import { span } from "@/lib/rules/agenda";
import { formatMinutes, rangesOf } from "@/lib/rules/hours";
import { barbersLine, closedDaysLine, hoursLines, knowRows, mapsHref, phoneHref, statusPill, todayLine, zoneOf } from "@/lib/rules/publicPage";
import styles from "./Page.module.css";

type Props = {
  salon: PublicSalon;
  weekday: number;
  nowMin: number;
  today: string;
  bookingOn: boolean;
  /** Anteprima rimpicciolita (home saloni): niente barre fisse, niente cookie, link interni inerti. */
  preview?: boolean;
};

const copy = shopCopy.page;
const TONES = [styles.tone0, styles.tone1, styles.tone2];

const Svg = ({ size = 18, children }: { size?: number; children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const PhoneIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </Svg>
);
const PinIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Svg>
);
const ClockIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => Array.from(w)[0]?.toUpperCase() ?? "")
    .join("");

const first = (name: string) => Array.from(name.trim())[0]?.toUpperCase() ?? "";

/** La pagina del salone (ridisegno del sito, novembre 2026). Funziona anche senza foto e senza logo. */
export function PublicPage({ salon, weekday, nowMin, today, bookingOn, preview = false }: Props) {
  const tel = phoneHref(salon.phone);
  const pill = statusPill(salon.week, weekday, nowMin);
  const maps = mapsHref(salon.address, salon.area);
  const city = salon.city ?? salon.area?.split("·").pop()?.trim() ?? null;
  const zone = zoneOf(salon.area, city);
  const team = salon.members;
  const solo = team.length <= 1;
  const barbers = barbersLine(team.map((m) => m.name));
  const cancelLimit = salon.cancelOnline ? (salon.cancelLimitMin >= 1440 ? "24 ore" : "2 ore") : null;
  const photos = salon.photos.map((url, i) => ({ url, alt: `${salon.name}: foto ${i + 1}` }));
  const know = knowRows({ ...salon.know, cancelOnline: salon.cancelOnline, cancelLimitMin: salon.cancelLimitMin });
  const book = bookingOn ? "#prenota" : tel;
  const logoAlt = copy.logoAlt(salon.name);

  return (
    <div className={styles.page} id="top">
      <header className={styles.top}>
        <div className={cx(styles.wrap, styles.topRow)}>
          <a href="#top" className={styles.brand}>
            {salon.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={salon.logoUrl} alt="" width={40} height={40} className={styles.logoSm} />
            ) : (
              <span className={styles.initialsSm} aria-hidden="true">
                {initials(salon.name)}
              </span>
            )}
            <span className={styles.brandText}>
              <span className={styles.brandName}>{salon.name}</span>
              {salon.area ? <span className={styles.brandArea}>{salon.area}</span> : null}
            </span>
          </a>
          <nav className={styles.anchors} aria-label="Sezioni">
            <a href="#servizi">{copy.anchors.services}</a>
            {photos.length > 0 ? <a href="#foto">{copy.anchors.photos}</a> : null}
            {team.length > 0 ? <a href="#barbieri">{copy.anchors.team}</a> : null}
            {know.length > 0 ? <a href="#info">{copy.anchors.know}</a> : null}
            <a href="#dove">{copy.anchors.where}</a>
          </nav>
          <a href={tel} className={cx(styles.phoneChip, styles.press)} aria-label={shopCopy.callSr(salon.phone)}>
            <PhoneIcon size={16} />
            {salon.phone}
          </a>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.wrap}>
            <div className={styles.heroTop}>
              <p className={styles.crumb}>
                <Link href="/">{copy.crumbHome}</Link>
                {city ? (
                  <>
                    {" · "}
                    <Link href={`/barbieri/${citySlug(city)}`}>{copy.crumbCity(city)}</Link>
                  </>
                ) : null}
                {zone ? ` · ${zone}` : null}
              </p>
              {preview ? null : <ShareButton title={salon.name} className={cx(styles.ghost, styles.press)} labelClassName={styles.ghostLabel} />}
            </div>
            <div className={styles.head}>
              <div className={styles.ident}>
                {salon.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={salon.logoUrl} alt={logoAlt} width={128} height={128} className={styles.logoLg} />
                ) : (
                  <span className={styles.initialsLg} role="img" aria-label={logoAlt}>
                    {initials(salon.name)}
                  </span>
                )}
                <div className={styles.identText}>
                  <span className={cx(styles.pill, pill.open && styles.pillOpen)}>
                    <span className={styles.dot} aria-hidden="true" />
                    {pill.text}
                  </span>
                  <h1 className={styles.h1}>{salon.name}</h1>
                  {salon.description ? <p className={styles.lead}>{salon.description}</p> : null}
                  <div className={styles.facts}>
                    {salon.address ? (
                      <a href="#dove" className={styles.fact}>
                        <PinIcon />
                        <span>
                          <b>{salon.address}</b>
                          {salon.know.accessNote ? <small>{salon.know.accessNote}</small> : null}
                        </span>
                      </a>
                    ) : null}
                    <a href="#dove" className={styles.fact}>
                      <ClockIcon />
                      <span>
                        <b className={styles.num}>{todayLine(salon.week, weekday)}</b>
                        <small>{closedDaysLine(salon.week)}</small>
                      </span>
                    </a>
                    {team.length > 0 ? (
                      <a href="#barbieri" className={styles.fact}>
                        <span className={styles.faces} aria-hidden="true">
                          {team.slice(0, 3).map((m, i) => (
                            <i key={m.id} className={TONES[i % 3]}>
                              {first(m.name)}
                            </i>
                          ))}
                        </span>
                        <span>
                          <b>{barbers.count}</b>
                          <small>{barbers.names}</small>
                        </span>
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className={styles.actions}>
                {bookingOn ? (
                  <a href="#prenota" className={cx(styles.btnLight, styles.press)}>
                    {shopCopy.bookOnline}
                  </a>
                ) : null}
                <a href={tel} className={cx(bookingOn ? styles.btnOutline : styles.btnLight, styles.press)}>
                  <PhoneIcon />
                  <span className={styles.num}>{salon.phone}</span>
                </a>
                <a href="#dove" className={styles.directions}>
                  <PinIcon size={16} />
                  {copy.directions}
                </a>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.body}>
          <div className={cx(styles.wrap, styles.layout)}>
            <section id="servizi" className={cx(styles.section, styles.servicesArea)} aria-labelledby="h-servizi">
              <h2 className={styles.h2} id="h-servizi">
                {copy.services}
              </h2>
              <ul className={styles.services}>
                {salon.services.map((s) => (
                  <li key={s.id} className={styles.service}>
                    <span className={styles.serviceText}>
                      <b className={styles.serviceName}>{s.name}</b>
                      <span className={styles.serviceMeta}>{span(s.durationMin)}</span>
                    </span>
                    {salon.showPrices ? <b className={cx(styles.price, styles.num)}>{formatPrice(s.priceCents)}</b> : null}
                    {bookingOn ? (
                      <BookPick kind="service" id={s.id} className={cx(styles.bookBtn, styles.press)} label={copy.bookSr(s.name)}>
                        {copy.book}
                      </BookPick>
                    ) : null}
                  </li>
                ))}
              </ul>
              {!salon.showPrices && salon.services.length > 0 ? <p className={styles.note}>{copy.pricesHidden}</p> : null}
            </section>

            <aside id="prenota" className={styles.bookArea} aria-label={bookingOn ? shopCopy.bookOnline : copy.phoneTitle}>
              <div className={styles.sticky}>
                {bookingOn ? (
                  <ShopBooking
                    variant="card"
                    slug={salon.slug}
                    phone={salon.phone}
                    privacyHref="/privacy"
                    services={salon.services}
                    members={team.map((m) => ({ id: m.id, name: m.name }))}
                    showPrices={salon.showPrices}
                    today={today}
                    maxAdvanceDays={salon.maxAdvanceDays}
                    week={salon.week}
                    cancelLimit={cancelLimit}
                  />
                ) : (
                  <div className={styles.phoneCard}>
                    <h2 className={styles.phoneTitle}>{copy.phoneTitle}</h2>
                    <p className={styles.phoneText}>{copy.phoneText}</p>
                    <a href={tel} className={cx(styles.btn, styles.press)}>
                      <PhoneIcon />
                      <span className={styles.num}>{salon.phone}</span>
                    </a>
                  </div>
                )}
              </div>
            </aside>

            <div className={styles.rest}>
              {photos.length > 0 ? (
                <section id="foto" className={styles.section} aria-labelledby="h-foto">
                  <h2 className={styles.h2Gap} id="h-foto">
                    {copy.photos}
                  </h2>
                  <Gallery photos={photos} />
                </section>
              ) : null}

              {team.length > 0 ? (
                <section id="barbieri" className={styles.section} aria-labelledby="h-barbieri">
                  <h2 className={styles.h2Team} id="h-barbieri">
                    {copy.team}
                  </h2>
                  <ul className={styles.team}>
                    {team.map((m, i) => (
                      <li key={m.id} className={styles.barber}>
                        <span className={cx(styles.avatar, TONES[i % 3])} aria-hidden="true">
                          {first(m.name)}
                        </span>
                        <div>
                          <b className={styles.barberName}>{m.name}</b>
                          {m.bio ? <span className={styles.barberBio}>{m.bio}</span> : null}
                        </div>
                        {bookingOn && !solo ? (
                          <BookPick kind="barber" id={m.id} className={cx(styles.barberBtn, styles.press)}>
                            {shopCopy.team.bookWith(m.name)}
                          </BookPick>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {know.length > 0 ? (
                <section id="info" className={styles.section} aria-labelledby="h-info">
                  <h2 className={styles.h2Gap} id="h-info">
                    {copy.know}
                  </h2>
                  <dl className={styles.know}>
                    {know.map((k) => (
                      <div key={k.label} className={styles.knowRow}>
                        <dt>{k.label}</dt>
                        <dd>{k.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className={styles.knowNote}>{copy.knowNote}</p>
                </section>
              ) : null}

              <section id="dove" className={cx(styles.section, styles.where)} aria-labelledby="h-dove">
                <div>
                  <h2 className={styles.h2} id="h-dove">
                    {copy.where}
                  </h2>
                  {salon.address ? <p className={styles.address}>{salon.address}</p> : null}
                  {salon.know.accessNote ? <p className={styles.accessNote}>{salon.know.accessNote}</p> : null}
                  <div className={styles.whereBtns}>
                    {maps ? (
                      <a href={maps} className={cx(styles.btn, styles.press)} target="_blank" rel="noopener noreferrer">
                        <PinIcon />
                        {shopCopy.where.openMaps}
                      </a>
                    ) : null}
                    <a href={tel} className={cx(styles.btnLine, styles.press)}>
                      <PhoneIcon />
                      {copy.call}
                    </a>
                  </div>
                </div>
                <ul className={styles.hours} aria-label={shopCopy.where.hours}>
                  {hoursLines(salon.week, weekday).map((h, i) => {
                    const ranges = rangesOf(salon.week[[1, 2, 3, 4, 5, 6, 0][i]!]!);
                    return (
                      <li key={h.day} className={cx(styles.hoursRow, ranges.length === 0 && styles.hoursClosed, h.today && styles.hoursToday)}>
                        <span>
                          {h.day}
                          {h.today ? ` · ${copy.today}` : ""}
                        </span>
                        <span className={cx(styles.hoursTime, styles.num)}>
                          {ranges.length === 0 ? shopCopy.where.closed : ranges.map(([a, b]) => `${formatMinutes(a)}–${formatMinutes(b)}`).join(" · ")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={cx(styles.wrap, styles.footerRow)}>
          <span className={styles.footerLinks}>
            <span>
              © {salon.name}
              {city ? ` · ${city}` : ""}
            </span>
            <Link href="/privacy">{shopCopy.footer.privacy}</Link>
            {preview ? null : <CookieConsent buttonClassName={styles.footerButton} />}
          </span>
          <Link href="/" className={styles.powered}>
            <Image src="/brand/taglendo-icon.svg" alt="" width={20} height={20} />
            {shopCopy.footer.poweredBy} Taglendo
          </Link>
        </div>
      </footer>

      {preview ? null : (
        <BottomBar hideWhileVisible={bookingOn ? "prenota-card" : undefined}>
          <span className={styles.mbookText}>
            <b className={styles.mbookName}>{salon.name}</b>
            <span className={styles.mbookStatus}>
              <span className={cx(styles.dot, pill.open && styles.dotOpen)} aria-hidden="true" />
              {pill.short}
            </span>
          </span>
          <a href={book} className={cx(styles.mbookBtn, styles.press)}>
            {bookingOn ? copy.book : copy.call}
          </a>
        </BottomBar>
      )}
    </div>
  );
}
