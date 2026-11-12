/**
 * src/components/workspace-demo-fixture.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { docsValueToMarkdown, markdownToDocsValue } from '../lib/markdown-model.js';

// COMPONENTS
import * as TerraQualityRegex from '../lib/terra/regex.mjs';

// TYPES
import type { DocVer } from '../lib/terra/runtime/types.js';
import type {
  DocsActionOperation,
  DocsActionResult,
  DocsHostAdapter,
  DocsHostAttachment,
  DocsHostTreeNode,
} from '../lib/host.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const MD_MDX_I_REGEX = /\.(?:md|mdx)$/i;
/**
 * Returns a fresh global matcher for leading or trailing slashes in fixture paths.
 *
 * @return A regular expression that strips path-boundary slashes with `replace`.
 */
const G_REGEX = () => /^\/+|\/+$/g;
const WORKSPACE_DEMO_STORAGE_KEY = 'docs-workspace-demo-v1';
export const WORKSPACE_DEMO_PATH = '/workspace-demo/';
/** Browser-stored attachment data; `bytes` supports the fixture's asset-read action. */
type WorkspaceDemoAsset = DocsHostAttachment & { bytes: number[]; docId: string };
/** Content and route metadata for one document in the workspace demo's local store. */
type WorkspaceDemoDocument = {
  id: string;
  path: string;
  pathname: string;
  title: string;
  description: string;
  contributors: string[];
  updatedAt: string;
  content: unknown[];
  source: string;
  attachments: DocsHostAttachment[];
  versions: DocVer[];
};
/** Versioned browser-local state shared by the editable demo and its host adapter. */
export type WorkspaceDemoState = {
  schema: 1;
  tree: DocsHostTreeNode[];
  documents: Record<string, WorkspaceDemoDocument>;
  assets: Record<string, WorkspaceDemoAsset>;
};
const initialWorkspaceDemoState: { content: unknown[]; tree: DocsHostTreeNode[] } = {
  content: [
    {
      _key: 'intro',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: 'intro-text',
          _type: 'span',
          marks: [],
          text: 'Salesphere helps sales professionals choose a useful next step in a customer relationship and understand why it matters. This site connects that product intent to the current implementation.',
        },
      ],
    },
    {
      _key: 'start-heading',
      _type: 'block',
      style: 'h2',
      markDefs: [],
      children: [
        { _key: 'heading-text', _type: 'span', marks: [], text: 'Start with the product' },
      ],
    },
    {
      _key: 'product-copy',
      _type: 'block',
      style: 'normal',
      markDefs: [
        { _key: 'purpose', _type: 'link', href: '/product/purpose/' },
        { _key: 'map', _type: 'link', href: '/product/structure/' },
      ],
      children: [
        { _key: 'read', _type: 'span', marks: [], text: 'Read ' },
        { _key: 'purpose-text', _type: 'span', marks: ['purpose'], text: 'Salesphere’s purpose' },
        { _key: 'then', _type: 'span', marks: [], text: ' for the larger aim, then use the ' },
        { _key: 'map-text', _type: 'span', marks: ['map'], text: 'product map' },
        {
          _key: 'rest',
          _type: 'span',
          marks: [],
          text: ' to see how principles, intelligence, work surfaces, reflection, and platform capabilities fit together.',
        },
      ],
    },
    {
      _key: 'implementation-heading',
      _type: 'block',
      style: 'h2',
      markDefs: [],
      children: [
        { _key: 'implementation-title', _type: 'span', marks: [], text: 'Find the implementation' },
      ],
    },
    {
      _key: 'runtime',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: 'runtime-copy',
          _type: 'span',
          marks: [],
          text: 'Runtime system map follows a request through the Astro app.',
        },
      ],
    },
  ],
  tree: [
    {
      type: 'branch',
      origName: 'overview',
      title: 'Overview',
      path: 'overview',
      hue: 145,
      children: [
        {
          type: 'branch',
          origName: 'start-here',
          title: 'Start here',
          path: 'overview/start-here',
          children: [
            {
              type: 'leaf',
              origName: 'salesphere',
              title: 'Salesphere',
              path: 'overview/start-here/salesphere.mdx',
            },
            {
              type: 'leaf',
              origName: 'runtime-map',
              title: 'Runtime map',
              path: 'overview/start-here/runtime-map.mdx',
            },
          ],
        },
      ],
    },
    {
      type: 'branch',
      origName: 'configure',
      title: 'Configure',
      path: 'configure',
      hue: 210,
      children: [
        {
          type: 'branch',
          origName: 'providers',
          title: 'Storage providers',
          path: 'configure/providers',
          children: [
            {
              type: 'leaf',
              origName: 'local-files',
              title: 'Local files',
              path: 'configure/providers/local-files.mdx',
            },
          ],
        },
      ],
    },
  ],
};
/**
 * Creates a document record and derives its initial Markdown source and browser route.
 *
 * @param id Stable key used by the fixture document map and navigation tree.
 * @param path Repository-style path displayed by editor and file actions.
 * @param title Initial title shown for the document.
 * @param description Supporting text stored with the document.
 * @param content Portable Text blocks used to initialize the editor model.
 *
 * @return A fixture document whose initial route selects its section, group, and id.
 */
