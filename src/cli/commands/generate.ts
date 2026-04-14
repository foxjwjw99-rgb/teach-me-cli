import type { Argv } from 'yargs';
import * as fs from 'fs';
import * as path from 'path';
import { buildCourseGeneratorGraph } from '../../orchestration/director-graph.js';
import { createLLMAdapter } from '../../orchestration/llm-adapter.js';
import { generateCourseNarration } from '../../audio/omnivoice.js';
import { generatePPTX, generateJSON, generateHTML, generateGraph } from '../../export/index.js';
import type { ParsedInput, Classroom } from '../../types.js';

// ============ Inline Spinner ============

function createSpinner(initialMsg: string) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let currentMsg = initialMsg;

  const start = (msg?: string) => {
    if (msg) currentMsg = msg;
    timer = setInterval(() => {
      process.stdout.write(`\r${frames[i++ % frames.length]} ${currentMsg}`);
    }, 80);
  };

  const update = (msg: string) => {
    currentMsg = msg;
  };

  const succeed = (msg: string) => {
    if (timer) clearInterval(timer);
    process.stdout.write(`\r✅ ${msg}\n`);
  };

  const fail = (msg: string) => {
    if (timer) clearInterval(timer);
    process.stdout.write(`\r❌ ${msg}\n`);
  };

  return { start, update, succeed, fail };
}

// ============ Mock Classroom ============

function buildMockClassroom(parsedInput: ParsedInput): Classroom {
  const mockScenes = [
    {
      id: 'scene_001',
      type: 'slide' as const,
      title: `${parsedInput.title} 簡介`,
      keyPoints: ['介紹主題', '學習目標', '課程概覽'],
      narration: `歡迎來到 ${parsedInput.title} 的課程。在這堂課中，我們將一起探索相關的知識。`,
      actions: [],
      duration: 120,
    },
    {
      id: 'scene_002',
      type: 'slide' as const,
      title: '核心概念',
      keyPoints: ['定義', '特性', '應用'],
      narration: '讓我們先了解基本的概念定義。',
      actions: [],
      duration: 180,
    },
    {
      id: 'scene_003',
      type: 'quiz' as const,
      title: '小測驗',
      keyPoints: ['複習內容', '自我檢驗'],
      narration: '現在進行小測驗，檢查您是否理解了。',
      actions: [],
      duration: 120,
    },
  ];

  return {
    id: `course_${Date.now()}`,
    title: parsedInput.title,
    topic: parsedInput.title,
    scenes: mockScenes,
    metadata: {
      sourceFile: parsedInput.metadata.sourceFile,
      generatedAt: new Date().toISOString(),
      totalDuration: mockScenes.reduce((acc, s) => acc + (s.duration ?? 120), 0),
    },
  };
}

