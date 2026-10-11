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
    /** The supplied ad, served exactly as provided. Unset to fall back to the poster only. */
    src?: string;
    poster: string;
    posterFallback: string;
    /** Intrinsic size of the film and poster. Sets the stage's aspect ratio. */
    width: number;
    height: number;
    durationLabel: string;
  };
}

export const siteConfig: SiteConfig = {
  name: "Hackulator",
  basePricePence: undefined,
  contact: {
    email: "hackulator@dailyos.uk",
    businessName: undefined,
  },
  availability: undefined,
  fulfilmentTerms: undefined,
  conceptFilm: {
    src: "/media/hackulator-from-within.mp4",
    poster: "/media/hackulator-concept-poster.webp",
    posterFallback: "/media/hackulator-concept-poster.jpg",
    width: 1080,
    height: 1920,
    durationLabel: "22 seconds",
  },
};
