#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { generateCommand } from './commands/generate.js';
import { configCommand } from './commands/config.js';
import { doctorCommand } from './commands/doctor.js';

dotenv.config({ path: '.env.local' });

const cli = yargs(hideBin(process.argv))
  .scriptName('teach-me')
  .usage('Usage: $0 <command> [options]')
  .command(generateCommand)
  .command(configCommand as any)
  .command(doctorCommand)
  .demandCommand(1, 'You must specify a command')
  .help()
  .alias('h', 'help')
  .version()
  .strict();

cli.parse();
