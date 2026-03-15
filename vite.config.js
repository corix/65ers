import { defineConfig } from 'vite';
import { statSync, existsSync } from 'fs';
import { join } from 'path';

let exportedMtime = null;
const exportedPath = join(process.cwd(), 'fixtures/exported-games.json');
if (existsSync(exportedPath)) {
  try {
    exportedMtime = statSync(exportedPath).mtime.toISOString();
  } catch (_) {}
}

export default defineConfig({
  define: {
    __EXPORTED_GAMES_MTIME__: JSON.stringify(exportedMtime),
  },
});