function makeDocument(
  id: string,
  path: string,
  title: string,
  description: string,
  content: unknown[],
): WorkspaceDemoDocument {
  return {
    id,
    path,
    pathname: buildWorkspaceRoute('overview', 'start-here', id),
    title,
    description,
    contributors: ['Kai'],
    updatedAt: 'Oct 24, 2026',
    content,
    source: docsValueToMarkdown(content as never),
    attachments: [],
    versions: [],
  };
}
/**
 * Builds the sample Salesphere pages, navigation tree, and PDF attachment for demos.
 *
 * @return Seed state with the overview, runtime-map, and local-files documents.
 */
export function createWorkspaceDemoSeed(): WorkspaceDemoState {
  const salesphere = makeDocument(
    'salesphere',
    'overview/start-here/salesphere.mdx',
    'Salesphere',
    '',
    initialWorkspaceDemoState.content,
  );
  salesphere.attachments.push({
    id: 'overview-brief',
    name: 'Product brief.pdf',
    path: '/assets/product-brief.pdf',
    type: 'application/pdf',
    size: 328_512,
  });
  return {
    schema: 1,
    tree: initialWorkspaceDemoState.tree,
    documents: {
      salesphere,
      'runtime-map': makeDocument(
        'runtime-map',
        'overview/start-here/runtime-map.mdx',
        'Runtime map',
        'Follow a request through the application.',
        markdownToDocsValue('# Runtime map\n\nThe request enters through the Astro application.'),
      ),
      'local-files': makeDocument(
        'local-files',
        'configure/providers/local-files.mdx',
        'Local files',
        'Use repository files as the source of truth.',
        markdownToDocsValue('# Local files\n\nA local provider reads repository-backed pages.'),
      ),
    },
    assets: {
      '/assets/product-brief.pdf': {
        id: 'overview-brief',
        name: 'Product brief.pdf',
        path: '/assets/product-brief.pdf',
        type: 'application/pdf',
        size: 22,
        docId: 'salesphere',
        bytes: [37, 80, 68, 70, 45, 49, 46, 55, 10, 37, 68, 79, 67, 83, 10],
      },
    },
  };
}
/**
 * Deep-clones JSON-compatible fixture data so host operations can return independent values.
 *
 * @param value Serializable data to copy before a fixture mutation.
 *
 * @return A structurally independent copy with the same JSON representation.
 */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
/**
 * Loads browser-persisted demo state or restores the sample when storage is absent or invalid.
 *
 * Server rendering always receives the seed; browser reads replace malformed JSON or an unsupported
 * schema with a persisted seed and notify listeners through the writer.
 *
 * @return The current workspace demo state, or the seed during server rendering.
 */
export function readWorkspaceDemoState(): WorkspaceDemoState {
  const seed = createWorkspaceDemoSeed();
  if (typeof window === 'undefined') return seed;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_DEMO_STORAGE_KEY);
    if (!raw) {
      writeWorkspaceDemoState(seed);
      return seed;
    }
    const value = JSON.parse(raw) as Partial<WorkspaceDemoState>;
    if (
      value.schema !== 1 ||
      !Array.isArray(value.tree) ||
      !value.documents ||
      typeof value.documents !== 'object' ||
      !value.assets ||
      typeof value.assets !== 'object'
    ) {
      writeWorkspaceDemoState(seed);
      return seed;
    }
    return value as WorkspaceDemoState;
  } catch {
    writeWorkspaceDemoState(seed);
    return seed;
  }
}
/**
 * Persists demo state and notifies mounted workspace previews that it changed.
 *
 * The server-side call is a no-op because the fixture store belongs to the browser.
 *
 * @param state Complete fixture state to serialize into local storage.
 *
 * @return Nothing; browser listeners are notified after the state is saved.
 */
function writeWorkspaceDemoState(state: WorkspaceDemoState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(WORKSPACE_DEMO_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('docs-fixture-updated'));
}
/**
 * Builds a demo URL whose query parameters select a section, group, and optional document.
 *
 * @param sectionId Top-level navigation node; omitted to return the demo root.
 * @param groupId Nested navigation node to select within the section.
 * @param leafId Document id to select within the section and group.
 *
 * @return The demo base path or that path with the supplied selection encoded as a query.
 */
