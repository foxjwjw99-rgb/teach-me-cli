import type { Argv } from 'yargs';
import * as fs from 'fs';
import * as path from 'path';
import { buildCourseGeneratorGraph } from '../../orchestration/director-graph.js';
import { createLLMAdapter } from '../../orchestration/llm-adapter.js';
import { generateCourseNarration } from '../../audio/omnivoice.js';
import { generatePPTX, generateJSON, generateHTML, generateMP4 } from '../../export/index.js';
import type { ParsedInput, Config, Classroom, Scene } from '../../types.js';

/** Return true when only JSON output is requested (no rich formats that need actions). */
function isJsonOnly(formats: string[]): boolean {
  return formats.every((f) => f === 'json');
}

function buildMockClassroom(parsedInput: ParsedInput): Classroom {
  const scenes: Scene[] = [
    {
      id: 'scene_001',
      type: 'slide',
      title: `${parsedInput.title} 簡介`,
      description: '建立整堂課的脈絡，先知道會學什麼、為什麼重要。',
      learningObjectives: ['理解課程主軸', '掌握本次學習路徑'],
      keyPoints: ['介紹主題', '學習目標', '課程概覽'],
      narration: `歡迎來到 ${parsedInput.title} 的課程。我們會先建立整體地圖，讓你知道這堂課準備帶你看到什麼重點。`,
      teacherNotes: '先用直覺例子開場，再快速說明這堂課的節奏。',
      content: {
        text: '先看全貌，再進入細節。',
        callout: '先知道路線，學起來會更穩。',
        sections: [
          { heading: '課程焦點', body: `這堂課會聚焦 ${parsedInput.title} 的核心概念。`, bullets: ['先建立基本理解', '再看應用或延伸'] },
        ],
      },
      actions: [],
      duration: 120,
    },
    {
      id: 'scene_002',
      type: 'interactive',
      title: '核心概念練習',
      description: '把抽象概念轉成可操作的步驟。',
      learningObjectives: ['能自己描述核心概念', '能嘗試一步步推演'],
      keyPoints: ['定義', '特性', '應用'],
      narration: '接下來不要只看定義，我們試著把概念拆成可以操作的步驟。',
      teacherNotes: '鼓勵學生先說自己的理解，再補正。',
      interactive: {
        format: 'exercise',
        instructions: '請先用自己的話解釋這個概念，然後舉一個例子。',
        initialState: '從最直覺的理解開始',
        expectedOutcome: '能用自己的例子說明概念',
      },
      discussion: {
        prompt: '如果要教朋友，你會怎麼解釋？',
        participants: ['老師', '學生'],
        expectedTakeaway: '把概念從記憶變成可表達。',
      },
      actions: [],
      duration: 180,
    },
    {
      id: 'scene_003',
      type: 'quiz',
      title: '小測驗',
      description: '快速確認前面兩段有沒有真正理解。',
      learningObjectives: ['能辨識正確觀念', '能說明選項差異'],
      keyPoints: ['複習內容', '自我檢驗'],
      narration: '現在來做一個短測驗，不是要背答案，而是要確認你真的抓到重點。',
      teacherNotes: '先讓學生作答，再講解析，不要一開始就公布答案。',
      quiz: {
        kind: 'single_choice',
        question: `${parsedInput.title} 這堂課目前最重要的學習目標是什麼？`,
        options: ['先建立整體理解', '只背定義', '只看進階內容', '跳過基本觀念'],
        answer: '先建立整體理解',
        explanation: '先建立整體理解，後續細節才有位置可放。',
      },
      actions: [],
      duration: 120,
    },
  ];

  return {
    id: `course_${Date.now()}`,
    title: parsedInput.title,
    topic: parsedInput.title,
    description: `以 ${parsedInput.title} 為主題的示範課程。`,
    scenes,
    metadata: {
      sourceFile: parsedInput.metadata.sourceFile,
      generatedAt: new Date().toISOString(),
      totalDuration: scenes.reduce((acc, s) => acc + (s.duration ?? 120), 0),
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
        describe: 'Export formats: pptx, json, html, mp4 (comma-separated)',
        type: 'string',
        default: 'pptx,json',
      })
      .option('topic', {
        alias: 't',
        describe: 'Override topic (if input is a file)',
        type: 'string',
      })
      .option('actions', {
        describe:
          'Generate per-scene speaker actions (whiteboard draws, spotlights, etc.).\n' +
          'Defaults to true for pptx/html output, false for json-only (saves N model calls).',
        type: 'boolean',
        // undefined = auto-detect based on format
      })
      .option('fast', {
        describe:
          'Fast/quick mode: skip content enrichment AND action generation.\n' +
          'Uses only the outline LLM call, then exports immediately. Ideal for JSON drafts.',
        type: 'boolean',
        default: false,
      });
  },

  handler: async (argv: any) => {
    try {
      const input = argv.input as string;
      const outputDir = path.resolve(argv.output);
      const formats = (argv.format as string).split(',').map((f) => f.trim());
      const fastMode = argv.fast as boolean;

      // Resolve skipActions:
      //   --fast        → skip everything (content + actions)
      //   --actions     → explicit opt-in for actions
      //   --no-actions  → explicit opt-out
      //   (default)     → skip if json-only, include if pptx/html present
      const skipContent = fastMode;
      let skipActions: boolean;
      if (fastMode) {
        skipActions = true;
      } else if (argv.actions !== undefined) {
        skipActions = !(argv.actions as boolean);
      } else {
        skipActions = isJsonOnly(formats);
      }

      console.log(`\n🎓 teach-me CLI v2.0\n`);

      // ============ Parse Input ============
      console.log(`📂 Parsing input: ${input}`);
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

      console.log(`✅ Input parsed: "${parsedInput.title}"`);
      console.log(`   Length: ${parsedInput.content.length} characters\n`);

      // ============ Initialize LLM Adapter ============
      console.log(`🧠 Initializing LLM Adapter`);
      const llmAdapter = createLLMAdapter();
      console.log('✅ Using OpenClaw local model bridge\n');

      // ============ Build Course Generator Graph ============
      const modeLabel = fastMode
        ? 'fast (outline only)'
        : skipActions
        ? 'lean (outline + content)'
        : 'full (outline + content + actions)';
      console.log(`🔗 Building course generator graph [${modeLabel}]...`);
      const graph = await buildCourseGeneratorGraph(llmAdapter, { skipContent, skipActions });
      console.log(`✅ Graph built\n`);

      // ============ Execute Graph ============
      const initialState = {
        topic: parsedInput.title,
        content: parsedInput.content,
        outline: [],
        classroom: null,
        progress: [],
        shouldContinue: true,
      };

      console.log(`\n🚀 Starting course generation...\n`);

      let classroom: Classroom;

      try {
        const finalState = await graph.invoke(initialState);
        classroom = finalState.classroom as Classroom;

        if (!classroom || !Array.isArray(classroom.scenes) || classroom.scenes.length === 0) {
          throw new Error('Graph completed without a valid classroom payload.');
        }

        console.log(`✅ Course generated with ${classroom.scenes.length} scenes`);
      } catch (error) {
        console.warn(`⚠️  Real generation failed, falling back to mock course: ${error instanceof Error ? error.message : String(error)}`);
        classroom = buildMockClassroom(parsedInput);
        console.log(`✅ Fallback course generated with ${classroom.scenes.length} scenes`);
      }

      // ============ Generate Audio ============
      if (formats.includes('pptx') || formats.includes('html') || formats.includes('mp4')) {
        const audioDir = path.join(outputDir, 'audio');
        try {
          console.log(`\n🎙️  Generating audio...`);
          const config: Partial<Config> = {
            omnivoice: {
              refAudio: '/Users/huli/.openclaw/workspace/voice-clones/jimmy-current-clone-reference.wav',
              refText: '这是现在我们学校流行的装饰品了。',
              instruct: 'female, very low pitch',
              speed: 0.9,
              style: '請用台灣國語的感覺說話，使用台灣繁體中文常用詞。不要香港口音，不要港式語調，不要粵語感。不要中國播報腔，不要兒化音。語氣自然、親切、口語，像台灣日常對話。',
            },
          };

          const audioResults = await generateCourseNarration(classroom.scenes, audioDir, config);
          const successCount = audioResults.filter((r) => r.success).length;
          console.log(`✅ Generated ${successCount}/${audioResults.length} audio files`);
        } catch (error) {
          console.warn(`⚠️  Audio generation skipped: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // ============ Export ============
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const exports: string[] = [];

      if (formats.includes('pptx')) {
        const pptxPath = path.join(outputDir, `${parsedInput.title}.pptx`);
        try {
          await generatePPTX(classroom, pptxPath);
          exports.push(pptxPath);
        } catch (error) {
          console.error(`❌ PPTX export failed: ${error}`);
        }
      }

      if (formats.includes('json')) {
        const jsonPath = path.join(outputDir, 'classroom.json');
        try {
          await generateJSON(classroom, jsonPath);
          exports.push(jsonPath);
        } catch (error) {
          console.error(`❌ JSON export failed: ${error}`);
        }
      }

      if (formats.includes('html')) {
        const htmlPath = path.join(outputDir, 'index.html');
        try {
          await generateHTML(classroom, htmlPath, path.join(outputDir, 'audio'));
          exports.push(htmlPath);
        } catch (error) {
          console.error(`❌ HTML export failed: ${error}`);
        }
      }

      if (formats.includes('mp4')) {
        const mp4Path = path.join(outputDir, `${parsedInput.title}.mp4`);
        const audioDir = path.join(outputDir, 'audio');
        const narrationDir = path.join(outputDir, 'narrations');
        // Prefer whichever audio subdirectory actually exists
        const resolvedAudioDir = fs.existsSync(narrationDir)
          ? narrationDir
          : fs.existsSync(audioDir)
          ? audioDir
          : undefined;
        try {
          await generateMP4(classroom, mp4Path, resolvedAudioDir);
          exports.push(mp4Path);
        } catch (error) {
          console.error(`❌ MP4 export failed: ${error}`);
        }
      }

      // ============ Summary ============
      console.log(`\n${'='.repeat(50)}`);
      console.log('✅ Course Generation Complete!');
      console.log('='.repeat(50));
      console.log(`\n📁 Output Files:`);
      exports.forEach((file) => {
        console.log(`   • ${file}`);
      });
      console.log(`\n🎓 Ready to use!`);
    } catch (error) {
      console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error(error);
      process.exit(1);
    }
  },
};
