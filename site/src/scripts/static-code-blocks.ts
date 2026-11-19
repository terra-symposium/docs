/** Give authored Markdown fences the same controls as editable Docs code blocks. */
export function enhanceStaticCodeBlocks(root: ParentNode = document): void {
  for (const pre of root.querySelectorAll<HTMLPreElement>(
    '.docs-page-content pre.astro-code:not([data-docs-code-enhanced])',
  )) {
    pre.dataset.docsCodeEnhanced = 'true';
    const language =
      pre.dataset.language ||
      pre.querySelector('code')?.className.match(/language-([\w-]+)/)?.[1] ||
      'text';
    const wrapper = document.createElement('div');
    wrapper.className = 'docs-static-code-block docs-code-block';
    const header = document.createElement('div');
    header.className = 'docs-code-block-header';
    const label = document.createElement('span');
    label.className = 'docs-static-code-language';
    label.textContent = language;
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy';
    copy.setAttribute('aria-label', `Copy ${language} code`);
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(
          pre.querySelector('code')?.textContent ?? pre.textContent ?? '',
        );
        copy.textContent = 'Copied';
        window.setTimeout(() => {
          copy.textContent = 'Copy';
        }, 2000);
      } catch {
        copy.textContent = 'Copy failed';
        window.setTimeout(() => {
          copy.textContent = 'Copy';
        }, 2000);
      }
    });
    header.append(label, copy);
    pre.replaceWith(wrapper);
    wrapper.append(header, pre);
  }
}

enhanceStaticCodeBlocks();
new MutationObserver(() => enhanceStaticCodeBlocks()).observe(document.body, {
  childList: true,
  subtree: true,
});
