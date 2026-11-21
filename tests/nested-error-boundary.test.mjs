/**
 * tests/nested-error-boundary.test.mjs
 */
/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ErrorBoundary as sharedBoundary } from '@terra-symposium/boundaries/react';
import { ErrorBoundary as nestedDocsBoundary } from '../dist/lib/components/terra/ui.js';

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('nested Docs render failures use the configured shared reporter', async () => {
  assert.equal(nestedDocsBoundary, sharedBoundary);

  // hygiene-ignore single-use -- Snapshot the process window global before replacing it and restore that exact value afterward.
  const prevWindow = globalThis.window;
  // hygiene-ignore single-use -- Snapshot the process fetch global before replacing it and restore that exact value afterward.
  const prevFetch = globalThis.fetch;
  const requests = [];
  try {
    globalThis.window = {
      __terraBoundaryReporting: {
        endpoint: 'https://example.test/api/error-report',
        site: 'docs-fixture',
      },
      location: { pathname: '/fixture/nested/' },
    };
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      return { ok: true };
    };

    new nestedDocsBoundary({ name: 'NestedDocs' }).componentDidCatch(new Error('nested failure'), {
      componentStack: '\n at Fixture',
    });
    await new Promise((resolve) => globalThis.setImmediate(resolve));

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://example.test/api/error-report');
    const report = JSON.parse(requests[0].options.body);
    assert.deepEqual(
      { ...report, stack: undefined },
      {
        site: 'docs-fixture',
        category: 'render',
        component: 'NestedDocs',
        route: '/fixture/nested/',
        message: 'nested failure',
        stack: undefined,
      },
    );
    assert.match(report.stack, /nested failure/);
  } finally {
    globalThis.window = prevWindow;
    globalThis.fetch = prevFetch;
  }
});
