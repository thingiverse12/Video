import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Repeat the official agent onboarding in an ephemeral workspace. Never link a
// project, deploy, save CLI credentials, or configure an MCP client we are not.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expectedSkills = [
  'deploy-to-vercel', 'vercel-cli-with-tokens', 'vercel-composition-patterns',
  'vercel-optimize', 'vercel-react-best-practices',
  'vercel-react-native-skills', 'vercel-react-view-transitions',
  'web-design-guidelines', 'writing-guidelines',
];
const skillsDir = join(homedir(), '.agents', 'skills');
const report = {
  checkedAt: new Date().toISOString(),
  cliVersion: null,
  skills: { scope: 'global', installed: [], missing: [] },
  authentication: 'not-checked',
  mcp: 'skipped: Arena is not a supported Vercel MCP client',
  projectLinked: existsSync(join(root, '.vercel', 'project.json')),
  build: 'not-checked',
  deployed: false,
};

function run(command, args, { timeout = 180000, show = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    timeout, maxBuffer: 8 * 1024 * 1024, shell: process.platform === 'win32',
  });
  const text = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (show && text) console.log(text.trim());
  if (result.error) console.warn(result.error.message);
  return { ok: result.status === 0 && !result.error, text, error: result.error };
}

console.log('1. Install/update the Vercel CLI globally');
const install = run('npm', ['install', '--global', 'vercel@latest']);
if (!install.ok) console.warn('Global CLI installation failed:', install.text.trim().split('\n').slice(-6).join('\n'));
const version = run('vercel', ['--version'], { timeout: 30000 });
if (version.ok) {
  report.cliVersion = version.text.match(/\d+\.\d+\.\d+/)?.[0] ?? version.text.trim();
  console.log(`Vercel CLI: ${report.cliVersion}`);
} else console.warn('Vercel CLI is not available.');

console.log('2. Install standalone skills globally (no plugin in Arena)');
const missing = () => expectedSkills.filter(name => !existsSync(join(skillsDir, name, 'SKILL.md')));
if (missing().length) {
  const added = run('npx', ['--yes', 'skills', 'add', 'vercel-labs/agent-skills', '--global', '--skill', '*', '--yes'], { timeout: 240000 });
  if (!added.ok) console.warn('Some skill installations failed:', added.text.trim().split('\n').slice(-8).join('\n'));
}
report.skills.installed = existsSync(skillsDir)
  ? readdirSync(skillsDir).filter(name => expectedSkills.includes(name) && existsSync(join(skillsDir, name, 'SKILL.md')))
  : [];
report.skills.missing = missing();
console.log(`Skills: ${report.skills.installed.length}/${expectedSkills.length} available`);

console.log('3. Check CLI authentication');
if (version.ok) {
  let identity = run('vercel', ['whoami'], { timeout: 30000 });
  if (!identity.ok) {
    console.log('Starting the official Vercel login flow. Approve it in your own browser if prompted.');
    // Output from login is never copied into the status file or repository.
    const login = run('vercel', ['login'], { timeout: 60000, show: true });
    identity = run('vercel', ['whoami'], { timeout: 30000 });
    if (!identity.ok) report.authentication = /Client network socket disconnected before secure TLS connection was established|SSL_ERROR_SYSCALL/i.test(login.text)
      ? 'blocked: TLS connection to Vercel failed'
      : login.error?.code === 'ETIMEDOUT' ? 'unverified: approval may be pending' : 'not authenticated';
  }
  if (identity.ok) {
    report.authentication = 'authenticated';
    console.log(`Authenticated: ${identity.text.trim().split('\n').at(-1)}`);
  } else console.warn('Vercel CLI is not authenticated. Do not claim setup is complete.');
} else report.authentication = 'cli-unavailable';

console.log('4. Validate the local Vite build (no deployment)');
let dependencies = existsSync(join(root, 'node_modules', '.bin', 'vite'));
if (!dependencies) dependencies = run('npm', ['ci', '--no-audit', '--no-fund']).ok;
if (dependencies) {
  const build = run('npm', ['run', 'build'], { timeout: 180000 });
  report.build = build.ok && existsSync(join(root, 'dist', 'index.html')) ? 'passed' : 'failed';
  if (!build.ok) console.warn('Build failed:', build.text.trim().split('\n').slice(-12).join('\n'));
} else report.build = 'dependency-install-failed';
console.log(`Build: ${report.build}`);

// Only non-sensitive verification state is persisted in an ignored file.
const ignore = readFileSync(join(root, '.gitignore'), 'utf8');
if (ignore.split(/\r?\n/).some(line => line.trim() === '.cache/')) {
  mkdirSync(join(root, '.cache'), { recursive: true });
  writeFileSync(join(root, '.cache', 'vercel-setup-status.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log('Status (no project created or deployed):', JSON.stringify(report, null, 2));
process.exitCode = report.cliVersion && !report.skills.missing.length && report.authentication === 'authenticated' && report.build === 'passed' ? 0 : 1;
