import fs from 'node:fs';
import * as yaml from 'js-yaml';

const sourcePath = 'syntaxes/styio.tmLanguage.yaml';
const targetPath = 'syntaxes/styio.tmLanguage.json';

const grammar = yaml.load(fs.readFileSync(sourcePath, 'utf8'));
const expected = `${JSON.stringify(grammar, null, 2)}\n`;
const actual = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : '';

if (actual !== expected) {
  console.error(`${targetPath} is out of date. Run npm run grammar:build.`);
  process.exit(1);
}

console.log(`${targetPath} is current.`);
