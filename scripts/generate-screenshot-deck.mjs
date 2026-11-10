/**
 * scripts/generate-screenshot-deck.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import fs from 'node:fs';
import path from 'node:path';
import { writeScreenshotSlideshowFromDirectory } from '@terra-symposium/standards-reporting/slideshow';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const screenshotsDir = path.resolve('tests/results/visual/screenshots');
const outputFile = path.resolve('tests/results/visual/combined/report.pptx');
if (!fs.existsSync(screenshotsDir))
  throw new Error(`Screenshot folder does not exist: ${screenshotsDir}`);
await fs.promises.mkdir(path.dirname(outputFile), { recursive: true });
await writeScreenshotSlideshowFromDirectory(screenshotsDir, outputFile, {
  title: 'Docs Playwright screenshots',
});
