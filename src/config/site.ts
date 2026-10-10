/**
 * Business, contact and media settings.
 *
 * Leave a value `undefined` until the real detail is supplied. The site reads
 * these and shows an honest "not yet available" state for anything unset;
 * nothing is invented in its place.
 */

export interface SiteConfig {
  name: string;
  /** Base price of a Hackulator in pence. Unset: not yet announced. */
  basePricePence?: number;
  contact: {
    /** Public enquiry email. Unset: enquiries cannot be sent from the site yet. */
    email?: string;
    /** Trading/business name, if any. */
    businessName?: string;
  };
  /** Stock / availability statement. Unset: shown as "not yet available". */
  availability?: string;
  /** Fulfilment terms URL or text. Unset: shown as "to be published". */
  fulfilmentTerms?: string;
  conceptFilm: {
    /** e.g. "/media/hackulator_concept_ad.mp4". Unset until the file is added to /public/media. */
    src?: string;
    poster: string;
    posterFallback: string;
  };
}

export const siteConfig: SiteConfig = {
  name: "Hackulator",
  basePricePence: undefined,
  contact: {
    email: undefined,
    businessName: undefined,
  },
  availability: undefined,
  fulfilmentTerms: undefined,
  conceptFilm: {
    src: undefined,
    poster: "/media/hackulator-concept-poster.webp",
    posterFallback: "/media/hackulator-concept-poster.jpg",
  },
};
