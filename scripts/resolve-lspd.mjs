import fs from 'node:fs';
import path from 'node:path';

const isWindows = process.platform === 'win32';
const executableNames = isWindows
  ? ['styio_lspd.exe', 'styio_lspd.cmd', 'styio_lspd.bat']
  : ['styio_lspd'];

function isExecutable(candidate) {
  try {
    const stat = fs.statSync(candidate);
    return stat.isFile();
  } catch {
    return false;
  }
}

function pathCandidatesFromRoot(root) {
  const names = executableNames;
  const candidates = [];
  for (const name of names) {
    candidates.push(path.join(root, 'build', 'default', 'bin', name));
    candidates.push(path.join(root, 'build', 'ci', 'bin', name));
    candidates.push(path.join(root, 'build', 'windows', 'bin', name));
  }

  const buildRoot = path.join(root, 'build');
  if (fs.existsSync(buildRoot)) {
    for (const entry of fs.readdirSync(buildRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        for (const name of names) {
          candidates.push(path.join(buildRoot, entry.name, 'bin', name));
        }
      }
    }
  }

  return candidates;
}

function findOnPath() {
  const pathEnv = process.env.PATH ?? '';
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) {
      continue;
    }
    for (const name of executableNames) {
      const candidate = path.join(dir, name);
      if (isExecutable(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

export function resolveLspd() {
  const explicit = process.env.STYIO_LSPD_PATH;
  if (explicit && isExecutable(explicit)) {
    return explicit;
  }

  const root = process.env.STYIO_NIGHTLY_ROOT;
  if (root) {
    for (const candidate of pathCandidatesFromRoot(root)) {
      if (isExecutable(candidate)) {
        return candidate;
      }
    }
  }

  return findOnPath();
}

if (process.argv.includes('--print')) {
  const resolved = resolveLspd();
  if (!resolved) {
    process.exit(1);
  }
  console.log(resolved);
}
