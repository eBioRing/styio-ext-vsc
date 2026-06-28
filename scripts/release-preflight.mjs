#!/usr/bin/env node

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const vsceBin = path.join(root, 'node_modules', '@vscode', 'vsce', 'vsce');
const strictReleaseEvidence =
  process.argv.includes('--strict-evidence') || process.env.STYIO_RELEASE_EVIDENCE_STRICT === '1';

const expectedVsixPaths = [
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'SUPPORT.md',
  'assets/icon.png',
  'language-configuration.json',
  'out/extension.js',
  'package.json',
  'snippets/styio.code-snippets',
  'syntaxes/styio.tmLanguage.json'
];

const forbiddenVsixFragments = [
  '.github/',
  '.vscode/',
  '.gitignore',
  '.nvmrc',
  '.python-version',
  '.prettierrc.json',
  'docs/',
  'node_modules/',
  'scripts/',
  'src/',
  'syntaxes/styio.tmLanguage.yaml',
  'test/',
  'tsconfig.json',
  'eslint.config.mjs'
];

const textScanExcludedDirs = new Set(['.git', '.vscode-test', 'dist', 'node_modules', 'out']);

const textScanExtensions = new Set([
  '.json',
  '.md',
  '.mjs',
  '.js',
  '.ts',
  '.yml',
  '.yaml',
  '.txt',
  '.sh',
  '.py'
]);

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function filePath(relativePath) {
  return path.join(root, relativePath);
}

function fileExists(relativePath) {
  return fs.existsSync(filePath(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(filePath(relativePath), 'utf8');
}

function readJson(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    fail(`${relativePath}: invalid JSON (${error.message})`);
    return {};
  }
}

function hasArrayItem(value, item) {
  return Array.isArray(value) && value.includes(item);
}

function run(command, args, label) {
  const completed = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: false
  });

  const output = `${completed.stdout ?? ''}${completed.stderr ?? ''}`;
  if (completed.error) {
    fail(`${label} failed to start: ${completed.error.message}`);
  }
  if (completed.status !== 0) {
    fail(`${label} failed with exit ${completed.status}\n${output.trim()}`);
  }
  return output;
}

function listTextFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.relative(root, absolutePath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (!textScanExcludedDirs.has(entry.name)) {
        files.push(...listTextFiles(absolutePath));
      }
      continue;
    }

    if (textScanExtensions.has(path.extname(entry.name))) {
      files.push(relativePath);
    }
  }
  return files;
}

