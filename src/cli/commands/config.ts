import type { Argv } from 'yargs';
import * as fs from 'fs';
import * as path from 'path';
import { describeConfig } from '../../config.js';

const ENV_FILE = path.resolve(process.cwd(), '.env.local');

/** Supported settable keys and the env var they map to */
const KEY_MAP: Record<string, string> = {
  'omnivoice.refAudio': 'OMNIVOICE_REF_AUDIO',
  'omnivoice.refText': 'OMNIVOICE_REF_TEXT',
  'omnivoice.instruct': 'OMNIVOICE_INSTRUCT',
  'omnivoice.speed': 'OMNIVOICE_SPEED',
  'omnivoice.style': 'OMNIVOICE_STYLE',
  'output.dir': 'OUTPUT_DIR',
  'output.formats': 'OUTPUT_FORMATS',
  'llm.model': 'LLM_MODEL',
  'llm.provider': 'LLM_PROVIDER',
};

function setEnvVar(key: string, value: string): void {
  const envVar = KEY_MAP[key];
  if (!envVar) {
    const valid = Object.keys(KEY_MAP).join(', ');
    throw new Error(`Unknown config key "${key}". Valid keys: ${valid}`);
  }

  let content = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf-8') : '';

  const regex = new RegExp(`^${envVar}=.*$`, 'm');
  const line = `${envVar}=${value}`;

  if (regex.test(content)) {
    content = content.replace(regex, line);
  } else {
    content = content.trimEnd() + (content.length > 0 ? '\n' : '') + line + '\n';
  }

  fs.writeFileSync(ENV_FILE, content, 'utf-8');
  console.log(`Set ${envVar}=${value} in ${ENV_FILE}`);
}

export const configCommand = {
  command: 'config <subcommand>',
  description: 'View or update teach-me configuration',
  builder: (yargs: Argv) => {
    return yargs
      .command({
        command: 'show',
        describe: 'Show current config values with source annotations',
        handler: () => {
          console.log('\nCurrent configuration:\n');
          console.log(describeConfig());
          console.log(`\nConfig file: ${ENV_FILE}`);
          if (!fs.existsSync(ENV_FILE)) {
            console.log('\n  (file does not exist — copy .env.example to .env.local to get started)');
          }
          console.log('');
        },
      })
      .command({
        command: 'set <key> <value>',
        describe: 'Set a config value in .env.local',
        builder: (y: Argv) =>
          y
            .positional('key', {
              describe: `Config key (e.g. omnivoice.refAudio). Valid keys:\n  ${Object.keys(KEY_MAP).join('\n  ')}`,
              type: 'string',
              demandOption: true,
            })
            .positional('value', {
              describe: 'Value to set',
              type: 'string',
              demandOption: true,
            }),
        handler: (argv: any) => {
          try {
            setEnvVar(argv.key as string, argv.value as string);
          } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
          }
        },
      })
      .demandCommand(1, 'Specify a subcommand: show | set');
  },
  handler: () => {
    // handled by subcommands
  },
};