function buildWorkspaceRoute(sectionId?: string, groupId?: string, leafId?: string): string {
  if (!sectionId) return WORKSPACE_DEMO_PATH;
  const query = new URLSearchParams({ section: sectionId });
  if (groupId) query.set('group', groupId);
  if (leafId) query.set('leaf', leafId);
  return `${WORKSPACE_DEMO_PATH}?${query.toString()}`;
}
/**
 * Finds a navigation node by its stable id or path and records its parent chain.
 *
 * @param nodes Navigation subtree to search in display order.
 * @param id Node id or path to match.
 * @param ancestors Parent nodes leading to the current subtree.
 *
 * @return The matching node and its ancestors, or `undefined` when the subtree has no match.
 */
function findNode(
  nodes: DocsHostTreeNode[],
  id: string,
  ancestors: DocsHostTreeNode[] = [],
): { node: DocsHostTreeNode; ancestors: DocsHostTreeNode[] } | undefined {
  for (const node of nodes) {
    if (node.origName === id || node.path === id) return { node, ancestors };
    const child = node.children ? findNode(node.children, id, [...ancestors, node]) : undefined;
    if (child) return child;
  }
  return undefined;
}
/**
 * Resolves an id, repository path, pathname, or route-like string to a demo document.
 *
 * The query and hash are removed before path and final-segment matches are tried, allowing
 * workspace navigation values to share this lookup.
 *
 * @param state Demo store containing documents to search.
 * @param value Candidate document id, path, pathname, or route value.
 *
 * @return The first matching document, or `undefined` for a non-string or unknown value.
 */
function findDocument(
  state: WorkspaceDemoState,
  value: unknown,
): WorkspaceDemoDocument | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const c =
    value.split(TerraQualityRegex.REGEX_PATTERN_REGEX_4(), 1)[0]?.replace(G_REGEX(), '') ?? value;
  const leafName = c.split('/').at(-1)?.replace(MD_MDX_I_REGEX, '') ?? c;
  return Object.values(state.documents).find(
    (d) =>
      d.id === value ||
      d.path === value ||
      d.pathname === value ||
      d.path.replace(MD_MDX_I_REGEX, '') === c ||
      d.id === leafName ||
      d.path.endsWith(`/${leafName}.mdx`),
  );
}
/**
 * Converts a title or path segment to the lowercase hyphenated form used for fixture ids.
 *
 * @param value Text to normalize into a segment.
 *
 * @return A slug with punctuation collapsed to hyphens, or `untitled` when it is empty.
 */