function validatePackageManifest() {
  const pkg = readJson('package.json');

  const requiredStringFields = {
    name: 'styio-language-support',
    displayName: 'Styio Language Support',
    publisher: 'eBioRing',
    license: 'Apache-2.0',
    icon: 'assets/icon.png',
    qna: 'marketplace',
    main: './out/extension.js'
  };

  for (const [field, expected] of Object.entries(requiredStringFields)) {
    if (pkg[field] !== expected) {
      fail(`package.json: expected ${field} to be ${JSON.stringify(expected)}`);
    }
  }

  if (!/^\d+\.\d+\.\d+$/.test(pkg.version ?? '')) {
    fail('package.json: version must be a stable semver triplet for marketplace publish');
  }

  if (pkg.engines?.vscode !== '^1.125.0') {
    fail('package.json: engines.vscode must stay aligned with @types/vscode 1.125.0');
  }

  if (!hasArrayItem(pkg.extensionKind, 'workspace')) {
    fail('package.json: extensionKind must include workspace');
  }

  if (pkg.galleryBanner?.color !== '#101820' || pkg.galleryBanner?.theme !== 'dark') {
    fail('package.json: galleryBanner must define the release banner color and theme');
  }

  if (pkg.repository?.url !== 'https://github.com/eBioRing/styio-ext-vsc.git') {
    fail('package.json: repository URL must point at the public release repository');
  }

  if (pkg.bugs?.url !== 'https://github.com/eBioRing/styio-ext-vsc/issues') {
    fail('package.json: bugs URL must point at the public issue tracker');
  }

  const language = pkg.contributes?.languages?.find((entry) => entry.id === 'styio');
  if (!language) {
    fail('package.json: contributes.languages must define the styio language');
  } else {
    for (const extension of ['.styio', '.syo']) {
      if (!hasArrayItem(language.extensions, extension)) {
        fail(`package.json: styio language must include ${extension}`);
      }
    }
    if (language.configuration !== './language-configuration.json') {
      fail('package.json: styio language must point at language-configuration.json');
    }
  }

  const grammar = pkg.contributes?.grammars?.find((entry) => entry.language === 'styio');
  if (grammar?.scopeName !== 'source.styio') {
    fail('package.json: styio grammar must use scopeName source.styio');
  }
  if (grammar?.path !== './syntaxes/styio.tmLanguage.json') {
    fail('package.json: styio grammar must use the generated JSON grammar');
  }

  const snippets = pkg.contributes?.snippets?.find((entry) => entry.language === 'styio');
  if (snippets?.path !== './snippets/styio.code-snippets') {
    fail('package.json: styio snippets must be contributed');
  }

  const settings = pkg.contributes?.configuration?.properties ?? {};
  for (const setting of [
    'styio.server.enabled',
    'styio.server.path',
    'styio.server.arguments',
    'styio.trace.server'
  ]) {
    if (!Object.hasOwn(settings, setting)) {
      fail(`package.json: missing setting ${setting}`);
    }
  }

  const commandIds = new Set((pkg.contributes?.commands ?? []).map((entry) => entry.command));
  for (const command of [
    'styio.restartLanguageServer',
    'styio.selectLanguageServer',
    'styio.showOutput'
  ]) {
    if (!commandIds.has(command)) {
      fail(`package.json: missing command ${command}`);
    }
  }

  if (pkg.dependencies?.['vscode-languageclient'] !== '10.0.1') {
    fail('package.json: vscode-languageclient runtime dependency must be pinned to 10.0.1');
  }

  const requiredScripts = [
    'check',
    'grammar:build',
    'grammar:check',
    'grammar:test',
    'package:vsix',
    'release:account-check',
    'release:evidence-check',
    'release:preflight',
    'test:resolver',
    'test:e2e',
    'test:lsp-wire',
    'test:smoke'
  ];
  for (const script of requiredScripts) {
    if (!Object.hasOwn(pkg.scripts ?? {}, script)) {
      fail(`package.json: missing script ${script}`);
    }
  }

  if (process.env.GITHUB_REF_TYPE === 'tag') {
    const tagName = process.env.GITHUB_REF_NAME ?? '';
    if (tagName !== `v${pkg.version}`) {
      fail(`tag ${tagName} does not match package version v${pkg.version}`);
    }
  }
}

function validateRequiredFiles() {
  for (const relativePath of expectedVsixPaths) {
    if (!fileExists(relativePath)) {
      fail(`${relativePath}: required release file is missing`);
    }
  }

  for (const relativePath of [
    'syntaxes/styio.tmLanguage.yaml',
    '.vscodeignore',
    '.github/CODEOWNERS',
    '.github/dependabot.yml',
    '.github/pull_request_template.md',
    '.github/workflows/local-ci-gate.yml',
    '.github/workflows/publish-marketplace.yml',
    '.github/ISSUE_TEMPLATE/bug_report.yml',
    '.github/ISSUE_TEMPLATE/config.yml',
    '.github/ISSUE_TEMPLATE/lsp_server.yml',
    'scripts/checkpoint-health.ps1',
    'scripts/checkpoint-health.sh',
    'scripts/release-account-check.mjs',
    'package-lock.json',
    'docs/specs/DEPENDENCY-USAGE.md',
    'docs/specs/PUBLISH-RUNBOOK.md',
    'docs/specs/RELEASE-CHECKLIST.md',
    'docs/specs/RELEASE-EVIDENCE-0.1.0.md',
    'docs/specs/RELEASE-MANIFEST.md',
    'docs/specs/REPOSITORY-MAP.md'
  ]) {
    if (!fileExists(relativePath)) {
      fail(`${relativePath}: required repository file is missing`);
    }
  }
}

function validateIcon() {
  if (!fileExists('assets/icon.png')) {
    return;
  }

  const buffer = fs.readFileSync(filePath('assets/icon.png'));
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(pngSignature)) {
    fail('assets/icon.png: icon must be a PNG file');
    return;
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width < 128 || height < 128 || width !== height) {
    fail(`assets/icon.png: icon must be square and at least 128px, got ${width}x${height}`);
  }
}

