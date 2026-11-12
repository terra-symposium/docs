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
import { DocsStaticWorkspace } from '../dist/lib/components/StaticWorkspace.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const sections = [
  {
    title: 'Development',
    groups: [
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
    sections,
    currentPath: '/intro',
    children: body,
  });
  assert.equal(typeof element.type, 'function');
  assert.equal(element.type.name, 'DocsStaticWorkspace');
  assert.equal(element.props.title, 'Docs');
  assert.equal(element.props.pageTitle, 'Intro');
  assert.equal(element.props.description, 'Site tagline stays in the sidebar.');
  assert.equal(element.props.sections, sections);
  assert.equal(element.props.currentPath, '/intro');
  assert.equal(element.props.renderContent, body);
  assert.deepEqual(element.props.attachments, []);
});
test('an empty Astro slot does not replace a static Markdown body', () => {
  const workspace = DocsStaticWorkspace({
    title: 'Docs',
    pageTitle: 'Intro',
    currentPath: '/intro',
    markdown: '# Intro',
    children: React.createElement('main', { className: 'docs-page-content' }, null),
  }).props.children.props.children;
  const staticContent = workspace.props.renderContent;

  assert.equal(workspace.type.name, 'DocsWorkspace');
  assert.equal(staticContent.type.name, 'StaticContentSlot');
  assert.equal(staticContent.props.children.type.name, 'DocsMarkdown');
});
