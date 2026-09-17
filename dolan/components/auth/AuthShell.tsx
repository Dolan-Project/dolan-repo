import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";
import styles from "./auth.module.css";

const SHOWCASE = {
  login: {
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=85",
    alt: "Pantai dan tebing di Bali",
    kicker: "Dolan bareng",
    title: (
      <>
        Tujuannya sama.
        <br />
        <em>Ceritanya bersama.</em>
      </>
    ),
    copy: "Masuk untuk lanjutkan rencana, diskusi trip, dan temukan teman seperjalanan di seluruh Indonesia.",
    chips: ["Join gratis", "Profil terverifikasi", "Itinerary dari Dolan"],
    sideHref: ROUTES.daftar,
    sideLabel: "Daftar",
  },
  register: {
    image:
      "https://images.unsplash.com/photo-1573790387438-4da905039392?auto=format&fit=crop&w=1400&q=85",
    alt: "Kepulauan Komodo",
    kicker: "Gabung komunitas",
    title: (
      <>
        Mulai petualanganmu
        <br />
        <em>dari satu akun.</em>
      </>
    ),
    copy: "Buat profil traveler, susun itinerary sesuai budget, lalu berangkat bareng orang yang rencananya cocok.",
    chips: ["Gratis daftar", "Open trip aman", "Dari Labuan Bajo ke Rinjani"],
    sideHref: ROUTES.masuk,
    sideLabel: "Masuk",
  },
} as const;

type AuthShellProps = {
  children: React.ReactNode;
  mode?: "login" | "register" | "utility";
  eyebrow?: React.ReactNode;
  title?: string;
  description?: string;
  sideHref?: string;
  sideLabel?: string;
};

export function AuthShell({
  children,
  mode = "utility",
  eyebrow,
  title,
  description,
  sideHref,
  sideLabel,
}: AuthShellProps) {
  const showcase = mode === "login" || mode === "register" ? SHOWCASE[mode] : null;
  const resolvedSideHref = sideHref ?? showcase?.sideHref;
  const resolvedSideLabel = sideLabel ?? showcase?.sideLabel;

  return (
    <div className={styles.shell}>
      <header className={styles.brandBar}>
        <Link href={ROUTES.beranda} className={styles.logo}>
          <span className={styles.logoMark}>
            <Icon name="explore" className="text-[22px]" />
          </span>
          <span className={styles.logoText}>
            <span className={styles.logoName}>DOLAN</span>
            <span className={styles.logoTag}>Social travel Indonesia</span>
          </span>
        </Link>
        {resolvedSideHref && resolvedSideLabel ? (
          <Link href={resolvedSideHref} className={styles.sideLink}>
            {resolvedSideLabel}
            <Icon name="arrow_forward" className="text-[16px]" />
          </Link>
        ) : (
          <Link href={ROUTES.beranda} className={styles.sideLink}>
            Beranda
          </Link>
        )}
      </header>

      {showcase ? (
        <div className={`${styles.layout} ${styles.layoutSplit}`}>
          <aside className={styles.showcase} aria-hidden={false}>
            <Image
              src={showcase.image}
              alt={showcase.alt}
              fill
              unoptimized
              priority
              sizes="(min-width: 960px) 50vw, 100vw"
              className={styles.showcaseImage}
            />
            <div className={styles.showcaseScrim} />
            <div className={styles.showcaseContent}>
              <span className={styles.showcaseKicker}>
                <Icon name="explore" className="text-[15px]" />
                {showcase.kicker}
              </span>
              <h1 className={styles.showcaseTitle}>{showcase.title}</h1>
              <p className={styles.showcaseCopy}>{showcase.copy}</p>
              <div className={styles.chips}>
                {showcase.chips.map((chip) => (
                  <span key={chip} className={styles.chip}>
                    <Icon name="check_circle" className="text-[14px]" />
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </aside>

          <section className={styles.panel}>
            {(eyebrow || title || description) && (
              <div>
                {eyebrow ? (
                  <span
                    className={`${styles.headingEyebrow} ${
                      mode === "register" ? styles.eyebrowRegister : styles.eyebrowLogin
                    }`}
                  >
                    {eyebrow}
                  </span>
                ) : null}
                {title ? <h2 className={styles.headingTitle}>{title}</h2> : null}
                {description ? <p className={styles.headingCopy}>{description}</p> : null}
              </div>
            )}
            {children}
          </section>
        </div>
      ) : (
        <main className={`${styles.panel} ${styles.panelNarrow}`}>
          {(eyebrow || title || description) && (
            <div>
              {eyebrow ? <span className={`${styles.headingEyebrow} ${styles.eyebrowLogin}`}>{eyebrow}</span> : null}
              {title ? <h1 className={styles.headingTitle}>{title}</h1> : null}
              {description ? <p className={styles.headingCopy}>{description}</p> : null}
            </div>
          )}
          {children}
        </main>
      )}
    </div>
  );
}

export { styles as authStyles };
