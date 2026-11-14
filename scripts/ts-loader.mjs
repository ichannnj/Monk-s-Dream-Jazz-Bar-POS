import { pathToFileURL } from 'node:url';
import { resolve as pathResolve } from 'node:path';

const frontendPackageUrl = pathToFileURL(pathResolve(process.cwd(), 'frontend/package.json')).href;

export async function resolve(specifier, context, nextResolve) {
  let target = specifier;
  if (specifier.startsWith('@/')) {
    target = pathToFileURL(pathResolve(process.cwd(), 'frontend/src', specifier.slice(2))).href;
  }

  if (target.startsWith('.') || target.startsWith('/') || target.startsWith('file://')) {
    try {
      return await nextResolve(target, context);
    } catch (err) {
      if (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
        for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx', '.js', '/index.js']) {
          try {
            return await nextResolve(target + ext, context);
          } catch {}
        }
      }
      throw err;
    }
  }

  try {
    return await nextResolve(target, context);
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      // Try resolving package from frontend/node_modules
      try {
        return await nextResolve(target, { ...context, parentURL: frontendPackageUrl });
      } catch {}
    }
    throw err;
  }
}
