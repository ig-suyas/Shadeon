export interface Testimonial {
  /** Keep it to what fits in three lines on the page. */
  quote: string;
  name: string;
  role: string;
  /** Link to the person or the project, if they agreed to one. */
  href?: string;
}

/**
 * Real quotes only, added with the author's permission. While this list is
 * empty, the landing page shows an invitation instead of invented praise.
 */
export const testimonials: Testimonial[] = [];
