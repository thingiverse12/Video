import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Restore the development tools in a fresh Arena workspace. This script never
// creates a Netlify site, uploads files, or publishes a deployment.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const report = {
  checkedAt: new Date().toISOString(),
  skills: { installed: 0, expected: 0, missing: [], refreshSucceeded: false },
  cli: { available: false, version: null },
  authentication: 'not-checked',
  build: 'not-checked',
  deployed: false,
};

function run(command, args, { quiet = false, tail = false, timeout = 240000 } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout,
    maxBuffer: 8 * 1024 * 1024,
    shell: process.platform === 'win32',
  });
  const stdout = result.stdout ?? '', stderr = result.stderr ?? '';
  if (!quiet) {
    if (stdout) process.stdout.write(tail ? stdout.split('\n').slice(-16).join('\n') + '\n' : stdout);
    if (stderr) process.stderr.write(stderr);
    if (result.error) console.error(result.error.message);
  }
  return { ok: result.status === 0 && !result.error, stdout, stderr };
}

console.log('\n1. Install/update the Netlify skills');
const skills = run('npx', ['-y', 'skills', 'add', 'netlify/context-and-tools', '--skill', '*', '--yes'], { tail: true });
const skillsDirectory = join(root, '.agents', 'skills');
report.skills.installed = existsSync(skillsDirectory)
  ? readdirSync(skillsDirectory).filter(name => name.startsWith('netlify-') && existsSync(join(skillsDirectory, name, 'SKILL.md'))).length
  : 0;
report.skills.refreshSucceeded = skills.ok;
try {
  const lock = JSON.parse(readFileSync(join(root, 'skills-lock.json'), 'utf8'));
  const expected = Object.entries(lock.skills ?? {}).filter(([, entry]) => entry.source === 'netlify/context-and-tools').map(([name]) => name);
  report.skills.expected = expected.length;
  report.skills.missing = expected.filter(name => !existsSync(join(skillsDirectory, name, 'SKILL.md')));
} catch { console.warn('Could not verify the skills lock file; continuing other setup checks.'); }
console.log(`Available Netlify skills: ${report.skills.installed}; expected: ${report.skills.expected}`);

console.log('\n2. Ensure Netlify CLI is installed');
let cli = run('netlify', ['--help'], { quiet: true, timeout: 30000 });
if (!cli.ok) {
  run('npm', ['install', '-g', 'netlify-cli']);
  cli = run('netlify', ['--help'], { quiet: true, timeout: 30000 });
}
report.cli.available = cli.ok;
if (cli.ok) {
  const version = run('netlify', ['--version'], { timeout: 30000 });
  report.cli.version = version.ok ? version.stdout.trim() : null;

  console.log('\n3. Check authentication');
  const status = run('netlify', ['status'], { timeout: 45000 });
  const statusText = (status.stdout + status.stderr).replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
  if (status.ok && !/not logged in|not authenticated|authentication required/i.test(statusText)) {
    report.authentication = 'connected';
  } else {
    console.log('Requesting browser approval. No passwords or access tokens are needed in chat.');
    // Keep the CLI's real approval/check URLs in the terminal output only. Never
    // copy OAuth output, tokens, or credentials into project files or reports.
    const login = run('netlify', ['login', '--request', 'Arena.ai wants to login to prepare your game for Netlify deployment'], { timeout: 45000 });
    report.authentication = login.ok ? 'approval-pending' : 'request-failed';
    if (!login.ok) console.warn('Authorization could not be requested. Continuing with local build validation.');
  }
} else {
  report.authentication = 'cli-unavailable';
  console.warn('CLI installation did not complete. Continuing with the application checks.');
}

console.log('\n4. Validate the application build without deploying');
let dependenciesReady = existsSync(join(root, 'node_modules', '.bin', 'vite')) && existsSync(join(root, 'node_modules', '.bin', 'tsc'));
if (!dependenciesReady) dependenciesReady = run('npm', ['ci', '--no-audit', '--no-fund']).ok;
if (dependenciesReady) {
  const build = report.cli.available
    ? run('netlify', ['build', '--offline'], { tail: true })
    : run('npm', ['run', 'build'], { tail: true });
  report.build = build.ok && existsSync(join(root, 'dist', 'index.html')) ? 'passed' : 'failed';
} else report.build = 'dependency-install-failed';

// Persist only non-sensitive status in an ignored workspace cache.
report.checkedAt = new Date().toISOString();
const ignore = readFileSync(join(root, '.gitignore'), 'utf8');
if (ignore.split(/\r?\n/).some(line => line.trim() === '.cache/')) {
  mkdirSync(join(root, '.cache'), { recursive: true });
  writeFileSync(join(root, '.cache', 'netlify-setup-status.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log('\nSetup result (no deployment performed):\n' + JSON.stringify(report, null, 2));
console.log('\nNext: authorize Netlify, choose/create a destination site, and get explicit approval before publishing the game.');
if (report.authentication === 'request-failed') {
  console.log('The CLI did not complete the approval request. Resolve its reported error before continuing authorization.');
}
// Finish every independent step even on failure, but never report full success
// when sign-in or installation is incomplete. Exit 4 means browser approval needed.
const localReady = report.skills.refreshSucceeded && report.skills.expected > 0 && report.skills.missing.length === 0 && report.cli.available && report.build === 'passed';
process.exitCode = !localReady || ['request-failed', 'cli-unavailable'].includes(report.authentication)
  ? 1 : report.authentication === 'approval-pending' ? 4 : 0;
