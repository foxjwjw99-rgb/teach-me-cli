import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ENV_FILE = path.resolve(process.cwd(), '.env.local');

interface Check {
  label: string;
  ok: boolean;
  hint?: string;
}

function commandExists(cmd: string): boolean {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

function runChecks(): Check[] {
  const checks: Check[] = [];

  // 1. omnivoice-local in PATH
  const hasOmnivoice = commandExists('omnivoice-local');
  checks.push({
    label: 'omnivoice-local in PATH',
    ok: hasOmnivoice,
    hint: hasOmnivoice ? undefined : 'Install OmniVoice or use --no-audio to skip audio generation.',
  });

  // 2. openclaw in PATH (optional — only needed for OpenClaw LLM backend)
  const hasOpenclaw = commandExists('openclaw');
  checks.push({
    label: 'openclaw in PATH (optional)',
    ok: hasOpenclaw,
    hint: hasOpenclaw ? undefined : 'Not required if using Anthropic API directly.',
  });

  // 3. .env.local exists
  const hasEnvFile = fs.existsSync(ENV_FILE);
  checks.push({
    label: `.env.local exists (${ENV_FILE})`,
    ok: hasEnvFile,
    hint: hasEnvFile ? undefined : 'Run: cp .env.example .env.local  and fill in your values.',
  });

  // 4. ANTHROPIC_API_KEY set
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
  checks.push({
    label: 'ANTHROPIC_API_KEY set',
    ok: hasApiKey,
    hint: hasApiKey ? undefined : 'Set ANTHROPIC_API_KEY in .env.local to use the Anthropic LLM backend.',
  });

  // 5. OMNIVOICE_REF_AUDIO set and file exists
  const refAudio = process.env.OMNIVOICE_REF_AUDIO;
  if (refAudio) {
    const refExists = fs.existsSync(refAudio);
    checks.push({
      label: `OMNIVOICE_REF_AUDIO file exists (${refAudio})`,
      ok: refExists,
      hint: refExists ? undefined : `File not found: ${refAudio}. Update OMNIVOICE_REF_AUDIO in .env.local.`,
    });
  } else {
    checks.push({
      label: 'OMNIVOICE_REF_AUDIO set',
      ok: false,
      hint: 'Set OMNIVOICE_REF_AUDIO in .env.local to enable audio narration.',
    });
  }

  return checks;
}

export const doctorCommand = {
  command: 'doctor',
  description: 'Check that all required tools and config are in place',
  handler: () => {
    console.log('\nRunning diagnostics...\n');

    const checks = runChecks();
    let allOk = true;

    for (const check of checks) {
      const icon = check.ok ? '✅' : '❌';
      console.log(`  ${icon}  ${check.label}`);
      if (!check.ok) {
        allOk = false;
        if (check.hint) {
          console.log(`       Hint: ${check.hint}`);
        }
      }
    }

    console.log('');
    if (allOk) {
      console.log('Everything looks good!\n');
    } else {
      console.log('Some checks failed. Fix the issues above and re-run teach-me doctor.\n');
      process.exit(1);
    }
  },
};