function validateDocs() {
  const pkg = readJson('package.json');
  const changelog = fileExists('CHANGELOG.md') ? readText('CHANGELOG.md') : '';
  const license = fileExists('LICENSE') ? readText('LICENSE') : '';
  const readme = fileExists('README.md') ? readText('README.md') : '';
  const support = fileExists('SUPPORT.md') ? readText('SUPPORT.md') : '';
  const security = fileExists('SECURITY.md') ? readText('SECURITY.md') : '';

  if (!changelog.includes(`## [${pkg.version}] - `)) {
    fail(`CHANGELOG.md: must include a dated section for ${pkg.version}`);
  }
  if (/## \[[^\]]+\] - Unreleased/i.test(changelog)) {
    fail('CHANGELOG.md: release section must not be marked Unreleased');
  }

  if (!license.includes('Apache License') || !license.includes('Copyright 2026 eBioRing')) {
    fail('LICENSE: must contain Apache-2.0 text and the eBioRing copyright notice');
  }
  if (license.includes('[Styio Developer Group]')) {
    fail('LICENSE: placeholder copyright holder is still present');
  }

  for (const requiredText of [
    'Styio Language Support',
    'styio_lspd',
    'Extension Settings',
    'Known Limitations',
    'Privacy'
  ]) {
    if (!readme.includes(requiredText)) {
      fail(`README.md: missing marketplace section/text ${JSON.stringify(requiredText)}`);
    }
  }

  if (!support.includes('GitHub Issues')) {
    fail('SUPPORT.md: must describe the GitHub issue support route');
  }

  if (!security.includes('Reporting A Vulnerability') || !security.includes('styio_lspd')) {
    fail('SECURITY.md: must document vulnerability reporting and the styio_lspd trust boundary');
  }
}

function validateLockfileAndText() {
  const packageLock = fileExists('package-lock.json') ? readText('package-lock.json') : '';
  for (const forbidden of [
    'mirrors.cloud' + '.tencent.com',
    'registry.npm' + 'mirror.com',
    'registry.npm.' + 'tao' + 'bao.org'
  ]) {
    if (packageLock.includes(forbidden)) {
      fail(`package-lock.json: must not pin dependency tarballs to ${forbidden}`);
    }
  }

  const suspiciousTerms = [
    'Dev' + 'Space',
    'windows' + '-vc142',
    'mirrors.cloud' + '.tencent',
    'registry.npm' + 'mirror',
    'tao' + 'bao',
    '\ufffd',
    '\u9225'
  ];
  for (const relativePath of listTextFiles(root)) {
    const content = readText(relativePath);
    if (suspiciousTerms.some((term) => content.includes(term))) {
      fail(`${relativePath}: contains local-path, mirror, or mojibake residue`);
    }
  }
}

function validateGrammarSync() {
  run('node', ['scripts/check-grammar.mjs'], 'grammar sync check');
}

function validateVsixManifest() {
  const output = run(process.execPath, [vsceBin, 'ls', '--tree'], 'vsce package file listing');
  for (const expectedPath of expectedVsixPaths) {
    const parts = expectedPath.split('/');
    const hasFlatPath = output.includes(expectedPath);
    const hasTreePath =
      parts.length === 1 ||
      (parts.slice(0, -1).every((part) => output.includes(`${part}/`)) &&
        output.includes(parts.at(-1) ?? expectedPath));
    if (!hasFlatPath && !hasTreePath) {
      fail(`VSIX listing: missing ${expectedPath}`);
    }
  }
  for (const forbidden of forbiddenVsixFragments) {
    if (output.includes(forbidden)) {
      fail(`VSIX listing: forbidden packaged path fragment ${forbidden}`);
    }
  }
  if (output.includes('node_modules')) {
    fail('VSIX listing: node_modules must not be packaged; runtime code should remain bundled');
  }
  if (output.includes('extension/out/extension.js')) {
    warn(
      'VSIX listing uses packaged extension/ prefix; ensure checks use repository-relative paths too'
    );
  }
}

