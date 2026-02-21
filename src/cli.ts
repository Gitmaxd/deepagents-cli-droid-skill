import { defineCommand, runMain } from 'citty';
import { copy, pathExists, ensureDir } from 'fs-extra';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { stat, readFile } from 'fs/promises';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SKILL_NAME = 'deepagents-cli';

const ASCII_ART = `
  ██████╗ ███████╗███████╗██████╗      █████╗  ██████╗ ███████╗███╗   ██╗████████╗███████╗
  ██╔══██╗██╔════╝██╔════╝██╔══██╗    ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝██╔════╝
  ██║  ██║█████╗  █████╗  ██████╔╝    ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ███████╗
  ██║  ██║██╔══╝  ██╔══╝  ██╔═══╝     ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ╚════██║
  ██████╔╝███████╗███████╗██║         ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ███████║
  ╚═════╝ ╚══════╝╚══════╝╚═╝         ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝
                                   CLI Skill`;

const DIVIDER = '────────────────────────────────────────────────────────────────────────────────';
const DIVIDER_THIN = '────────────────────────────────────────────────────────────';

async function getPackageVersion(): Promise<string> {
  try {
    const pkgPath = resolve(__dirname, '..', 'package.json');
    const content = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function printSuccessScreen(copied: number, skipped: number, version: string, targetDir: string): void {
  console.log(`\n${DIVIDER}\n`);
  console.log(ASCII_ART);
  console.log(`${''.padStart(72)}v${version}\n`);
  console.log(DIVIDER);

  const status = skipped > 0
    ? `  Installed successfully       ${copied} created  |  ${skipped} skipped (existing)`
    : `  Installed successfully       ${copied} files created`;
  console.log(`\n${status}\n`);
  console.log(DIVIDER_THIN);

  console.log('\n  INSTALLED TO\n');
  console.log(`  ${targetDir}\n`);
  console.log(DIVIDER_THIN);

  console.log('\n  WHAT THIS SKILL DOES\n');
  console.log('  Gives your Factory.ai Droid comprehensive knowledge of the');
  console.log('  Deep Agents CLI — commands, flags, providers, skills, memory,');
  console.log('  sandboxes, streaming, SDK customization, and workflows.\n');
  console.log(DIVIDER_THIN);

  console.log('\n  USAGE\n');
  console.log('  The Droid loads this skill automatically when relevant.');
  console.log('  You can also invoke it directly: /deepagents-cli\n');
  console.log(DIVIDER_THIN);

  console.log('\n  RESOURCES\n');
  console.log('  NPM       https://npmjs.com/package/deepagents-cli-droid-skill');
  console.log('  GitHub    https://github.com/Gitmaxd/deepagents-cli-droid-skill\n');
  console.log(DIVIDER);
  console.log('');
}

const init = defineCommand({
  meta: {
    name: 'init',
    description: 'Install the Deep Agents CLI skill for Factory.ai Droid',
  },
  args: {
    force: {
      type: 'boolean',
      description: 'Skip existing file checks (still never overwrites)',
      default: false,
    },
    path: {
      type: 'string',
      description: 'Target directory (defaults to current directory)',
      default: '.',
    },
    personal: {
      type: 'boolean',
      description: 'Install as a personal skill (~/.factory/skills/) instead of workspace',
      default: false,
    },
  },
  async run({ args }) {
    const baseDir = args.personal
      ? join(homedir(), '.factory')
      : resolve(args.path);

    const skillDir = args.personal
      ? join(baseDir, 'skills', SKILL_NAME)
      : join(baseDir, '.factory', 'skills', SKILL_NAME);

    const templatesDir = resolve(__dirname, '..', 'templates', 'skills', SKILL_NAME);

    const scope = args.personal ? 'personal' : 'workspace';
    console.log(`\nDeep Agents CLI Skill Installer (${scope})\n`);

    if (!(await pathExists(templatesDir))) {
      console.error('Error: Templates directory not found. Package may be corrupted.');
      process.exit(1);
    }

    if (await pathExists(skillDir) && !args.force) {
      console.log(`  .factory/skills/${SKILL_NAME} already exists`);
      console.log('  Scaffolding new files only (existing files will NOT be overwritten)\n');
    }

    await ensureDir(skillDir);

    let copied = 0;
    let skipped = 0;

    try {
      await copy(templatesDir, skillDir, {
        overwrite: false,
        errorOnExist: false,
        filter: async (src, dest) => {
          const srcStat = await stat(src);
          if (srcStat.isDirectory()) {
            return true;
          }

          if (await pathExists(dest)) {
            const relativePath = dest.replace(skillDir, `.factory/skills/${SKILL_NAME}`);
            console.log(`  Skipped: ${relativePath} (already exists)`);
            skipped++;
            return false;
          }

          const relativePath = dest.replace(skillDir, `.factory/skills/${SKILL_NAME}`);
          console.log(`  Created: ${relativePath}`);
          copied++;
          return true;
        },
      });
    } catch (error) {
      console.error('Error during installation:', error);
      process.exit(1);
    }

    const version = await getPackageVersion();
    printSuccessScreen(copied, skipped, version, skillDir);
  },
});

const main = defineCommand({
  meta: {
    name: 'deepagents-cli-droid-skill',
    version: '0.1.0',
    description: 'Deep Agents CLI skill for Factory.ai Droid',
  },
  subCommands: {
    init,
  },
  async run() {
    const version = await getPackageVersion();
    console.log(`\nDeep Agents CLI Skill v${version}\n`);
    console.log('Usage:  npx deepagents-cli-droid-skill init [options]\n');
    console.log('Options:');
    console.log('  --path <dir>    Target directory (default: current directory)');
    console.log('  --personal      Install as personal skill (~/.factory/skills/)');
    console.log('  --force         Skip existing file checks');
    console.log('  --help          Show help');
    console.log('  --version       Show version\n');
  },
});

runMain(main);
