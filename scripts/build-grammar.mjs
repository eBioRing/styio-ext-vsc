import fs from 'node:fs';
import * as yaml from 'js-yaml';

const sourcePath = 'syntaxes/styio.tmLanguage.yaml';
const targetPath = 'syntaxes/styio.tmLanguage.json';

const source = fs.readFileSync(sourcePath, 'utf8');
const grammar = yaml.load(source);
fs.writeFileSync(targetPath, `${JSON.stringify(grammar, null, 2)}\n`, 'utf8');