function slug(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(TerraQualityRegex.REGEX_A_Z0_9_G_REGEX(), '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  );
}
/**
 * Chooses a slug that is unused by both documents and navigation nodes.
 *
 * @param state Current fixture tree and document map.
 * @param proposed Title or id to turn into the initial slug.
 *
 * @return The slug, adding a numeric suffix when the proposed id is already in use.
 */
function uniqueId(state: WorkspaceDemoState, proposed: string): string {
  let candidate = slug(proposed);
  let index = 2;
  while (state.documents[candidate] || findNode(state.tree, candidate)) {
    candidate = `${slug(proposed)}-${index}`;
    index += 1;
  }
  return candidate;
}
/**
 * Copies a navigation subtree and assigns each node its read or write permission and route.
 * Branches carry section and group selections; leaves also select their document.
 *
 * @param nodes Navigation nodes to copy.
 * @param readOnly Whether copied nodes should advertise read-only permission.
 * @param sectionId Section selected by the current branch ancestry.
 * @param groupId Group selected by the current branch ancestry for leaf routes.
 *
 * @return A new navigation subtree with fixture routes and permissions added.
 */
function withRoutes(
  nodes: DocsHostTreeNode[],
  readOnly: boolean,
  sectionId?: string,
  groupId?: string,
): DocsHostTreeNode[] {
  return nodes.map((n) => {
    if (n.type === 'branch') {
      const nSection = sectionId ?? n.origName;
      return {
        ...n,
        permission: readOnly ? 'read' : 'write',
        url: sectionId ? buildWorkspaceRoute(nSection, n.origName) : buildWorkspaceRoute(nSection),
        children: withRoutes(
          n.children ?? [],
          readOnly,
          nSection,
          sectionId ? n.origName : undefined,
        ),
      };
    }
    return {
      ...n,
      permission: readOnly ? 'read' : 'write',
      url: buildWorkspaceRoute(sectionId, groupId, n.origName),
    };
  });
}
/**
 * Finds the section and immediate group that contain a document leaf.
 *
 * @param state Navigation tree used to locate the document.
 * @param leafId Document id or path identifying the leaf.
 *
 * @return Its section and optional group ids, falling back to the first section or `overview`.
 */
function sectionForLeaf(
  state: WorkspaceDemoState,
  leafId: string,
): { sectionId: string; groupId?: string } {
  const branches = (findNode(state.tree, leafId)?.ancestors ?? []).filter(
    (n) => n.type === 'branch',
  );
  return {
    sectionId: branches[0]?.origName ?? state.tree[0]?.origName ?? 'overview',
    ...(branches[1] ? { groupId: branches[1].origName } : {}),
  };
}
/**
 * Removes the first matching node from a navigation tree, searching branches recursively.
 *
 * @param nodes Mutable navigation nodes to search and update.
 * @param id Node id or path to remove.
 *
 * @return Whether a matching node was found and removed.
 */
function removeNodeById(nodes: DocsHostTreeNode[], id: string): boolean {
  const index = nodes.findIndex((n) => n.origName === id || n.path === id);
  if (index >= 0) {
    nodes.splice(index, 1);
    return true;
  }
  for (const node of nodes) {
    if (node.children && removeNodeById(node.children, id)) return true;
  }
  return false;
}
/**
 * Replaces the first matching node in a navigation tree with the callback's result.
 *
 * @param nodes Mutable navigation nodes to search and update.
 * @param id Node id or path to match.
 * @param update Transformation applied to the matching node.
 * @return Whether a matching node was found and replaced.
 */
function updateNodeById(
  nodes: DocsHostTreeNode[],
  id: string,
  update: (node: DocsHostTreeNode) => DocsHostTreeNode,
): boolean {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!node) continue;
    if (node.origName === id || node.path === id) {
      nodes[index] = update(node);
      return true;
    }
    if (node.children && updateNodeById(node.children, id, update)) return true;
  }
  return false;
}
/**
 * Creates the browser-local host adapter used by the editable Salesphere workspace demo.
 *
 * The adapter exposes the Docs action contract over local storage and disables mutation
 * capabilities when `readOnly` is true.
 *
 * @param readOnly Whether the host should advertise write, reorder, attachment, and history access.
 *
 * @return A host adapter that resolves demo routes and reads or mutates the browser fixture.
 */
