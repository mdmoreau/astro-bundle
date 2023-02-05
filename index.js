import path from 'node:path';
import fs from 'node:fs';
import glob from 'glob';
import esbuild from 'esbuild';

export default function() {
  let base, outPath, assetsDir, astroDir;

  const script = (src) => {
    return `<script type="module" src="${path.join(base, src)}"></script>`;
  };

  return {
    name: 'astro-bundle',
    hooks: {
      'astro:config:setup': ({ config, updateConfig }) => {
        base = config.base;
        outPath = config.outDir.pathname;
        assetsDir = 'assets';
        astroDir = config.build.assets;

        updateConfig({
          vite: {
            build: {
              assetsInlineLimit: 0,
              cssCodeSplit: false,
              rollupOptions: {
                output: {
                  entryFileNames: path.join(astroDir, '[hash].entry.js'),
                  assetFileNames: path.join(assetsDir, '[name][extname]'),
                }
              }
            }
          }
        })
      },
      'astro:build:done': () => {
        const htmlFiles = glob.sync(path.join(outPath, '**/*.html'));
        const jsFiles = glob.sync(path.join(outPath, '**/*.entry.js'));
        const bundle = path.join(assetsDir, 'script.js');

        esbuild.buildSync({
          stdin: { contents: '' },
          inject: jsFiles,
          bundle: true,
          minify: true,
          outfile: path.join(outPath, bundle),
        });

        for (const htmlFile of htmlFiles) {
          let data = fs.readFileSync(htmlFile, 'utf8');
          data = data.replace(/<\/head>/, `${script(bundle)}</head>`);

          for (const jsFile of jsFiles) {
            const src = jsFile.split(outPath)[1];
            data = data.replace(script(src), '');
          }

          fs.writeFileSync(htmlFile, data);
        }

        fs.rmSync(path.join(outPath, astroDir), { recursive: true });
      }
    }
  }
}
