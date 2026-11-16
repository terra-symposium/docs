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

const sections = [{ title: 'Development', groups: [{ title: 'Guides', leaves: [{ title: 'Intro', href: '/intro', attachments: [{ title: 'Notes', href: '/notes.pdf' }] }] }] }];
test('React static adapter forwards host and leaf data to the shared workspace', () => {
	const body = React.createElement('p', null, 'Body text');
	const el = DocsSiteLayout({ title: 'Docs', pageTitle: 'Intro', description: 'Site tagline stays in the sidebar.', nodes: [], sections, currentPath: '/intro', children: body });
	assert.equal(typeof el.type, 'function');
	assert.equal(el.type.name, 'DocsStaticWorkspace');
	assert.equal(el.props.title, 'Docs');
	assert.equal(el.props.pageTitle, 'Intro');
	assert.equal(el.props.description, 'Site tagline stays in the sidebar.');
	assert.equal(el.props.sections, sections);
	assert.equal(el.props.currentPath, '/intro');
	assert.equal(el.props.renderContent, body);
	assert.deepEqual(el.props.attachments, []);
});