export function createWorkspaceDemoHost(readOnly = false): DocsHostAdapter {
  return {
    capabilities: {
      read: true,
      write: !readOnly,
      reorder: !readOnly,
      attachments: !readOnly,
      export: true,
      history: !readOnly,
      publish: false,
    },
    rootPath: WORKSPACE_DEMO_PATH,
    homePath: WORKSPACE_DEMO_PATH,
    siteTitle: 'Salesphere Docs',
    siteDescription: 'Product and engineering documentation.',
    assetUrl: () => undefined,
    /**
     * Resolves demo query parameters to a document or the first page in the selected branch.
     *
     * @param value Browser path, query, and fragment supplied by the Docs workspace.
     *
     * @return The selected section, optional group and leaf, target id, and original pathname.
     */
    resolveRoute(value) {
      const url = new URL(value, 'http://localhost');
      const state = readWorkspaceDemoState();
      const requestedLeaf = url.searchParams.get('leaf');
      const requestedSection = url.searchParams.get('section');
      const requestedGroup = url.searchParams.get('group');
      const requestedDocument = requestedLeaf ? findDocument(state, requestedLeaf) : undefined;
      const requestedSectionMatch = requestedSection
        ? findNode(state.tree, requestedSection)
        : undefined;
      const requestedGroupMatch = requestedGroup ? findNode(state.tree, requestedGroup) : undefined;
      /**
       * Selects the first document leaf beneath a navigation node, preserving tree order.
       *
       * @param node Branch or leaf whose subtree should be searched.
       *
       * @return The first matching fixture document, or `undefined` when the subtree is empty.
       */
      const firstLeaf = (node: DocsHostTreeNode | undefined): WorkspaceDemoDocument | undefined => {
        if (!node) return undefined;
        if (node.type === 'leaf') return state.documents[node.origName];
        for (const child of node.children ?? []) {
          const found = firstLeaf(child);
          if (found) return found;
        }
        return undefined;
      };
      const document =
        requestedDocument ??
        firstLeaf(requestedGroupMatch?.node ?? requestedSectionMatch?.node) ??
        state.documents.salesphere ??
        Object.values(state.documents)[0];
      const position = document ? sectionForLeaf(state, document.id) : { sectionId: 'overview' };
      const requestedGroupAncestors = (requestedGroupMatch?.ancestors ?? []).filter(
        (n) => n.type === 'branch',
      );
      const sectionId = requestedDocument
        ? position.sectionId
        : requestedSectionMatch?.node.type === 'branch'
          ? requestedSectionMatch.node.origName
          : (requestedGroupAncestors[0]?.origName ?? position.sectionId);
      const groupId = requestedDocument
        ? position.groupId
        : requestedGroupMatch?.node.type === 'branch' && requestedGroupAncestors.length > 0
          ? requestedGroupMatch.node.origName
          : undefined;
      const leafId = document?.id;
      return {
        sectionId,
        ...(groupId ? { groupId } : {}),
        ...(leafId ? { leafId } : {}),
        targetId: leafId ?? groupId ?? sectionId,
        pathname: `${url.pathname}${url.search}${url.hash}`,
      };
    },
    buildRoute: buildWorkspaceRoute,
    /**
     * Resolves a document path or branch id to its demo URL, falling back to the demo root.
     *
     * @param value Repository path, route, or navigation node id to resolve.
     *
     * @return The selected document or branch route, or the workspace demo root when unmatched.
     */
    routePath(value) {
      const state = readWorkspaceDemoState();
      const requested = value.replace(G_REGEX(), '');
      const document =
        findDocument(state, requested) ?? findDocument(state, requested.split('/').at(-1));
      if (document) return routeForWorkspaceDocument(state, document);
      const branch = findNode(state.tree, requested)?.node;
      if (branch?.type === 'branch') {
        const parent =
          findNode(state.tree, branch.origName)?.ancestors.filter((n) => n.type === 'branch') ?? [];
        return parent.length > 0
          ? buildWorkspaceRoute(parent[0]?.origName, branch.origName)
          : buildWorkspaceRoute(branch.origName);
      }
      return WORKSPACE_DEMO_PATH;
    },
    isDevelopmentOrigin: (o) => /^(?:https?:\/\/)?(?:localhost|127\.0\.0\.1)(?::\d+)?$/u.test(o),
    /**
     * Implements Docs host actions against the local demo document and asset store.
     * Reads return fixture data; writes update the in-memory state and persist it when changed.
     *
     * @param op Host action name identifying a read or write operation.
     * @param input Operation-specific payload or uploaded `FormData`.
     *
     * @return Fixture action data, or an error for an invalid source merge.
     */
    async invoke<T = unknown>(
      op: DocsActionOperation,
      input?: unknown,
    ): Promise<DocsActionResult<T>> {
      if (typeof window !== 'undefined') {
        const browserWindow = window as Window & {
          __docsActionCalls?: Array<{ operation: string; input?: unknown }>;
        };
        browserWindow.__docsActionCalls ??= [];
        browserWindow.__docsActionCalls.push({ operation: op, input: clone(input) });
      }
      const request = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
      const state = readWorkspaceDemoState();
      let data: unknown = null;
      let changed = false;
      if (op === 'read.doc.list')
        data = request.type === 'nav' ? withRoutes(state.tree, readOnly) : [];
      else if (op === 'read.doc.get') {
        data = clone(findDocument(state, request.path ?? request.id) ?? null);
      } else if (op === 'read.doc.attachments') {
        if (Array.isArray(request.paths)) {
          data = Object.fromEntries(
            request.paths
              .filter((candidatePath): candidatePath is string => typeof candidatePath === 'string')
              .map((candidatePath) => [
                candidatePath,
                clone(findDocument(state, candidatePath)?.attachments ?? []),
              ]),
          );
        } else data = clone(findDocument(state, request.path)?.attachments ?? []);
      } else if (op === 'read.asset.get') {
        data = new Uint8Array(state.assets[String(request.path ?? '')]?.bytes ?? []).buffer;
      } else if (op === 'read.doc.resolvePath') {
        const title = typeof request.title === 'string' ? request.title : 'Untitled';
        const parent = typeof request.path === 'string' ? request.path.replace(G_REGEX(), '') : '';
        const base = parent ? `${parent}/` : '';
        let candidatePath = `${base}${slug(title)}.mdx`;
        let suffix = 2;
        while (findDocument(state, candidatePath)) {
          candidatePath = `${base}${slug(title)}-${suffix}.mdx`;
          suffix += 1;
        }
        data = { path: candidatePath, dir: parent || '.' };
      } else if (op === 'read.util.pathname') {
        data = findDocument(state, request.path)?.pathname ?? WORKSPACE_DEMO_PATH;
      } else if (op === 'read.util.node') {
        if (request.op === 'name') data = slug(String(request.val ?? 'untitled'));
        else {
          const found = findNode(state.tree, String(request.val ?? request.path ?? ''))?.node;
          data = found ? { title: found.title, origName: found.origName, type: found.type } : {};
        }
      } else if (op === 'read.source.body') {
        data = markdownToDocsValue(typeof request.source === 'string' ? request.source : '');
      } else if (op === 'read.tsdocs') {
        data = { docs: [], scopes: [] };
      } else if (op === 'write.doc.createSection') {
        const title = String(request.title ?? 'Untitled Section');
        const sectionId = uniqueId(state, title);
        const groupId = `${sectionId}-general`;
        const leafId = `${sectionId}-untitled`;
        const sectionPath = slug(title);
        const group: DocsHostTreeNode = {
          type: 'branch',
          origName: groupId,
          title: 'General',
          path: `${sectionPath}/general`,
          children: [],
        };
        const newDocument = makeDocument(
          leafId,
          `${sectionPath}/general/untitled.mdx`,
          'Untitled',
          '',
          [],
        );
        newDocument.pathname = buildWorkspaceRoute(sectionId, groupId, leafId);
        state.tree.push({
          type: 'branch',
          origName: sectionId,
          title,
          path: sectionPath,
          hue: 165,
          firstLeafUrl: buildWorkspaceRoute(sectionId, groupId, leafId),
          children: [group],
        });
        state.documents[leafId] = newDocument;
        group.children?.push({
          type: 'leaf',
          origName: leafId,
          title: 'Untitled',
          path: newDocument.path,
          permission: readOnly ? 'read' : 'write',
        });
        data = { _id: sectionId, title };
        changed = true;
      } else if (op === 'write.doc.createGroup') {
        const title = String(request.title ?? 'Untitled Group');
        const groupId = uniqueId(state, title);
        const sectionId = String(request.sectionId ?? 'overview');
        const section = findNode(state.tree, sectionId)?.node;
        if (section?.type === 'branch') {
          section.children ??= [];
          section.children.push({
            type: 'branch',
            origName: groupId,
            title,
            path: `${String(section.path ?? sectionId)}/${groupId}`,
            children: [],
          });
          data = { _id: groupId, title };
          changed = true;
        }
      } else if (
        op === 'write.doc.editor' &&
        typeof request.path === 'string' &&
        findNode(state.tree, request.path)?.node.type === 'branch'
      ) {
        const branch = findNode(state.tree, String(request.path))?.node;
        if (branch) {
          branch.title = String(request.title ?? branch.title ?? branch.origName);
          data = { _id: branch.origName, title: branch.title };
          changed = true;
        }
      } else if (op === 'write.doc.editor' || op === 'write.doc.save') {
        const documentPath = String(request.path ?? 'overview/start-here/untitled.mdx');
        const existing = findDocument(state, documentPath);
        const rawId = documentPath.split('/').at(-1)?.replace(MD_MDX_I_REGEX, '') ?? 'untitled';
        const id = existing?.id ?? uniqueId(state, rawId);
        const source = typeof request.source === 'string' ? request.source : undefined;
        const content = Array.isArray(request.content)
          ? clone(request.content)
          : source !== undefined
            ? markdownToDocsValue(source)
            : clone(existing?.content ?? []);
        if (op === 'write.doc.save' && existing) {
          existing.versions.unshift({
            contentJson: JSON.stringify(existing.content),
            body: clone(existing.content) as never,
            description: existing.description,
            title: existing.title,
            savedAt: new Date().toISOString(),
          });
        }
        const newDocument: WorkspaceDemoDocument = {
          ...(existing ??
            makeDocument(id, documentPath, String(request.title ?? rawId), '', content)),
          id,
          path: documentPath,
          title: typeof request.title === 'string' ? request.title : (existing?.title ?? rawId),
          description:
            typeof request.description === 'string'
              ? request.description
              : (existing?.description ?? ''),
          content,
          source: source ?? docsValueToMarkdown(content as never),
          updatedAt: new Date().toISOString(),
        };
        const newPosition = existing
          ? sectionForLeaf(state, existing.id)
          : { sectionId: 'overview', groupId: 'start-here' };
        newDocument.pathname = buildWorkspaceRoute(newPosition.sectionId, newPosition.groupId, id);
        state.documents[id] = newDocument;
        if (!existing) {
          const node: DocsHostTreeNode = {
            type: 'leaf',
            origName: newDocument.id,
            title: newDocument.title,
            description: newDocument.description,
            path: newDocument.path,
            permission: 'write',
          };
          const parent = findNode(state.tree, String(request.parentId ?? 'start-here'))?.node;
          if (parent?.type === 'branch') {
            parent.children ??= [];
            if (!parent.children.some((c) => c.type === 'leaf' && c.origName === newDocument.id)) {
              parent.children.push(node);
            }
          } else {
            const group = state.tree[0]?.children?.find((c) => c.type === 'branch');
            if (group) group.children = [...(group.children ?? []), node];
          }
        }
        updateNodeById(state.tree, existing?.id ?? id, (n) => ({
          ...n,
          origName: id,
          path: documentPath,
          title: newDocument.title,
          description: newDocument.description,
        }));
        data = clone(newDocument);
        changed = true;
      } else if (op === 'write.doc.retitle') {
        const id = String(request.id ?? '');
        const title = String(request.title ?? 'Untitled');
        const document = findDocument(state, id);
        if (document) {
          document.title = title;
          document.updatedAt = new Date().toISOString();
        }
        updateNodeById(state.tree, id, (n) => ({ ...n, title }));
        changed = true;
      } else if (op === 'write.doc.hue') {
        updateNodeById(state.tree, String(request.id ?? ''), (n) => ({
          ...n,
          hue: Number(request.hue),
        }));
        changed = true;
      } else if (op === 'write.doc.reorder') {
        const field = request.field === 'leaves' ? 'leaf' : 'branch';
        const references = (Array.isArray(request.items) ? request.items : [])
          .map((i) =>
            i && typeof i === 'object' && '_ref' in i && typeof i._ref === 'string' ? i._ref : '',
          )
          .filter(Boolean);
        const parent = findNode(state.tree, typeof request.id === 'string' ? request.id : '')?.node;
        if (parent?.type === 'branch') {
          const reorderable = parent.children?.filter((n) => n.type === field) ?? [];
          const ordered: DocsHostTreeNode[] = [];
          for (let index = 0; index < references.length; index += 1) {
            const reference = references[index];
            const node = reorderable.find((c) => c.origName === reference || c.path === reference);
            if (node) ordered.push(node);
          }
          parent.children = [
            ...ordered,
            ...reorderable.filter(
              (n) => !ordered.some((orderedNode) => orderedNode.origName === n.origName),
            ),
            ...(parent.children?.filter((n) => n.type !== field) ?? []),
          ];
        }
        changed = true;
      } else if (op === 'write.doc.retargetSources') {
        const target = findDocument(state, request.targetId);
        const sourceIds = Array.isArray(request.sourceIds)
          ? request.sourceIds.filter((v): v is string => typeof v === 'string')
          : [];
        if (!target || sourceIds.length === 0) {
          return { error: new Error('The merge target or source pages could not be found.') };
        }
        /**
         * Produces a stable key for detecting attachments already on the merge target.
         *
         * @param attachment Attachment whose identity should be compared.
         *
         * @return Its host id when available, otherwise a path/name composite key.
         */
        const attachmentKey = (attachment: DocsHostAttachment): string =>
          attachment.id || `${attachment.path}\u0000${attachment.name}`;
        const seenAttachments = new Set(target.attachments.map(attachmentKey));
        for (const sourceId of sourceIds) {
          const source = findDocument(state, sourceId);
          if (!source || source.id === target.id) continue;
          for (const attachment of source.attachments) {
            const key = attachmentKey(attachment);
            if (!seenAttachments.has(key)) {
              seenAttachments.add(key);
              target.attachments.push(clone(attachment));
            }
            const asset = state.assets[attachment.path];
            if (asset) asset.docId = target.id;
          }
        }
        data = true;
        changed = true;
      } else if (op === 'write.doc.rm') {
        const requestedPath = String(request.path ?? '');
        const document = findDocument(state, requestedPath);
        if (document) {
          delete state.documents[document.id];
          for (const [assetPath, asset] of Object.entries(state.assets)) {
            if (asset.docId === document.id) delete state.assets[assetPath];
          }
          removeNodeById(state.tree, document.id);
        } else {
          let found = findNode(state.tree, requestedPath);
          if (!found && requestedPath.includes('?')) {
            const route = new URL(requestedPath, 'http://localhost');
            const routeNodeId =
              route.searchParams.get('group') ?? route.searchParams.get('section');
            if (routeNodeId) found = findNode(state.tree, routeNodeId);
          }
          if (found) {
            /**
             * Deletes document records for every leaf beneath a branch before removing it.
             *
             * @param node Leaf or branch whose descendant document records should be deleted.
             *
             * @return Nothing; matching entries are removed from the current fixture state.
             */
            const removeDocumentsForNode = (node: DocsHostTreeNode): void => {
              if (node.type === 'leaf') {
                delete state.documents[node.origName];
                return;
              }
              for (const child of node.children ?? []) removeDocumentsForNode(child);
            };
            removeDocumentsForNode(found.node);
            removeNodeById(state.tree, found.node.origName);
          }
        }
        data = null;
        changed = true;
      } else if (op === 'write.doc.commit') {
        const currentPath = String(request.cur ?? '');
        const nPath = String(request.next ?? currentPath);
        const document = findDocument(state, currentPath);
        if (document) {
          const priorId = document.id;
          const nId = nPath.split('/').at(-1)?.replace(MD_MDX_I_REGEX, '') ?? priorId;
          delete state.documents[priorId];
          document.id = nId;
          document.path = nPath;
          if (typeof request.title === 'string') document.title = request.title;
          if (typeof request.source === 'string') {
            document.source = request.source;
            document.content = markdownToDocsValue(request.source);
          }
          state.documents[nId] = document;
          const position = sectionForLeaf(state, priorId);
          document.pathname = buildWorkspaceRoute(position.sectionId, position.groupId, nId);
          updateNodeById(state.tree, priorId, (n) => ({
            ...n,
            origName: nId,
            path: nPath,
            title: document.title,
          }));
          data = clone(document);
          changed = true;
        }
      } else if (op === 'write.doc.versions.get') {
        data = clone(findDocument(state, request.path)?.versions ?? []);
      } else if (op === 'write.asset.upload') {
        const form = input instanceof FormData ? input : null;
        const uploaded = form?.get('file');
        const file = uploaded instanceof Blob ? uploaded : null;
        if (file) {
          const fileName = uploaded instanceof File ? uploaded.name : 'attachment.bin';
          const id = `attachment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
          const assetPath = `/assets/${id}/${fileName.replace(/[^a-zA-Z0-9._-]+/g, '-')}`;
          const doc = findDocument(state, String(form?.get('path') ?? ''));
          const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
          const asset: WorkspaceDemoAsset = {
            id,
            name: fileName,
            path: assetPath,
            type: file.type || 'application/octet-stream',
            size: file.size,
            bytes,
            docId: doc?.id ?? 'salesphere',
          };
          state.assets[assetPath] = asset;
          const owner = doc ? state.documents[asset.docId] : state.documents.salesphere;
          if (owner) {
            owner.attachments.push({
              id,
              name: fileName,
              path: assetPath,
              type: asset.type || 'application/octet-stream',
              size: asset.size ?? bytes.length,
            });
          }
          data = { id, path: assetPath, name: fileName, compressedSize: bytes.length };
          changed = true;
        }
      } else if (op === 'write.attachment.rm') {
        const document = findDocument(state, request.docPath);
        const attachmentId = String(request.attachmentKey ?? '');
        const attachment = document?.attachments.find((i) => i.id === attachmentId);
        if (document)
          document.attachments = document.attachments.filter((i) => i.id !== attachmentId);
        if (attachment) delete state.assets[attachment.path];
        changed = true;
      } else if (op === 'write.attachment.rename') {
        const title = String(request.name ?? request.title ?? 'attachment');
        const attachment = findDocument(state, request.docPath)?.attachments.find(
          (i) => i.id === String(request.attachmentKey ?? ''),
        );
        if (attachment) attachment.name = title;
        const asset = attachment ? state.assets[attachment.path] : undefined;
        if (asset) asset.name = title;
        changed = true;
      } else if (op === 'write.asset.delete') {
        const assetPath = String(request.url ?? request.path ?? '');
        const asset = state.assets[assetPath];
        if (asset) {
          delete state.assets[assetPath];
          const owner = state.documents[asset.docId];
          if (owner) owner.attachments = owner.attachments.filter((i) => i.id !== asset.id);
        }
        changed = true;
      }
      if (changed) writeWorkspaceDemoState(state);
      return { data: data as T };
    },
  };
}
/**
 * Builds the demo URL for a document after finding its section and group.
 *
 * @param state Current demo state containing navigation and document records.
 * @param value Document id, path, or document record to route to.
 * @param routeBuilder Host route builder, defaulting to the demo query format.
 *
 * @return A document URL, or the workspace demo root when the document cannot be resolved.
 */
export function routeForWorkspaceDocument(
  state: WorkspaceDemoState,
  value: string | WorkspaceDemoDocument,
  routeBuilder: DocsHostAdapter['buildRoute'] = buildWorkspaceRoute,
): string {
  const document = typeof value === 'string' ? findDocument(state, value) : value;
  if (!document) return WORKSPACE_DEMO_PATH;
  const position = sectionForLeaf(state, document.id);
  return (routeBuilder ?? buildWorkspaceRoute)(position.sectionId, position.groupId, document.id);
}
/**
 * Returns a copied navigation tree with URLs and read/write permissions for the demo host.
 *
 * @param state Current demo state whose tree should be routed.
 * @param readOnly Whether each copied node should be marked read-only.
 *
 * @return The recursively copied tree with demo routes and permissions applied.
 */
export function routedWorkspaceTree(
  state: WorkspaceDemoState,
  readOnly: boolean,
): DocsHostTreeNode[] {
  return withRoutes(state.tree, readOnly);
}
