import { Link } from 'react-router-dom';
import useLanguage from '../../hooks/useLanguage';
import usePageMeta from '../../hooks/usePageMeta';
import { toLocalizedText } from '../../utils/localized';
import {
  ABOUT_CONTACT,
  ABOUT_CTA,
  ABOUT_HERO,
  ABOUT_HIGHLIGHTS,
  ABOUT_SECTIONS
} from '../../constants/aboutContent';

function AboutPage() {
  const { language } = useLanguage();
  const tr = (value) => toLocalizedText(value, language);

  usePageMeta({
    title: tr(ABOUT_HERO.title),
    description: tr(ABOUT_HERO.lead)
  });

  return (
    <section className="page-wrap about-page">
      <header className="about-hero">
        <p className="eyebrow">{tr(ABOUT_HERO.eyebrow)}</p>
        <h1 className="about-hero__title">{tr(ABOUT_HERO.title)}</h1>
        <p className="about-hero__lead">{tr(ABOUT_HERO.lead)}</p>

        <div className="about-highlights">
          {ABOUT_HIGHLIGHTS.map((item) => (
            <div key={item.key} className="about-highlight">
              <span className="about-highlight__value">{tr(item.value)}</span>
              <span className="about-highlight__label">{tr(item.label)}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="about-sections">
        {ABOUT_SECTIONS.map((sectionItem) => (
          <article key={sectionItem.key} className="surface-card about-section">
            <div className="about-section__head">
              <span className="about-section__icon" aria-hidden="true">
                {sectionItem.icon}
              </span>
              <h2 className="about-section__title">{tr(sectionItem.title)}</h2>
            </div>
            {sectionItem.body.map((paragraph, index) => (
              <p key={index} className="about-section__body">
                {tr(paragraph)}
              </p>
            ))}
          </article>
        ))}
      </div>

      <article className="surface-card about-contact">
        <div className="about-section__head">
          <span className="about-section__icon" aria-hidden="true">
            📍
          </span>
          <h2 className="about-section__title">{tr(ABOUT_CONTACT.title)}</h2>
        </div>
        <p className="about-section__body">{tr(ABOUT_CONTACT.intro)}</p>

        <div className="about-contact__grid">
          <dl className="about-contact__details">
            <div className="about-contact__row">
              <dt>{tr(ABOUT_CONTACT.addressLabel)}</dt>
              <dd>{tr(ABOUT_CONTACT.address)}</dd>
            </div>
            <div className="about-contact__row">
              <dt>{tr(ABOUT_CONTACT.emailLabel)}</dt>
              <dd>
                <a href={`mailto:${ABOUT_CONTACT.email}`}>{ABOUT_CONTACT.email}</a>
              </dd>
            </div>
            <div className="about-contact__row">
              <dt>{tr(ABOUT_CONTACT.phoneLabel)}</dt>
              <dd>
                <a href={`tel:${ABOUT_CONTACT.phone.replace(/\s+/g, '')}`}>{ABOUT_CONTACT.phone}</a>
              </dd>
            </div>
          </dl>

          <div className="about-contact__map">
            <iframe
              title={tr(ABOUT_CONTACT.mapLabel)}
              src={ABOUT_CONTACT.mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <a
              className="about-contact__map-link"
              href={ABOUT_CONTACT.mapLinkUrl}
              target="_blank"
              rel="noreferrer"
            >
              {tr(ABOUT_CONTACT.mapLabel)} →
            </a>
          </div>
        </div>
      </article>

      <section className="about-cta">
        <h2 className="about-cta__title">{tr(ABOUT_CTA.title)}</h2>
        <p className="about-cta__lead">{tr(ABOUT_CTA.lead)}</p>
        <div className="about-cta__actions">
          <Link to="/news" className="btn btn-primary">
            {tr(ABOUT_CTA.newsroom)}
          </Link>
          <Link to="/contact" className="btn btn-ghost">
            {tr(ABOUT_CTA.contact)}
          </Link>
        </div>
      </section>
    </section>
  );
}

export default AboutPage;
