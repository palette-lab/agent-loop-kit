import { buildCatalog } from '../src/looplib.mjs';
const out = process.argv[2] ?? 'dist';
const result = buildCatalog(out);
console.log(`Built ${result.count} loops into ${result.outDir}`);
