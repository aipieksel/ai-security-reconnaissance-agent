import { mkdir, readFile, lstat, mkdtemp, copyFile, rename, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const files = ['preset.yml', 'agent.cordis.yml'];
export const stateHome = () => resolve(process.env.RECON_HOME || join(root, '.recon'));

// Never replace an existing user's preset, including links or partial installs.
export async function install(home = stateHome()) {
  const parent = join(home, '.agent-presets');
  const destination = join(parent, 'ai-security-reconnaissance-agent');
  await mkdir(parent, { recursive: true, mode: 0o700 });
  let existing;
  try { existing = await lstat(destination); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (existing) {
    if (!existing.isDirectory() || existing.isSymbolicLink()) throw new Error('Preset destination is not a regular directory.');
    for (const file of files) {
      const target = join(destination, file);
      const stat = await lstat(target);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Refusing preset link or non-file: ${file}`);
      const [source, current] = await Promise.all([
        readFile(join(root, 'presets/ai-security-reconnaissance-agent', file)), readFile(target),
      ]);
      if (!source.equals(current)) throw new Error(`Existing ${file} differs; preserve it and select a new RECON_HOME.`);
    }
    return destination;
  }
  const staging = await mkdtemp(join(parent, '.recon-install-'));
  try {
    for (const file of files) await copyFile(join(root, 'presets/ai-security-reconnaissance-agent', file), join(staging, file));
    await rename(staging, destination);
  } finally { await rm(staging, { recursive: true, force: true }); }
  return destination;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(`AI Security Reconnaissance Agent installed: ${await install()}`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
