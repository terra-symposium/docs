/**
 * Selects the published-site smoke tests from the shared browser suite.
 *
 * Keep this expression shared by the main suite's inverse filter and the
 * published suite's positive filter so both commands run the same test set.
 */
export const publishedDocsSmokeTests =
  /standalone Astro pages mount|published Markdown uses interactive Styling controls|Docs presentation fixture|published MDX code fixture|published MDX nodes fixture|static Markdown page downloads|Tree handling editor opens/;
