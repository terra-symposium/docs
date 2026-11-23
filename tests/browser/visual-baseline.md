# Docs visual baseline

The screenshots in `visual.spec.ts-snapshots/` capture the Docs package's
`/parity-demo/` fixture on 23 November 2026. The fixture uses local Salesphere
content with hue `145`; it needs neither Sanity data nor a signed-in account.
Each test sets its own viewport and interaction state before capture.

The snapshot run uses a pixel difference ratio of `0.002`. It excludes only
Astro's injected development toolbar and overlay. The current desktop, mobile,
Edit toolbar, and attachment-dialog captures were visually inspected before
the baseline replaced the obsolete pre-abstraction Website images. Review
future differences against the intended Docs design before updating snapshots.
The 23 November refresh records the reviewed 10–12px upward shift in page
content and the matching positions in menus and dialogs; the interaction layout
and visual treatment remain unchanged.