export const generateCommand = {
  command: 'generate <input>',
  description: 'Generate a course from input file or topic',
  builder: (yargs: Argv) => {
    return yargs
      .positional('input', {
        describe: 'Input file path (PDF, Markdown, TXT) or topic string',
        type: 'string',
      })
      .option('output', {
        alias: 'o',
        describe: 'Output directory',
        type: 'string',
        default: './output',
      })
      .option('format', {
        alias: 'f',
        describe: 'Export formats (pptx,json,html,graph)',
        type: 'string',
        default: 'pptx,json',
      })
      .option('topic', {
        alias: 't',
        describe: 'Override topic (if input is a file)',
        type: 'string',
      })
      .option('concurrency', {
        alias: 'c',
        describe: 'Parallel LLM calls for scene generation',
        type: 'number',
        default: 3,
      })
      .option('model', {
        alias: 'm',
        describe: 'LLM model to use (overrides LLM_MODEL env)',
        type: 'string',
      })
      .option('provider', {
        alias: 'p',
        describe: 'LLM provider: anthropic | openclaw | openai | gemini (overrides LLM_PROVIDER env)',
        type: 'string',
      })
      .option('no-audio', {
        describe: 'Skip audio narration generation',
        type: 'boolean',
        default: false,
      })
      .option('verbose', {
        alias: 'v',
        describe: 'Show detailed output',
        type: 'boolean',
        default: false,
      });
  },

  handler: async (argv: any) => {
    try {
      const input = argv.input as string;
      const outputDir = path.resolve(argv.output);
      const formats = (argv.format as string).split(',').map((f: string) => f.trim());
      const concurrency = argv.concurrency as number;
      const skipAudio = argv['no-audio'] as boolean;

      console.log(`\n🎓 teach-me CLI v2.0\n`);

      // ============ Parse Input ============
      const spinner = createSpinner('解析輸入中...');
      spinner.start();

      let parsedInput: ParsedInput;
      if (fs.existsSync(input)) {
        const content = fs.readFileSync(input, 'utf-8');
        const title = argv.topic || path.basename(input, path.extname(input));
        parsedInput = {
          title,
          content,
          metadata: {
            sourceFile: input,
            fileType: path.extname(input),
            extractedAt: new Date().toISOString(),
          },
        };
      } else {
        parsedInput = {
          title: input,
          content: input,
          metadata: {
            sourceFile: 'prompt',
            fileType: 'text',
            extractedAt: new Date().toISOString(),
          },
        };
      }

      spinner.succeed(`輸入解析完成: "${parsedInput.title}" (${parsedInput.content.length} 字元)`);

      // ============ Initialize LLM Adapter ============
      const apiKey = process.env.ANTHROPIC_API_KEY;
      const llmAdapter = createLLMAdapter();

      // ============ Execute Pipeline ============
      let classroom: Classroom;

      if (apiKey) {
        console.log(`🧠 使用 Anthropic API (並行度: ${concurrency})\n`);

        const graphSpinner = createSpinner('建立課程生成圖...');
        graphSpinner.start();
        const graph = await buildCourseGeneratorGraph(llmAdapter, { concurrency });
        graphSpinner.succeed('課程生成圖已建立');

        const initialState = {
          topic: parsedInput.title,
          content: parsedInput.content,
          outline: [],
          classroom: null,
          progress: [],
          shouldContinue: true,
        };

        console.log(`\n🚀 開始生成課程...\n`);
        const finalState = await graph.invoke(initialState);
        classroom = finalState.classroom!;
        console.log(`\n✅ 課程生成完成，共 ${classroom.scenes.length} 個場景`);
      } else {
        console.warn('\n⚠️  [DEMO MODE] 未找到 ANTHROPIC_API_KEY');
        console.warn('   輸出為示範用佔位內容，非真實 AI 生成。');
        console.warn('   請在 .env.local 設定 ANTHROPIC_API_KEY 以使用完整功能。\n');
        classroom = buildMockClassroom(parsedInput);
        console.log(`✅ Demo 課程已建立（${classroom.scenes.length} 個示範場景）`);
      }

      // ============ Generate Audio ============
      const audioDir = path.join(outputDir, 'audio');
      if (!skipAudio && (formats.includes('pptx') || formats.includes('html'))) {
        try {
          const audioSpinner = createSpinner('生成音頻旁白...');
          audioSpinner.start();
          const audioResults = await generateCourseNarration(classroom.scenes, audioDir);
          const successCount = audioResults.filter((r) => r.success).length;
          audioSpinner.succeed(`音頻生成完成: ${successCount}/${audioResults.length} 成功`);
        } catch (error) {
          console.warn(`⚠️  音頻生成略過: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // ============ Export (parallel) ============
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      console.log('\n📦 並行匯出中...');

      type ExportResult = { label: string; path: string } | null;

      const exportTasks: Promise<ExportResult>[] = [];

      if (formats.includes('pptx')) {
        const pptxPath = path.join(outputDir, `${parsedInput.title}.pptx`);
        exportTasks.push(
          generatePPTX(classroom, pptxPath)
            .then(() => { console.log('  ✅ PPTX 完成'); return { label: 'PPTX', path: pptxPath }; })
            .catch((err) => { console.error(`  ❌ PPTX 失敗: ${err}`); return null; })
        );
      }

      if (formats.includes('json')) {
        const jsonPath = path.join(outputDir, 'classroom.json');
        exportTasks.push(
          generateJSON(classroom, jsonPath)
            .then(() => { console.log('  ✅ JSON 完成'); return { label: 'JSON', path: jsonPath }; })
            .catch((err) => { console.error(`  ❌ JSON 失敗: ${err}`); return null; })
        );
      }

      if (formats.includes('html')) {
        const htmlPath = path.join(outputDir, 'index.html');
        exportTasks.push(
          generateHTML(classroom, htmlPath, audioDir)
            .then(() => { console.log('  ✅ HTML 完成'); return { label: 'HTML', path: htmlPath }; })
            .catch((err) => { console.error(`  ❌ HTML 失敗: ${err}`); return null; })
        );
      }

      if (formats.includes('graph')) {
        const graphPath = path.join(outputDir, 'graph.html');
        exportTasks.push(
          generateGraph(classroom, graphPath)
            .then(() => { console.log('  ✅ 知識圖譜 完成'); return { label: '知識圖譜', path: graphPath }; })
            .catch((err) => { console.error(`  ❌ 知識圖譜 失敗: ${err}`); return null; })
        );
      }

      const exportResults = await Promise.all(exportTasks);
      const exports = exportResults.filter((r): r is { label: string; path: string } => r !== null);

      // ============ Summary ============
      console.log(`\n${'='.repeat(50)}`);
      console.log('🎓 課程生成完成！');
      console.log('='.repeat(50));
      console.log(`\n📁 輸出檔案:`);
      exports.forEach(({ label, path: p }) => {
        console.log(`   • [${label}] ${p}`);
      });
      console.log(`\n🎉 完成！`);
    } catch (error) {
      console.error(`\n❌ 錯誤: ${error instanceof Error ? error.message : String(error)}`);
      if (argv.verbose) console.error(error);
      process.exit(1);
    }
  },
};
