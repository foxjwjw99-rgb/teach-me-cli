import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type {
  Classroom,
  Discussion,
  GenerationProgress,
  InteractiveConfig,
  PblConfig,
  QuizConfig,
  Scene,
  SceneContent,
  SceneType,
} from '../types.js';
import { OpenClawLLMAdapter } from './llm-adapter.js';
import { buildActionsPrompt, buildContentPrompt, buildOutlinePrompt } from './prompt-builder.js';

// ============== State Definition ==============

/**
 * Director Graph state for multi-stage course generation.
 * Inspired by OpenMAIC's architecture, adapted for CLI usage.
 */
const CourseGeneratorState = Annotation.Root({
  topic: Annotation<string>,
  content: Annotation<string>,

  outline: Annotation<Scene[]>({
    reducer: (prev, update) => update ?? prev,
    default: () => [],
  }),

  classroom: Annotation<Classroom | null>({
    reducer: (prev, update) => update ?? prev,
    default: () => null,
  }),

  progress: Annotation<GenerationProgress[]>({
    reducer: (prev, update) => [...prev, ...update],
    default: () => [],
  }),

  shouldContinue: Annotation<boolean>,
});

type CourseGeneratorStateType = typeof CourseGeneratorState.State;

function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const candidates: string[] = [];
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      candidates.push(cleaned.slice(firstBracket, lastBracket + 1));
    }

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      candidates.push(cleaned.slice(firstBrace, lastBrace + 1));
    }

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate) as T;
      } catch {
        // try next candidate
      }
    }

    throw new Error('Failed to parse JSON from model response.');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asSceneType(value: unknown): SceneType {
  return value === 'slide' || value === 'quiz' || value === 'interactive' || value === 'pbl'
    ? value
    : 'slide';
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function normalizeContent(value: unknown): SceneContent | undefined {
  if (!isRecord(value)) return undefined;

  const text = asString(value.text);
  const html = asString(value.html);
  const imageUrl = asString(value.imageUrl);
  const callout = asString(value.callout);
  const sectionsRaw = Array.isArray(value.sections) ? value.sections : [];
  const sections = sectionsRaw
    .filter(isRecord)
    .map((section) => ({
      heading: asString(section.heading) ?? '重點',
      body: asString(section.body),
      bullets: stringArray(section.bullets),
    }));

  if (!text && !html && !imageUrl && !callout && sections.length === 0) {
    return undefined;
  }

  return {
    ...(text ? { text } : {}),
    ...(html ? { html } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(callout ? { callout } : {}),
    sections,
  };
}

function normalizeDiscussion(value: unknown): Discussion | undefined {
  if (!isRecord(value)) return undefined;
  const prompt = asString(value.prompt);
  if (!prompt) return undefined;

  return {
    prompt,
    participants: stringArray(value.participants),
    ...(asString(value.expectedTakeaway) ? { expectedTakeaway: asString(value.expectedTakeaway) } : {}),
  };
}

function normalizeQuiz(value: unknown): QuizConfig | undefined {
  if (!isRecord(value)) return undefined;
  const question = asString(value.question);
  if (!question) return undefined;

  const kind = value.kind === 'multiple_choice' || value.kind === 'short_answer' ? value.kind : 'single_choice';
  const answerValue = value.answer;
  const answer = Array.isArray(answerValue)
    ? stringArray(answerValue)
    : asString(answerValue);

  return {
    kind,
    question,
    ...(Array.isArray(value.options) ? { options: stringArray(value.options) } : {}),
    ...(answer ? { answer } : {}),
    ...(asString(value.explanation) ? { explanation: asString(value.explanation) } : {}),
  };
}

function normalizeInteractive(value: unknown): InteractiveConfig | undefined {
  if (!isRecord(value)) return undefined;
  const instructions = asString(value.instructions);
  if (!instructions) return undefined;

  const format = value.format === 'simulation' || value.format === 'demo' || value.format === 'worksheet'
    ? value.format
    : 'exercise';

  return {
    format,
    instructions,
    ...(asString(value.initialState) ? { initialState: asString(value.initialState) } : {}),
    ...(asString(value.expectedOutcome) ? { expectedOutcome: asString(value.expectedOutcome) } : {}),
  };
}

function normalizePbl(value: unknown): PblConfig | undefined {
  if (!isRecord(value)) return undefined;
  const challenge = asString(value.challenge);
  if (!challenge) return undefined;

  return {
    challenge,
    ...(asString(value.role) ? { role: asString(value.role) } : {}),
    ...(asString(value.deliverable) ? { deliverable: asString(value.deliverable) } : {}),
    milestones: stringArray(value.milestones),
  };
}

function normalizeActions(value: unknown): Scene['actions'] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((action) => {
      const type = asString(action.type);
      if (!type) return null;
      return {
        type: type as Scene['actions'][number]['type'],
        params: isRecord(action.params) ? action.params : {},
        ...(asNumber(action.delay) !== undefined ? { delay: asNumber(action.delay) } : {}),
        ...(asNumber(action.duration) !== undefined ? { duration: asNumber(action.duration) } : {}),
      };
    })
    .filter((action): action is Scene['actions'][number] => action !== null);
}

function sceneId(index: number): string {
  return `scene_${String(index + 1).padStart(3, '0')}`;
}

function fallbackDetailsForScene(scene: Scene): Partial<Scene> {
  const common = {
    description: scene.description ?? `聚焦「${scene.title}」的核心概念，幫助學生建立清楚的理解。`,
    learningObjectives: (scene.learningObjectives ?? []).length > 0 ? scene.learningObjectives : [`理解 ${scene.title} 的核心概念`],
    teacherNotes: scene.teacherNotes ?? '先用生活化例子開場，再帶回本節重點，最後用一句話收束。',
    narration:
      scene.narration ??
      `${scene.title} 這一段，我們先抓住最重要的概念，再把它放回整體脈絡裡理解。你可以先注意這幾個關鍵點，等一下我會用更直白的方式一步一步拆開。`,
    content:
      scene.content ?? {
        text: scene.keyPoints.join('、'),
        callout: scene.keyPoints[0],
        sections: scene.keyPoints.slice(0, 3).map((point, index) => ({
          heading: `重點 ${index + 1}`,
          body: point,
          bullets: [],
        })),
      },
  } satisfies Partial<Scene>;

  if (scene.type === 'quiz') {
    return {
      ...common,
      quiz: scene.quiz ?? {
        kind: 'single_choice',
        question: `${scene.title} 最重要的概念是什麼？`,
        options: scene.keyPoints.length > 0 ? scene.keyPoints.slice(0, 4) : ['基本定義', '常見誤解', '應用情境', '總結觀念'],
        answer: scene.keyPoints[0] ?? '基本定義',
        explanation: '正確答案應該能直接對應到本段真正想讓學生記住的主軸。',
      },
      discussion: scene.discussion ?? {
        prompt: '先說說看你為什麼選這個答案。',
        participants: ['老師', '學生'],
        expectedTakeaway: '學生能把答案和本段重點連在一起。',
      },
    };
  }

  if (scene.type === 'interactive') {
    return {
      ...common,
      interactive: scene.interactive ?? {
        format: 'exercise',
        instructions: `請根據這一頁的重點，自己先操作或口頭推演一次 ${scene.title}。`,
        initialState: '先從已知條件開始整理。',
        expectedOutcome: '能把步驟與原因說清楚。',
      },
      discussion: scene.discussion,
    };
  }

  if (scene.type === 'pbl') {
    return {
      ...common,
      pbl: scene.pbl ?? {
        role: '學習者',
        challenge: `把 ${scene.title} 轉成一個可執行的小任務。`,
        deliverable: '一份簡短成果摘要',
        milestones: ['整理需求', '提出方法', '完成成果'],
      },
      discussion: scene.discussion ?? {
        prompt: '你會先怎麼拆這個任務？',
        participants: ['老師', '同學 A', '你'],
        expectedTakeaway: '把知識轉成行動步驟。',
      },
    };
  }

  return common;
}

function normalizeScene(input: unknown, index: number): Scene {
  const source = isRecord(input) ? input : {};
  const type = asSceneType(source.type);
  const title = asString(source.title) ?? `場景 ${index + 1}`;
  const keyPoints = stringArray(source.keyPoints);
  const learningObjectives = stringArray(source.learningObjectives);

  return {
    id: asString(source.id) ?? sceneId(index),
    type,
    title,
    ...(asString(source.description) ? { description: asString(source.description) } : {}),
    learningObjectives,
    ...(asString(source.narration) ? { narration: asString(source.narration) } : {}),
    ...(asString(source.teacherNotes) ? { teacherNotes: asString(source.teacherNotes) } : {}),
    keyPoints,
    actions: normalizeActions(source.actions),
    ...(asNumber(source.duration) !== undefined ? { duration: asNumber(source.duration) } : {}),
    ...(normalizeContent(source.content) ? { content: normalizeContent(source.content) } : {}),
    ...(normalizeDiscussion(source.discussion) ? { discussion: normalizeDiscussion(source.discussion) } : {}),
    ...(normalizeQuiz(source.quiz) ? { quiz: normalizeQuiz(source.quiz) } : {}),
    ...(normalizeInteractive(source.interactive) ? { interactive: normalizeInteractive(source.interactive) } : {}),
    ...(normalizePbl(source.pbl) ? { pbl: normalizePbl(source.pbl) } : {}),
  };
}

function mergeScenes(base: Scene, update: unknown, index: number): Scene {
  const merged = normalizeScene({
    ...base,
    ...(isRecord(update) ? update : {}),
    keyPoints: isRecord(update) && Array.isArray(update.keyPoints) ? update.keyPoints : base.keyPoints,
    learningObjectives: isRecord(update) && Array.isArray(update.learningObjectives)
      ? update.learningObjectives
      : (base.learningObjectives ?? []),
    actions: isRecord(update) && Array.isArray(update.actions) ? update.actions : base.actions,
    content: isRecord(update) && isRecord(update.content)
      ? {
          ...(base.content ?? {}),
          ...update.content,
          sections: Array.isArray(update.content.sections)
            ? update.content.sections
            : base.content?.sections,
        }
      : base.content,
    discussion: isRecord(update) && isRecord(update.discussion) ? update.discussion : base.discussion,
    quiz: isRecord(update) && isRecord(update.quiz) ? update.quiz : base.quiz,
    interactive: isRecord(update) && isRecord(update.interactive) ? update.interactive : base.interactive,
    pbl: isRecord(update) && isRecord(update.pbl) ? update.pbl : base.pbl,
  }, index);

  const fallback = fallbackDetailsForScene(merged);
  return normalizeScene({ ...fallback, ...merged }, index);
}

function extractOutlinePayload(raw: string): unknown[] {
  const parsed = parseJsonResponse<unknown>(raw);
  if (Array.isArray(parsed)) return parsed;
  if (isRecord(parsed) && Array.isArray(parsed.scenes)) return parsed.scenes;
  throw new Error('Outline response was not an array of scenes.');
}

// ============== Nodes ==============

async function initNode(state: CourseGeneratorStateType): Promise<Partial<CourseGeneratorStateType>> {
  console.log(`\n${'='.repeat(50)}`);
  console.log('🎓 Stage 1: Initializing Course Generation');
  console.log('='.repeat(50));
  console.log(`Topic: ${state.topic}`);
  console.log(`Content length: ${state.content.length} chars`);

  return {
    progress: [{
      stage: 'init',
      progress: 10,
      message: 'Initializing course generation...',
      timestamp: new Date().toISOString(),
    }],
    shouldContinue: true,
  };
}

async function outlineNode(
  state: CourseGeneratorStateType,
  llmAdapter: OpenClawLLMAdapter,
): Promise<Partial<CourseGeneratorStateType>> {
  console.log(`\n${'='.repeat(50)}`);
  console.log('🎓 Stage 2: Generating Course Outline');
  console.log('='.repeat(50));

  const prompt = buildOutlinePrompt(state.topic, state.content);

  try {
    const response = await llmAdapter.call({
      messages: [{ role: 'user', content: prompt.userPrompt }],
      systemPrompt: prompt.systemPrompt,
      maxTokens: 4096,
    });

    const outline = extractOutlinePayload(response.text).map((scene, index) => {
      const normalized = normalizeScene(scene, index);
      return mergeScenes(normalized, {}, index);
    });
    console.log(`✅ Generated ${outline.length} scenes`);

    return {
      outline,
      progress: [{
        stage: 'generate_outline',
        progress: 35,
        message: `Generated ${outline.length} scenes`,
        timestamp: new Date().toISOString(),
      }],
    };
  } catch (error) {
    console.error('❌ Outline generation failed:', error);
    throw error;
  }
}

async function sceneDetailNode(
  state: CourseGeneratorStateType,
  llmAdapter: OpenClawLLMAdapter,
): Promise<Partial<CourseGeneratorStateType>> {
  console.log(`\n${'='.repeat(50)}`);
  console.log('🎓 Stage 3: Generating Scene Details');
  console.log('='.repeat(50));

  const scenes = state.outline;
  const enrichedScenes: Scene[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    console.log(`\n📄 Processing scene ${i + 1}/${scenes.length}: ${scene.title} (${scene.type})`);

    const prompt = buildContentPrompt(scene);

    try {
      const response = await llmAdapter.call({
        messages: [{ role: 'user', content: prompt.userPrompt }],
        systemPrompt: prompt.systemPrompt,
        maxTokens: 3072,
      });

      const contentData = parseJsonResponse<unknown>(response.text);
      const enriched = mergeScenes(scene, contentData, i);
      enrichedScenes.push(enriched);
      console.log(`✅ Scene ${i + 1} detail generated`);
    } catch (error) {
      console.warn(`⚠️  Failed to generate details for scene ${i + 1}, using fallback details`);
      enrichedScenes.push(mergeScenes(scene, fallbackDetailsForScene(scene), i));
    }

    const progressPercent = 35 + Math.round(((i + 1) / scenes.length) * 30);
    console.log(`Progress: ${progressPercent}%`);
  }

  console.log('\n✅ All scene details generated');

  return {
    outline: enrichedScenes,
    progress: [{
      stage: 'generate_scene_details',
      progress: 65,
      message: 'Generated detailed content for all scenes',
      timestamp: new Date().toISOString(),
    }],
  };
}

async function actionsNode(
  state: CourseGeneratorStateType,
  llmAdapter: OpenClawLLMAdapter,
): Promise<Partial<CourseGeneratorStateType>> {
  console.log(`\n${'='.repeat(50)}`);
  console.log('🎓 Stage 4: Generating Speaker Actions');
  console.log('='.repeat(50));

  const scenes = state.outline;
  const scenesWithActions: Scene[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    console.log(`\n🎬 Generating actions for scene ${i + 1}/${scenes.length}`);

    const prompt = buildActionsPrompt(scene);

    try {
      const response = await llmAdapter.call({
        messages: [{ role: 'user', content: prompt.userPrompt }],
        systemPrompt: prompt.systemPrompt,
        maxTokens: 1536,
      });

      const actionsData = parseJsonResponse<unknown>(response.text);
      const enriched = mergeScenes(scene, actionsData, i);
      scenesWithActions.push(enriched);
      console.log(`✅ Actions generated for scene ${i + 1}`);
    } catch (error) {
      console.warn(`⚠️  Failed to generate actions for scene ${i + 1}, keeping existing actions`);
      scenesWithActions.push(mergeScenes(scene, { actions: scene.actions }, i));
    }
  }

  return {
    outline: scenesWithActions,
    progress: [{
      stage: 'generate_actions',
      progress: 82,
      message: 'Generated speaker actions',
      timestamp: new Date().toISOString(),
    }],
  };
}

async function finalizeNode(
  state: CourseGeneratorStateType,
): Promise<Partial<CourseGeneratorStateType>> {
  console.log(`\n${'='.repeat(50)}`);
  console.log('✅ Finalizing Classroom');
  console.log('='.repeat(50));

  const scenes = state.outline.map((scene, index) => mergeScenes(scene, {}, index));
  const classroom: Classroom = {
    id: `course_${Date.now()}`,
    title: state.topic,
    topic: state.topic,
    description: `由 teach-me-cli 依據「${state.topic}」生成的多場景互動課程。`,
    scenes,
    metadata: {
      generatedAt: new Date().toISOString(),
      generationModel: process.env.FALLBACK_MODEL ?? 'openclaw-local-model-bridge',
      totalDuration: scenes.reduce((acc, scene) => acc + (scene.duration ?? 120), 0),
    },
  };

  return {
    classroom,
    progress: [{
      stage: 'complete',
      progress: 100,
      message: 'Course generation complete!',
      timestamp: new Date().toISOString(),
    }],
  };
}

// ============== Graph Builder ==============

export interface GraphOptions {
  /**
   * Skip per-scene detail enrichment.
   * When true: outline → finalize directly (fastest path).
   * Default: false
   */
  skipContent?: boolean;

  /**
   * Skip per-scene speaker action generation.
   * Actions are only meaningful for interactive/animated exports.
   * Default: false (but auto-set to true for JSON-only runs by the CLI)
   */
  skipActions?: boolean;
}

export async function buildCourseGeneratorGraph(
  llmAdapter: OpenClawLLMAdapter,
  options: GraphOptions = {},
) {
  const { skipContent = false, skipActions = false } = options;

  const workflow = new StateGraph(CourseGeneratorState as any) as any;

  workflow.addNode('init', initNode);
  workflow.addNode('generateOutline', async (state: CourseGeneratorStateType) => outlineNode(state, llmAdapter));
  workflow.addNode('finalize', finalizeNode);

  workflow.addEdge(START, 'init');
  workflow.addEdge('init', 'generateOutline');

  if (skipContent) {
    console.log('⚡ Fast mode: skipping scene detail enrichment and action generation');
    workflow.addEdge('generateOutline', 'finalize');
  } else if (skipActions) {
    console.log('⚡ Lean mode: skipping action generation');
    workflow.addNode('generateSceneDetails', async (state: CourseGeneratorStateType) => sceneDetailNode(state, llmAdapter));
    workflow.addEdge('generateOutline', 'generateSceneDetails');
    workflow.addEdge('generateSceneDetails', 'finalize');
  } else {
    workflow.addNode('generateSceneDetails', async (state: CourseGeneratorStateType) => sceneDetailNode(state, llmAdapter));
    workflow.addNode('generateActions', async (state: CourseGeneratorStateType) => actionsNode(state, llmAdapter));
    workflow.addEdge('generateOutline', 'generateSceneDetails');
    workflow.addEdge('generateSceneDetails', 'generateActions');
    workflow.addEdge('generateActions', 'finalize');
  }

  workflow.addEdge('finalize', END);

  return workflow.compile();
}
