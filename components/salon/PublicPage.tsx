import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BottomBar } from "./BottomBar";
import { CookieConsent } from "./CookieConsent";
import { Gallery } from "./Gallery";
import { PickBarber } from "./PickBarber";
import { ShopBooking } from "./ShopBooking";
import { shopCopy as copy } from "@/lib/copy/shop";
import { formatPrice } from "@/lib/dates/format";
import type { PublicSalon } from "@/lib/public/load";
import { span } from "@/lib/rules/agenda";
import { hoursLines, mapsHref, openSign, phoneHref } from "@/lib/rules/publicPage";
import { fromPriceCents } from "@/lib/rules/publicPage";
import { rangesOf, formatMinutes } from "@/lib/rules/hours";
import flow from "@/components/agenda/Flow.module.css";
import { cx } from "@/components/ui/cx";
import styles from "./Shop.module.css";

type Props = { salon: PublicSalon; weekday: number; nowMin: number; today: string; bookingOn: boolean };

const Svg = ({ size = 18, children }: { size?: number; children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const PhoneIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M5 4h3l1.5 4-2 1.3a11 11 0 0 0 7.2 7.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </Svg>
);
const PinIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Svg>
);

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => Array.from(w)[0]?.toUpperCase() ?? "")
    .join("");

/** La pagina del salone (ridisegno novembre 2026): una poltrona, prezzi nascosti e «solo telefono» sono varianti della stessa pagina. */
export function PublicPage({ salon, weekday, nowMin, today, bookingOn }: Props) {
  const tel = phoneHref(salon.phone);
  const sign = openSign(salon.week, weekday, nowMin);
  const signText = sign.line ? `${sign.title} · ${sign.line}` : sign.title;
  const barSign = sign.line ? `${sign.title} ${sign.line}` : sign.title;
  const from = fromPriceCents(salon.services);
  const showPrices = salon.showPrices;
  const maps = mapsHref(salon.address, salon.area);
  const city = salon.area?.split("·").pop()?.trim();
  const team = salon.members.length;
  const solo = team <= 1;
  const cancelLimit = salon.cancelOnline ? (salon.cancelLimitMin >= 1440 ? "24 ore" : "2 ore") : null;
  const todayHours = salon.week[weekday]!;
  const todayRanges = rangesOf(todayHours);
  const photos = salon.photos.map((url, i) => ({ url, alt: `${salon.name}: foto ${i + 1}` }));
  const cta = bookingOn ? { href: "#prenota", header: copy.book, hero: copy.bookOnline } : { href: tel, header: copy.call, hero: copy.callToBook };

  return (
    <div className={styles.page} id="top">
      <header className={styles.header}>
        <div className={`${styles.wrap} ${styles.headerRow}`}>
          <a href="#top" className={styles.brand}>
            {salon.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={salon.logoUrl} alt="" width={40} height={40} className={styles.brandLogo} />
            ) : (
              <span className={styles.brandMark} aria-hidden="true">
                {initials(salon.name)}
              </span>
            )}
            <span className={styles.brandText}>
              <span className={styles.brandName}>{salon.name}</span>
              {salon.area ? <span className={styles.brandArea}>{salon.area}</span> : null}
            </span>
          </a>
          <nav className={styles.nav} aria-label="Sezioni">
            <a href="#prenota" className={styles.navLink}>
              {copy.nav.prices}
            </a>
            {photos.length > 0 ? (
              <a href="#foto" className={styles.navLink}>
                {copy.nav.photos}
              </a>
            ) : null}
            {team > 0 ? (
              <a href="#barbieri" className={styles.navLink}>
                {solo ? copy.nav.teamOne : copy.nav.team}
              </a>
            ) : null}
            <a href="#dove" className={styles.navLink}>
              {copy.nav.where}
            </a>
          </nav>
          <div className={styles.headerActions}>
            <a href={tel} className={styles.call} aria-label={copy.callSr(salon.phone)}>
              <PhoneIcon />
              <span className={styles.callText}>{salon.phone}</span>
            </a>
            <a href={cta.href} className={styles.cta}>
              {cta.header}
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={`${styles.wrap} ${styles.heroInner}`}>
            <div className={styles.heroText}>
              <span className={styles.status}>
                <span className={styles.statusDot} aria-hidden="true" />
                {signText}
              </span>
              <h1 className={styles.title}>{salon.name}</h1>
              <p className={styles.lead}>{salon.description ?? copy.heroLeadFallback}</p>
              <div className={styles.heroButtons}>
                <a href={cta.href} className={styles.heroCta}>
                  {!bookingOn ? <PhoneIcon /> : null}
                  {cta.hero}
                </a>
                <a href="#prenota" className={styles.heroGhost}>
                  {showPrices ? copy.seeServices : copy.seeServicesNoPrices}
                </a>
              </div>
            </div>
            <div className={styles.heroCard}>
              {salon.area ? <span className={styles.heroCardTitle}>{salon.area}</span> : null}
              <ul className={styles.facts}>
                {salon.address ? (
                  <li className={styles.fact}>
                    <span className={styles.factIcon}>
                      <PinIcon />
                    </span>
                    <span className={styles.factText}>
                      <span className={styles.factLabel}>{copy.facts.address}</span>
                      <span className={styles.factValue}>{salon.address}</span>
                    </span>
                  </li>
                ) : null}
                <li className={styles.fact}>
                  <span className={styles.factIcon}>
                    <Svg>
                      <circle cx="12" cy="12" r="8.5" />
                      <path d="M12 7.5V12l3 2" />
                    </Svg>
                  </span>
                  <span className={styles.factText}>
                    <span className={styles.factLabel}>{copy.facts.today}</span>
                    <span className={styles.factValue}>{todayRanges.length ? todayRanges.map(([a, b]) => `${formatMinutes(a)}–${formatMinutes(b)}`).join(" · ") : copy.where.closed}</span>
                  </span>
                </li>
                {showPrices && from !== null ? (
                  <li className={styles.fact}>
                    <span className={styles.factIcon}>
                      <Svg>
                        <path d="M3.5 12.5V5a1.5 1.5 0 0 1 1.5-1.5h7.5l8 8-9 9z" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                      </Svg>
                    </span>
                    <span className={styles.factText}>
                      <span className={styles.factLabel}>{copy.facts.prices}</span>
                      <span className={styles.factValue}>{copy.facts.from(formatPrice(from))}</span>
                    </span>
                  </li>
                ) : !showPrices && team > 0 ? (
                  <li className={styles.fact}>
                    <span className={styles.factIcon}>
                      <Svg>
                        <circle cx="12" cy="8" r="3.8" />
                        <path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6" />
                      </Svg>
                    </span>
                    <span className={styles.factText}>
                      <span className={styles.factLabel}>{copy.facts.barbers}</span>
                      <span className={styles.factValue}>{team}</span>
                    </span>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </section>

        {photos.length > 0 ? (
          <section id="foto" className={`${styles.section} ${styles.gallerySection}`}>
            <div className={styles.wrap}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.eyebrow}>{copy.gallery.eyebrow}</span>
                  <h2 className={styles.h2}>{copy.gallery.title}</h2>
                </div>
                <p className={styles.sectionNote}>{copy.gallery.note(photos.length)}</p>
              </div>
              <Gallery photos={photos} />
            </div>
          </section>
        ) : null}

        <section id="prenota" className={`${styles.section} ${styles.bookSection}`}>
          <div className={styles.wrap}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.eyebrow}>{bookingOn ? copy.booking.eyebrow : copy.phone.eyebrow}</span>
                <h2 className={styles.h2}>{bookingOn ? copy.booking.title : copy.phone.title}</h2>
              </div>
              <p className={styles.sectionNote}>{bookingOn ? copy.booking.note : copy.phone.note}</p>
            </div>
            {bookingOn ? (
              <ShopBooking
                slug={salon.slug}
                phone={salon.phone}
                privacyHref="/privacy"
                services={salon.services}
                members={salon.members.map((m) => ({ id: m.id, name: m.name }))}
                showPrices={showPrices}
                today={today}
                maxAdvanceDays={salon.maxAdvanceDays}
                week={salon.week}
                cancelLimit={cancelLimit}
              />
            ) : (
              <div className={`${styles.bookLayout} ${styles.bookLayoutPhone}`}>
                <div className={styles.bookPanel}>
                  <section className={flow.block} aria-labelledby="pb-listino">
                    <div className={flow.blockHead}>
                      <h3 className={flow.blockTitle} id="pb-listino">
                        {copy.phone.list}
                      </h3>
                      <span className={styles.count}>{copy.phone.count(salon.services.length)}</span>
                    </div>
                    {salon.services.length === 0 ? <p className={styles.sectionNote}>{copy.phone.empty}</p> : null}
                    {!showPrices && salon.services.length > 0 ? <p className={styles.sectionNote}>{copy.phone.pricesHidden}</p> : null}
                    <ul className={styles.priceList}>
                      {salon.services.map((s) => (
                        <li key={s.id} className={styles.priceRow}>
                          <span className={styles.priceText}>
                            <span className={styles.priceName}>{s.name}</span>
                            <span className={styles.priceMeta}>{span(s.durationMin)}</span>
                          </span>
                          {showPrices ? <span className={styles.priceValue}>{formatPrice(s.priceCents)}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                  <footer className={cx(flow.footer, styles.bookFoot)}>
                    <div className={flow.summary}>
                      <span className={flow.sumMain}>{copy.phone.only}</span>
                      <span className={flow.sumSub}>{copy.phone.change}</span>
                    </div>
                    <a href={tel} className={styles.callButton}>
                      <PhoneIcon />
                      {copy.callToBook}
                    </a>
                  </footer>
                </div>
              </div>
            )}
          </div>
        </section>

        {team > 0 ? (
          <section id="barbieri" className={styles.section}>
            <div className={styles.wrap}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.eyebrow}>{solo ? copy.team.eyebrowOne : copy.team.eyebrow}</span>
                  <h2 className={styles.h2}>{copy.team.title}</h2>
                </div>
                <p className={styles.sectionNote}>{copy.team.note(team)}</p>
              </div>
              <ul className={`${styles.team} ${solo ? styles.teamOne : ""}`}>
                {salon.members.map((m) => (
                  <li key={m.id} className={styles.member}>
                    <span className={styles.portrait} aria-hidden="true">
                      {Array.from(m.name.trim())[0]?.toUpperCase()}
                    </span>
                    <span className={styles.memberName}>{m.name}</span>
                    {bookingOn && !solo ? (
                      <PickBarber id={m.id} className={styles.memberLink}>
                        {copy.team.bookWith(m.name)}
                      </PickBarber>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <section id="dove" className={`${styles.section} ${styles.whereSection}`}>
          <div className={styles.wrap}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.eyebrow}>{copy.where.eyebrow}</span>
                <h2 className={styles.h2}>{salon.address ?? salon.name}</h2>
              </div>
            </div>
            <div className={styles.whereGrid}>
              <div className={styles.mapCard}>
                <div className={styles.map} aria-hidden="true">
                  <span className={styles.mapPin}>
                    <PinIcon size={22} />
                  </span>
                </div>
                <div className={styles.mapBody}>
                  <span className={styles.mapName}>{salon.name}</span>
                  {salon.address ? <span className={styles.mapAddress}>{salon.address}</span> : null}
                  <div className={styles.mapButtons}>
                    {maps ? (
                      <a href={maps} className={styles.darkButton} target="_blank" rel="noopener noreferrer">
                        <Svg>
                          <path d="M14 4h6v6M20 4l-9 9" />
                          <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
                        </Svg>
                        {copy.where.openMaps}
                      </a>
                    ) : null}
                    <a href={tel} className={styles.lightButton}>
                      <PhoneIcon />
                      {salon.phone}
                    </a>
                  </div>
                </div>
              </div>
              <div className={styles.hoursCard}>
                <div className={styles.hoursHead}>
                  <h3 className={styles.h3}>{copy.where.hours}</h3>
                  {sign.open ? (
                    <span className={styles.statusSmall}>
                      <span className={styles.statusDot} aria-hidden="true" />
                      {copy.where.openNow}
                    </span>
                  ) : null}
                </div>
                <ul className={styles.hours}>
                  {hoursLines(salon.week, weekday).map((h, i) => {
                    const day = salon.week[[1, 2, 3, 4, 5, 6, 0][i]!]!;
                    const ranges = rangesOf(day);
                    return (
                      <li key={h.day} className={`${styles.hoursRow} ${h.today ? styles.hoursToday : ""}`}>
                        <span className={styles.hoursDay}>
                          {h.day}
                          {h.today ? <span className={styles.todayBadge}>{copy.where.today}</span> : null}
                        </span>
                        <span className={`${styles.hoursTime} ${ranges.length === 0 ? styles.hoursClosed : ""}`}>
                          {ranges.length === 0 ? (
                            <span className={styles.range}>{copy.where.closed}</span>
                          ) : (
                            ranges.map(([a, b], k) => (
                              <span key={a}>
                                {k > 0 ? " " : ""}
                                <span className={styles.range}>
                                  {formatMinutes(a)}–{formatMinutes(b)}
                                </span>
                              </span>
                            ))
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.footerRow}`}>
          <span className={styles.footerLinks}>
            <span>
              © {salon.name}
              {city ? ` · ${city}` : ""}
            </span>
            <Link href="/privacy">{copy.footer.privacy}</Link>
            <CookieConsent buttonClassName={styles.footerButton} />
          </span>
          <Link href="/" className={styles.powered} aria-label="Prenotazioni con Taglendo">
            <span>{copy.footer.poweredBy}</span>
            <Image src="/brand/taglendo-icon.svg" alt="" width={20} height={20} className={styles.poweredIcon} />
            <Image src="/brand/taglendo-logo.svg" alt="Taglendo" width={84} height={20} style={{ width: 84, height: "auto" }} />
          </Link>
        </div>
      </footer>

      <div className={styles.barSpace} />
      <BottomBar hideWhileVisible={bookingOn ? "prenota-card" : undefined}>
        <span className={styles.barText}>
          <span className={styles.barSub}>
            {sign.open ? <span className={styles.statusDot} aria-hidden="true" /> : null}
            {barSign}
          </span>
          <span className={styles.barMain}>{bookingOn ? copy.bookOnline : copy.phone.bar}</span>
        </span>
        <a href={cta.href} className={styles.cta}>
          {cta.header}
        </a>
      </BottomBar>
    </div>
  );
}
