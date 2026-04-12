import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import type { Scene, Classroom, GenerationProgress } from '../types.js';
import { OpenClawLLMAdapter } from './llm-adapter.js';
import { buildOutlinePrompt, buildContentPrompt, buildActionsPrompt } from './prompt-builder.js';

// ============== State Definition ==============

/**
 * Director Graph state for multi-stage course generation
 * Inspired by OpenMAIC's architecture but simplified for CLI usage
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
  llmAdapter: OpenClawLLMAdapter
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

    const outline = parseJsonResponse<Scene[]>(response.text);
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

async function contentNode(
  state: CourseGeneratorStateType,
  llmAdapter: OpenClawLLMAdapter
): Promise<Partial<CourseGeneratorStateType>> {
  console.log(`\n${'='.repeat(50)}`);
  console.log('🎓 Stage 3: Generating Scene Content');
  console.log('='.repeat(50));

  const scenes = state.outline;
  const enrichedScenes: Scene[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    console.log(`\n📄 Processing scene ${i + 1}/${scenes.length}: ${scene.title}`);

    if (scene.type === 'quiz') {
      enrichedScenes.push({
        ...scene,
        narration: scene.narration || '小測驗時間，請回答以下問題。',
        actions: scene.actions || [],
      });
      continue;
    }

    const prompt = buildContentPrompt(scene);

    try {
      const response = await llmAdapter.call({
        messages: [{ role: 'user', content: prompt.userPrompt }],
        systemPrompt: prompt.systemPrompt,
        maxTokens: 2048,
      });

      const contentData = parseJsonResponse<Partial<Scene>>(response.text);

      enrichedScenes.push({
        ...scene,
        ...contentData,
        actions: contentData.actions || scene.actions || [],
      });

      console.log(`✅ Scene ${i + 1} content generated`);
    } catch (error) {
      console.warn(`⚠️  Failed to generate content for scene ${i + 1}, using defaults`);
      enrichedScenes.push({
        ...scene,
        actions: scene.actions || [],
      });
    }

    const progressPercent = 35 + Math.round((i / scenes.length) * 30);
    console.log(`Progress: ${progressPercent}%`);
  }

  console.log(`\n✅ All scene content generated`);

  return {
    outline: enrichedScenes,
    progress: [{
      stage: 'generate_content',
      progress: 65,
      message: 'Generated content for all scenes',
      timestamp: new Date().toISOString(),
    }],
  };
}

async function actionsNode(
  state: CourseGeneratorStateType,
  llmAdapter: OpenClawLLMAdapter
): Promise<Partial<CourseGeneratorStateType>> {
  console.log(`\n${'='.repeat(50)}`);
  console.log('🎓 Stage 4: Generating Speaker Actions');
  console.log('='.repeat(50));

  const scenes = state.outline;
  const scenesWithActions: Scene[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    console.log(`\n🎬 Generating actions for scene ${i + 1}/${scenes.length}`);

    if (scene.type === 'quiz' || !scene.narration) {
      scenesWithActions.push({
        ...scene,
        actions: scene.actions || [],
      });
      continue;
    }

    const prompt = buildActionsPrompt(scene);

    try {
      const response = await llmAdapter.call({
        messages: [{ role: 'user', content: prompt.userPrompt }],
        systemPrompt: prompt.systemPrompt,
        maxTokens: 1024,
      });

      const actionsData = parseJsonResponse<{ actions?: Scene['actions'] }>(response.text);

      scenesWithActions.push({
        ...scene,
        actions: actionsData.actions || [],
      });

      console.log(`✅ Actions generated for scene ${i + 1}`);
    } catch (error) {
      console.warn(`⚠️  Failed to generate actions for scene ${i + 1}`);
      scenesWithActions.push({
        ...scene,
        actions: scene.actions || [],
      });
    }
  }

  return {
    outline: scenesWithActions,
    progress: [{
      stage: 'generate_actions',
      progress: 80,
      message: 'Generated speaker actions',
      timestamp: new Date().toISOString(),
    }],
  };
}

async function finalizeNode(
  state: CourseGeneratorStateType
): Promise<Partial<CourseGeneratorStateType>> {
  console.log(`\n${'='.repeat(50)}`);
  console.log('✅ Finalizing Classroom');
  console.log('='.repeat(50));

  const classroom: Classroom = {
    id: `course_${Date.now()}`,
    title: state.topic,
    topic: state.topic,
    scenes: state.outline.map((scene) => ({
      ...scene,
      actions: scene.actions || [],
    })),
    metadata: {
      generatedAt: new Date().toISOString(),
      totalDuration: state.outline.reduce((acc, s) => acc + (s.duration ?? 120), 0),
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

export async function buildCourseGeneratorGraph(llmAdapter: OpenClawLLMAdapter) {
  const workflow = new StateGraph(CourseGeneratorState as any) as any;

  workflow.addNode('init', initNode);
  workflow.addNode('generateOutline', async (state: CourseGeneratorStateType) => outlineNode(state, llmAdapter));
  workflow.addNode('generateContent', async (state: CourseGeneratorStateType) => contentNode(state, llmAdapter));
  workflow.addNode('generateActions', async (state: CourseGeneratorStateType) => actionsNode(state, llmAdapter));
  workflow.addNode('finalize', finalizeNode);

  workflow.addEdge(START, 'init');
  workflow.addEdge('init', 'generateOutline');
  workflow.addEdge('generateOutline', 'generateContent');
  workflow.addEdge('generateContent', 'generateActions');
  workflow.addEdge('generateActions', 'finalize');
  workflow.addEdge('finalize', END);

  return workflow.compile();
}
