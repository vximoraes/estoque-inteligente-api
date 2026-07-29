import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadModels() {
  const models = [];
  const modulesDir = path.join(__dirname, '../modules');

  for (const moduleName of fs.readdirSync(modulesDir)) {
    const moduleDir = path.join(modulesDir, moduleName);
    if (!fs.statSync(moduleDir).isDirectory()) continue;

    for (const file of fs.readdirSync(moduleDir)) {
      if (!file.endsWith('Model.ts') && !file.endsWith('Model.js')) continue;
      if (file.includes('.test.') || file.includes('.spec.')) continue;

      const modelPath = path.join(moduleDir, file);
      const fileUrl = pathToFileURL(modelPath).href;
      const module = await import(fileUrl);
      const model = module.default || module;
      const modelName = path.basename(file).replace(/Model\.(ts|js)$/, '');
      models.push({ model, name: modelName });
    }
  }

  return models;
}

export default loadModels;
