// Re-export email rendering utilities from the shared backend source.
// Wrangler (esbuild) bundles these cross-service imports at build time.
// Requires the `nodejs_compat` compatibility flag for AsyncLocalStorage + React SSR.

export {
  renderLayout,
  LAYOUTS,
} from '../../backend/src/emails/render.js';

export { THEMES, themeToTailwindConfig } from '../../backend/src/emails/themes.js';

export type { LayoutName } from '../../backend/src/emails/render.js';