function validateWorkflowGates() {
  const localCi = fileExists('.github/workflows/local-ci-gate.yml')
    ? readText('.github/workflows/local-ci-gate.yml')
    : '';
  const publish = fileExists('.github/workflows/publish-marketplace.yml')
    ? readText('.github/workflows/publish-marketplace.yml')
    : '';

  for (const requiredText of [
    'styio_ref',
    'STYIO_CI_REF',
    'npm run package:vsix',
    'npm run test:lsp-wire',
    'npm run test:smoke'
  ]) {
    if (!localCi.includes(requiredText)) {
      fail(`.github/workflows/local-ci-gate.yml: missing gate ${requiredText}`);
    }
  }

  for (const requiredText of [
    'Checkout styio-nightly',
    'npm run package:vsix',
    'npm run release:preflight',
    'npm run release:evidence-check',
    'npm run test:lsp-wire',
    'npm run test:e2e',
    'npm run test:smoke',
    'STYIO_NIGHTLY_RELEASE_REF',
    'PUBLISH_REQUESTED',
    'Publishing requires a pinned Styio commit or tag',
    'Publishing requires an exact Styio commit SHA or tag',
    'refs/tags/${STYIO_RELEASE_REF}',
    'branch ref',
    'ctest --test-dir build/release-gate -R styio_lspd_stdio_framing',
    'npx vsce verify-pat eBioRing',
    'npx vsce publish --packagePath dist/styio-language-support.vsix --skip-duplicate'
  ]) {
    if (!publish.includes(requiredText)) {
      fail(`.github/workflows/publish-marketplace.yml: missing gate ${requiredText}`);
    }
  }
}

function validateYamlSyntax() {
  for (const relativePath of [
    '.github/ISSUE_TEMPLATE/bug_report.yml',
    '.github/ISSUE_TEMPLATE/config.yml',
    '.github/ISSUE_TEMPLATE/lsp_server.yml',
    '.github/dependabot.yml',
    '.github/workflows/local-ci-gate.yml',
    '.github/workflows/publish-marketplace.yml',
    '.github/workflows/repo-hygiene.yml',
    '.github/workflows/styio-audit.yml'
  ]) {
    run(
      'node',
      [
        '-e',
        "const fs=require('fs'); const yaml=require('js-yaml'); yaml.load(fs.readFileSync(process.argv[1],'utf8'));",
        relativePath
      ],
      `${relativePath} YAML syntax`
    );
  }
}

function validateReleaseEvidence() {
  const evidencePath = 'docs/specs/RELEASE-EVIDENCE-0.1.0.md';
  const vsixPath = 'dist/styio-language-support.vsix';
  if (!fileExists(evidencePath)) {
    fail(`${evidencePath}: release evidence ledger is missing`);
    return;
  }

  const evidence = readText(evidencePath);
  for (const requiredText of [
    'SHA256:',
    'npm run test:smoke',
    'styio_lspd_stdio_framing',
    'VSCE_PAT was not set'
  ]) {
    if (!evidence.includes(requiredText)) {
      fail(`${evidencePath}: missing evidence text ${JSON.stringify(requiredText)}`);
    }
  }

  if (!fileExists(vsixPath)) {
    if (strictReleaseEvidence) {
      fail(`${vsixPath}: required for strict release evidence validation`);
    }
    return;
  }

  const expectedHash = /SHA256:\s*`?([A-Fa-f0-9]{64})`?/u.exec(evidence)?.[1]?.toUpperCase();
  if (!expectedHash) {
    fail(`${evidencePath}: could not parse recorded SHA256`);
    return;
  }

  const actualHash = createHash('sha256')
    .update(fs.readFileSync(filePath(vsixPath)))
    .digest('hex')
    .toUpperCase();
  if (actualHash !== expectedHash) {
    const message = `${evidencePath}: recorded SHA256 ${expectedHash} does not match ${vsixPath} ${actualHash}`;
    if (strictReleaseEvidence) {
      fail(message);
    } else {
      warn(message);
    }
  }
}

function main() {
  validatePackageManifest();
  validateRequiredFiles();
  validateIcon();
  validateDocs();
  validateLockfileAndText();
  validateGrammarSync();
  validateVsixManifest();
  validateWorkflowGates();
  validateYamlSyntax();
  validateReleaseEvidence();

  for (const message of warnings) {
    console.warn(`release preflight warning: ${message}`);
  }

  if (errors.length > 0) {
    for (const message of errors) {
      console.error(`release preflight failed: ${message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('release preflight passed');
}

main();
