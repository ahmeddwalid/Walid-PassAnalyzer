import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/Walid-PassAnalyzer/',
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Enable code splitting
        rollupOptions: {
          output: {
            manualChunks: {
              // Separate vendor libraries
              'vendor-crypto': ['zxcvbn'],
              'vendor-pdf': ['jspdf'],
              // Separate React and DOM
              'react-vendor': ['react', 'react-dom'],
              // Separate services
              'services': [
                './services/CryptoService.ts',
                './services/DictionaryService.ts',
                './services/PasswordAnalysisService.ts',
                './services/ClipboardService.ts',
                './services/ExportService.ts'
              ],
              // Separate components by feature
              'generator-components': [
                './components/PasswordGenerator.tsx',
                './components/PassphraseGenerator.tsx'
              ],
              'comparison-components': [
                './components/PasswordComparison.tsx',
                './components/ComparisonInput.tsx',
                './components/ComparisonResults.tsx'
              ],
              'dictionary-components': [
                './components/DictionaryManager.tsx'
              ]
            }
          }
        },
        // Optimize chunk size
        chunkSizeWarningLimit: 1000,
        // Enable minification
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: mode === 'production',
            drop_debugger: mode === 'production',
            pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : []
          }
        },
        // Enable source maps for debugging
        sourcemap: mode !== 'production'
      },
      // Optimize dependencies
      optimizeDeps: {
        include: ['react', 'react-dom', 'zxcvbn'],
        exclude: ['jspdf'] // Load PDF library on demand
      }
      // If you have a 'plugins' array (e.g., for React or Vue), it would go here too.
      // plugins: [react()], 
    };
});
