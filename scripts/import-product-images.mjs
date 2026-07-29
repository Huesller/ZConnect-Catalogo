import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const catalogPath = path.join(rootDir, 'public', 'data', 'catalog.v5.json');
const overridesPath = path.join(rootDir, 'scripts', 'image-overrides.json');
const imagesDir = path.join(rootDir, 'public', 'product-images');
const reportsDir = path.join(rootDir, 'reports');
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function fail(message) {
  console.error(`\nERRO: ${message}\n`);
  process.exit(1);
}

function normalizeCode(value) {
  return String(value ?? '').trim().toUpperCase();
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function listImages(directory) {
  const results = [];
  const pending = [directory];

  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(fullPath);
      } else if (allowedExtensions.has(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  }

  return results.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function findCode(filename, codes) {
  const base = normalizeCode(path.basename(filename, path.extname(filename)));
  const exact = codes.find((code) => base === code);
  if (exact) return exact;

  const tokens = base.split(/[^A-Z0-9]+/).filter(Boolean);
  const tokenMatches = codes.filter((code) => tokens.includes(code));
  return tokenMatches.length === 1 ? tokenMatches[0] : null;
}

function removePreviousImage(code) {
  if (!fs.existsSync(imagesDir)) return;

  for (const entry of fs.readdirSync(imagesDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const extension = path.extname(entry.name).toLowerCase();
    const basename = normalizeCode(path.basename(entry.name, extension));
    if (basename === code && allowedExtensions.has(extension)) {
      fs.unlinkSync(path.join(imagesDir, entry.name));
    }
  }
}

const sourceArg = process.argv.slice(2).join(' ').trim().replace(/^"(.*)"$/, '$1');
if (!sourceArg) fail('Informe a pasta que contem as imagens.');

const sourceDir = path.resolve(sourceArg);
if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
  fail(`Pasta nao encontrada: ${sourceDir}`);
}
if (!fs.existsSync(catalogPath)) {
  fail('Catalogo nao encontrado. Execute npm run update-catalog primeiro.');
}

const catalog = readJson(catalogPath, []);
if (!Array.isArray(catalog) || !catalog.length) fail('O catalogo atual esta vazio ou invalido.');

const catalogCodes = [...new Set(catalog.map((product) => normalizeCode(product.code)).filter(Boolean))]
  .sort((a, b) => b.length - a.length || a.localeCompare(b));
const sourceImages = listImages(sourceDir);
if (!sourceImages.length) fail('Nenhuma imagem JPG, JPEG, PNG ou WEBP foi encontrada.');

const grouped = new Map();
const unmatched = [];

for (const file of sourceImages) {
  const code = findCode(file, catalogCodes);
  if (!code) {
    unmatched.push(file);
    continue;
  }

  const files = grouped.get(code) || [];
  files.push(file);
  grouped.set(code, files);
}

const duplicates = [...grouped.entries()].filter(([, files]) => files.length > 1);
const valid = [...grouped.entries()].filter(([, files]) => files.length === 1);
const overrides = readJson(overridesPath, {});
const imported = [];

fs.mkdirSync(imagesDir, { recursive: true });
fs.mkdirSync(reportsDir, { recursive: true });

for (const [code, [sourceFile]] of valid) {
  const extension = path.extname(sourceFile).toLowerCase() === '.jpeg'
    ? '.jpg'
    : path.extname(sourceFile).toLowerCase();
  const destinationName = `${code}${extension}`;
  const destination = path.join(imagesDir, destinationName);

  removePreviousImage(code);
  fs.copyFileSync(sourceFile, destination);

  const publicPath = `/product-images/${destinationName}`;
  overrides[code] = {
    path: publicPath,
    sourceName: path.basename(sourceFile),
    updatedAt: new Date().toISOString()
  };
  imported.push({ code, source: sourceFile, destination: publicPath });
}

const updatedCatalog = catalog.map((product) => {
  const code = normalizeCode(product.code);
  const imagePath = overrides[code]?.path;
  if (!imagePath) return product;
  return { ...product, image: imagePath, imageFull: imagePath, imageSource: 'local-import' };
});

fs.writeFileSync(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`);
fs.writeFileSync(catalogPath, JSON.stringify(updatedCatalog));

const report = {
  generatedAt: new Date().toISOString(),
  sourceDirectory: sourceDir,
  filesRead: sourceImages.length,
  imported: imported.length,
  unmatched: unmatched.map((file) => path.basename(file)),
  duplicates: duplicates.map(([code, files]) => ({
    code,
    files: files.map((file) => path.basename(file))
  })),
  importedFiles: imported
};
const reportPath = path.join(reportsDir, 'ultima-importacao-imagens.json');
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log('\nIMPORTACAO CONCLUIDA');
console.log(`Arquivos lidos:       ${sourceImages.length}`);
console.log(`Imagens importadas:   ${imported.length}`);
console.log(`Sem produto:          ${unmatched.length}`);
console.log(`Codigos duplicados:   ${duplicates.length}`);
console.log(`Relatorio: ${reportPath}`);

if (duplicates.length) {
  console.log('\nATENCAO: codigos com mais de uma imagem nao foram importados.');
}
if (unmatched.length) {
  console.log('ATENCAO: arquivos sem codigo reconhecido estao listados no relatorio.');
}
