import Image from "next/image";
import Link from "next/link";
import { Booking } from "./Booking";
import { BottomBar } from "./BottomBar";
import bookingStyles from "./Booking.module.css";
import { bookingCopy } from "@/lib/copy/booking";
import { CookieConsent } from "./CookieConsent";
import { publicCopy as copy } from "@/lib/copy/publicPage";
import { formatPrice } from "@/lib/dates/format";
import type { PublicSalon } from "@/lib/public/load";
import { span } from "@/lib/rules/agenda";
import { fromPriceCents, hoursLines, mapsHref, openSign, phoneHref, shortHours, typicalHoursLine } from "@/lib/rules/publicPage";
import styles from "./Salon.module.css";

type Props = { salon: PublicSalon; weekday: number; nowMin: number; today: string; bookingOn: boolean };

/**
 * La pagina del salone, come nel design. In questa tappa si prenota solo al telefono:
 * il percorso online arriva con la tappa successiva.
 */
export function PublicPage({ salon, weekday, nowMin, today, bookingOn }: Props) {
  const tel = phoneHref(salon.phone);
  const sign = openSign(salon.week, weekday, nowMin);
  const from = fromPriceCents(salon.services);
  const showPrices = salon.showPrices;
  const maps = mapsHref(salon.address, salon.area);
  const city = salon.area?.split("·").pop()?.trim();
  const teamNote = copy.teamNote(salon.members.length);
  const hours = hoursLines(salon.week, weekday);
  const instagramUser = salon.instagram?.replace(/^@/, "").trim();
  const cta = bookingOn ? { href: "#prenota", header: copy.bookShort, hero: copy.bookOnline, hint: copy.bookOnline } : { href: tel, header: copy.callNow, hero: copy.callToBook, hint: copy.callToBook };
  const cancelLimit = salon.cancelLimitMin >= 1440 ? "24 ore" : "2 ore";

  return (
    <div className={styles.page} id="top">
      <header className={styles.header}>
        <div className={`${styles.wrap} ${styles.headerRow}`}>
          <a href="#top" className={styles.brand}>
            <span className={styles.brandName}>{salon.name}</span>
            {salon.area ? <span className={styles.brandArea}>{salon.area}</span> : null}
          </a>
          <nav className={styles.nav} aria-label="Sezioni">
            <a href="#prenota" className={styles.navLink}>{copy.nav.prices}</a>
            {salon.members.length > 0 ? <a href="#barbieri" className={styles.navLink}>{copy.nav.team}</a> : null}
            <a href="#dove" className={styles.navLink}>{copy.nav.where}</a>
          </nav>
          <div className={styles.headerActions}>
            <a href={tel} className={styles.phoneLink}>{salon.phone}</a>
            <a href={cta.href} className={styles.cta}>{cta.header}</a>
          </div>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroScrim} />
        <div className={`${styles.wrap} ${styles.heroInner}`}>
          <div className={styles.heroText}>
            {salon.area ? <span className={styles.eyebrow}>{salon.area}</span> : null}
            <h1 className={styles.title}>{salon.name}</h1>
            <p className={styles.lead}>{salon.description ?? copy.heroLeadFallback}</p>
            <div className={styles.heroButtons}>
              <a href={cta.href} className={styles.heroCta}>{cta.hero}</a>
              <a href="#prenota" className={styles.heroGhost}>{showPrices ? copy.seeServices : copy.seeServicesNoPrices}</a>
            </div>
            <div className={styles.facts}>
              {salon.address ? <span>{salon.address}</span> : null}
              {shortHours(salon.week) ? <span>{shortHours(salon.week)}</span> : null}
              {showPrices && from !== null ? <span>Da {formatPrice(from)}</span> : null}
            </div>
          </div>
          <a href={cta.href} className={styles.sign} aria-label={`${sign.title} ${sign.line}. ${cta.hint}`}>
            <span className={styles.nail} />
            <span className={styles.cords}>
              <span className={`${styles.cord} ${styles.cordL}`} />
              <span className={`${styles.cord} ${styles.cordR}`} />
            </span>
            <span className={styles.signBoard}>
              <span className={styles.signBig}>{sign.title}</span>
              {sign.line ? <span className={sign.open ? styles.signLine : `${styles.signLine} ${styles.signLineClosed}`}>{sign.line}</span> : null}
              <span className={styles.signHint}>{cta.hint}</span>
            </span>
          </a>
        </div>
      </section>

      {bookingOn ? (
        <section id="prenota" className={`${styles.wrap} ${styles.section}`}>
          <div className={styles.sectionHead}>
            <div>
              <span className={bookingStyles.eyebrow}>{bookingCopy.title}</span>
              <h2 className={styles.h2}>{bookingCopy.subtitle}</h2>
            </div>
            <p className={styles.sectionNote}>{bookingCopy.intro}</p>
          </div>
          <div className={bookingStyles.layout}>
            <div className={bookingStyles.main}>
              <Booking
                slug={salon.slug}
                phone={salon.phone}
                privacyHref="/privacy"
                services={salon.services}
                members={salon.members.map((m) => ({ id: m.id, name: m.name }))}
                showPrices={showPrices}
                today={today}
                maxAdvanceDays={salon.maxAdvanceDays}
              />
            </div>
            <aside className={bookingStyles.aside}>
              <span className={bookingStyles.asideTitle}>{salon.cancelOnline ? copy.aside.cancelTitle : copy.aside.phoneTitle}</span>
              <p className={bookingStyles.asideText}>{salon.cancelOnline ? copy.aside.cancelBody(cancelLimit) : copy.aside.phoneBody}</p>
              <a href={tel} className={bookingStyles.asidePhone}>{salon.phone}</a>
            </aside>
          </div>
        </section>
      ) : (
      <section id="prenota" className={`${styles.wrap} ${styles.section}`}>
        <div className={styles.sectionHead}>
          <h2 className={styles.h2}>{copy.menu.title}</h2>
          <p className={styles.sectionNote}>{copy.menu.intro}</p>
        </div>
        <div className={styles.cols}>
          <div className={styles.menu}>
            <div className={styles.menuInner}>
              <span className={styles.menuLabel}>{copy.menu.label}</span>
              {!showPrices ? <span className={styles.menuNote}>{copy.menu.pricesHidden}</span> : null}
              {salon.services.length === 0 ? <span className={styles.menuNote}>{copy.menu.empty}</span> : null}
              {salon.services.map((s) => (
                <div key={s.id} className={styles.service}>
                  <span className={styles.serviceText}>
                    <span className={styles.serviceName}>{s.name}</span>
                    <span className={styles.serviceMeta}>{span(s.durationMin)}</span>
                  </span>
                  {showPrices ? (
                    <>
                      <span className={styles.dots} aria-hidden="true" />
                      <span className={styles.price}>{formatPrice(s.priceCents)}</span>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.callCard}>
            <span className={styles.callLabel}>{copy.menu.toBook}</span>
            <a href={tel} className={styles.callNumber}>{salon.phone}</a>
            <a href={tel} className={styles.callButton}>{copy.callNow}</a>
            <div className={styles.callHours}>
              {typicalHoursLine(salon.week) ? <strong>{typicalHoursLine(salon.week)}</strong> : null}
              <span>{copy.menu.answering}</span>
            </div>
            <span className={styles.callNote}>{copy.menu.change}</span>
          </div>
        </div>
      </section>
      )}

      {salon.members.length > 0 ? (
        <section id="barbieri" className={`${styles.wrap} ${styles.section}`}>
          <div className={styles.sectionHead}>
            <h2 className={styles.h2}>{copy.team.title}</h2>
            {teamNote ? <span className={styles.sectionNote}>{teamNote}</span> : null}
          </div>
          <div className={styles.team}>
            {salon.members.map((m) => (
              <figure key={m.id} className={styles.member}>
                <div className={styles.portrait} aria-hidden="true">{m.name.trim().charAt(0).toUpperCase()}</div>
                <figcaption>
                  <span className={styles.memberName}>{m.name}</span>
                  {m.bio ? <span className={styles.memberBio}> {m.bio}</span> : null}
                </figcaption>
              </figure>
            ))}
          </div>
          {instagramUser ? (
            <a className={styles.instagram} href={`https://instagram.com/${encodeURIComponent(instagramUser)}`} target="_blank" rel="noopener noreferrer">
              <span>{copy.instagram}</span>
              <span>@{instagramUser} →</span>
            </a>
          ) : null}
        </section>
      ) : null}

      <section id="dove" className={styles.where}>
        <div className={`${styles.wrap} ${styles.whereInner}`}>
          <div className={styles.whereText}>
            <span className={styles.whereLabel}>{copy.where.label}</span>
            <h2 className={styles.whereTitle}>{salon.address ?? salon.name}</h2>
            <div className={styles.whereButtons}>
              {maps ? <a href={maps} className={styles.whereButton} target="_blank" rel="noopener noreferrer">{copy.where.openMaps}</a> : null}
              <a href={tel} className={styles.whereGhost}>{salon.phone}</a>
            </div>
          </div>
          <ul className={styles.hours}>
            {hours.map((h) => (
              <li key={h.day} className={h.today ? `${styles.hoursRow} ${styles.hoursRowToday}` : styles.hoursRow}>
                <span>{h.day}</span>
                <span className={styles.hoursTime}>{h.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.footerRow}`}>
          <span className={styles.footerLinks}>
            <span>© {salon.name}{city ? ` · ${city}` : ""}</span>
            <Link href="/privacy">{copy.footer.privacy}</Link>
            <CookieConsent />
          </span>
          <Link href="/" className={styles.powered} aria-label="Prenotazioni con Taglendo">
            <span>{copy.footer.poweredBy}</span>
            <Image src="/brand/taglendo-logo.svg" alt="Taglendo" width={96} height={30} style={{ height: "auto" }} />
          </Link>
        </div>
      </footer>

      <div className={styles.barSpace} />
      <BottomBar hideWhileVisible={bookingOn ? "prenota-card" : undefined}>
        <span className={styles.barText}>
          <span className={styles.barSub}>{sign.line ? `${sign.title} ${sign.line}` : copy.barPhone}</span>
          <span className={styles.barMain}>{bookingOn ? copy.bookOnline : salon.phone}</span>
        </span>
        <a href={cta.href} className={styles.cta}>{cta.header}</a>
      </BottomBar>
    </div>
  );
}
