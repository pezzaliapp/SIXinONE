/**
 * Minimal app boot — populated in later steps with the full panel.
 * Step 1 just renders a placeholder so `vite build` produces a working page.
 */
export function bootApp(root: HTMLElement): void {
  root.innerHTML = `
    <main class="boot">
      <h1>SIXinONE</h1>
      <p class="tagline">A Tribute to the Moog Memorymoog (1982)</p>
      <p class="muted">Unofficial educational simulator. Building…</p>
    </main>
  `;
}
