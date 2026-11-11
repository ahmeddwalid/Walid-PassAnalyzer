import { createHash } from 'node:crypto';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * A tiny synchronous theme initializer runs before paint. It has no network
 * dependency and no access to candidate data. In production it is authorized
 * by a SHA-256 hash in the CSP rather than a permissive 'unsafe-inline'.
 */
const THEME_INIT = `(() => {
  try {
    const stored = localStorage.getItem('pa.theme');
    const theme = stored === 'dark' || stored === 'light' ? stored : 'dark';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = 'dark';
  }
})();`;

function productionCsp(): Plugin {
  return {
    name: 'passanalyzer-production-csp',
    enforce: 'post',
    transformIndexHtml(html, context) {
      let output = html.replace('__THEME_INIT__', THEME_INIT);
      if (context.server) return output;

      const inlineScript = /<script>([\s\S]*?)<\/script>/.exec(output)?.[1];
      if (!inlineScript) {
        throw new Error('The theme initializer was not found in the built HTML.');
      }
      const themeHash = createHash('sha256').update(inlineScript).digest('base64');

      const policy = [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        `script-src 'self' 'sha256-${themeHash}'`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self' https://api.pwnedpasswords.com",
        "worker-src 'self'",
        "form-action 'none'",
        "frame-src 'none'",
      ].join('; ');

      output = output.replace(
        '</title>',
        `</title>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
      );
      return output;
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), productionCsp()],
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
