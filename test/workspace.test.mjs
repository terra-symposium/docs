/**
 * test/workspace.test.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import test from 'node:test';

// COMPONENTS
import React from 'react';
import { DocsSiteLayout } from '../dist/lib/components/SiteLayout.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const trees = [
  {
    title: 'Development',
    branches: [
      {
        title: 'Guides',
        leaves: [
          { title: 'Intro', href: '/intro', attachments: [{ title: 'Notes', href: '/notes.pdf' }] },
        ],
      },
    ],
  },
];
test('React static adapter forwards host and leaf data to the shared workspace', () => {
  const body = React.createElement('p', null, 'Body text');
  const element = DocsSiteLayout({
    title: 'Docs',
    pageTitle: 'Intro',
    description: 'Site tagline stays in the sidebar.',
    nodes: [],
    trees,
    currentPath: '/intro',
    children: body,
  });
  assert.equal(typeof element.type, 'function');
  assert.equal(element.type.name, 'DocsStaticWorkspace');
  assert.equal(element.props.title, 'Docs');
  assert.equal(element.props.pageTitle, 'Intro');
  assert.equal(element.props.description, 'Site tagline stays in the sidebar.');
  assert.equal(element.props.trees, trees);
  assert.equal(element.props.currentPath, '/intro');
  assert.equal(element.props.renderContent, body);
  assert.deepEqual(element.props.attachments, []);
});
test('React static adapter still accepts legacy navigation data', () => {
  const sections = trees.map(({ branches, ...tree }) => ({ ...tree, groups: branches }));
  const element = DocsSiteLayout({
    title: 'Docs',
    nodes: [],
    sections,
    currentPath: '/intro',
  });
  assert.equal(element.props.sections, sections);
});
