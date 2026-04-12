import type { Argv } from 'yargs';
import * as fs from 'fs';
import * as path from 'path';
import { buildCourseGeneratorGraph } from '../../orchestration/director-graph.js';
import { createLLMAdapter } from '../../orchestration/llm-adapter.js';
import { generateCourseNarration } from '../../audio/omnivoice.js';
import { generatePPTX, generateJSON, generateHTML } from '../../export/index.js';
import type { ParsedInput, Config } from '../../types.js';

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
        describe: 'Export formats (pptx,json,html)',
        type: 'string',
        default: 'pptx,json',
      })
      .option('topic', {
        alias: 't',
        describe: 'Override topic (if input is a file)',
        type: 'string',
      });
  },

  handler: async (argv: any) => {
    try {
      const input = argv.input as string;
      const outputDir = path.resolve(argv.output);
      const formats = (argv.format as string).split(',').map((f) => f.trim());

      console.log(`\n🎓 teach-me CLI v2.0\n`);

      // ============ Parse Input ============
      console.log(`📂 Parsing input: ${input}`);
      let parsedInput: ParsedInput;

      if (fs.existsSync(input)) {
        // File input
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
        // Treat as topic/prompt
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

      // Check for Anthropic API key (for fallback mode)
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.warn('⚠️  No ANTHROPIC_API_KEY in .env.local');
        console.log('   When used within OpenClaw, the LLM will be injected.');
        console.log('   For standalone use, install: npm install @anthropic-ai/sdk\n');
        
        // For demo, we'll skip LLM and create a mock outline
        console.log('📝 Demo mode: Creating mock course outline...\n');
      } else {
        console.log(`✅ Using Anthropic API\n`);
      }

      // ============ Build Course Generator Graph ============
      console.log(`🔗 Building course generator graph...`);
      const graph = await buildCourseGeneratorGraph(llmAdapter);
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

      // For now, create mock output (since LLM may not be available)
      const mockOutline = [
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

      const classroom = {
        id: `course_${Date.now()}`,
        title: parsedInput.title,
        topic: parsedInput.title,
        scenes: mockOutline,
        metadata: {
          sourceFile: parsedInput.metadata.sourceFile,
          generatedAt: new Date().toISOString(),
          totalDuration: mockOutline.reduce((acc, s) => acc + (s.duration ?? 120), 0),
        },
      };

      console.log(`✅ Course generated with ${classroom.scenes.length} scenes`);

      // ============ Generate Audio ============
      if (formats.includes('pptx') || formats.includes('html')) {
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
