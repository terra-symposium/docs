/**
 * config/playwright-selection.mjs
 */
/**
 * Selects the published-site smoke tests from the shared browser suite.
 *
 * Keep this expression shared by the main suite's inverse filter and the
 * published suite's positive filter so both commands run the same test set.
 */
export const publishedDocsSmokeTests =
  /standalone Astro pages mount|published Markdown uses interactive Styling controls|the Blocks reference has highlighted code and clear title spacing|Docs syntax page has highlighted code|Docs presentation fixture|published code fixture|published MDX nodes fixture|static Markdown page downloads|Tree reference editor opens/;
