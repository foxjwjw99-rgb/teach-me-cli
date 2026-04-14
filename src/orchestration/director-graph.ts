import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import pLimit from 'p-limit';
import type { Scene, Classroom, GenerationProgress } from '../types.js';
import { OpenClawLLMAdapter } from './llm-adapter.js';
import { buildOutlinePrompt, buildContentPrompt, buildActionsPrompt } from './prompt-builder.js';
import { parseLLMJson } from '../utils/parse-json.js';

// ============== State Definition ==============

const CourseGeneratorState = Annotation.Root({
  // Input
  topic: Annotation<string>,
  content: Annotation<string>,

  // Processing
  outline: Annotation<Scene[]>({
    reducer: (prev, update) => update ?? prev,
    default: () => [],
  }),

  // Output
  classroom: Annotation<Classroom | null>({
    reducer: (prev, update) => update ?? prev,
    default: () => null,
  }),

  // Metadata
  progress: Annotation<GenerationProgress[]>({
    reducer: (prev, update) => [...prev, ...update],
    default: () => [],
  }),

  // Control
  shouldContinue: Annotation<boolean>,
});

type CourseGeneratorStateType = typeof CourseGeneratorState.State;

// ============== Helpers ==============

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
    const response = await llmAdapter.callWithRetry({
      messages: [{ role: 'user', content: prompt.userPrompt }],
      systemPrompt: prompt.systemPrompt,
      maxTokens: 4096,
    });

    const outline = parseLLMJson<Scene[]>(response.text, 'outlineNode');

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
  llmAdapter: OpenClawLLMAdapter,
  concurrency: number
): Promise<Partial<CourseGeneratorStateType>> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🎓 Stage 3: Generating Scene Content (concurrency: ${concurrency})`);
  console.log('='.repeat(50));

  const scenes = state.outline;
  const limit = pLimit(concurrency);

  const tasks = scenes.map((scene, i) =>
    limit(async () => {
      if (scene.type === 'quiz') {
        console.log(`⏭️  Scene ${i + 1}/${scenes.length} [quiz]: skipped`);
        return { index: i, scene: { ...scene, narration: '小測驗時間，請回答以下問題。' } };
      }

      console.log(`📄 Scene ${i + 1}/${scenes.length}: ${scene.title}`);
      const prompt = buildContentPrompt(scene);

      try {
        const response = await llmAdapter.callWithRetry({
          messages: [{ role: 'user', content: prompt.userPrompt }],
          systemPrompt: prompt.systemPrompt,
          maxTokens: 2048,
        });

        const contentData = parseLLMJson<Partial<Scene>>(response.text, `contentNode scene ${i + 1}`);

        console.log(`✅ Scene ${i + 1} content done`);
        return { index: i, scene: { ...scene, ...contentData } };
      } catch (error) {
        console.warn(`⚠️  Scene ${i + 1} content failed, using defaults`);
        return { index: i, scene };
      }
    })
  );

  const results = await Promise.all(tasks);
  const enrichedScenes = results
    .sort((a, b) => a.index - b.index)
    .map((r) => r.scene);

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
  llmAdapter: OpenClawLLMAdapter,
  concurrency: number
): Promise<Partial<CourseGeneratorStateType>> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🎓 Stage 4: Generating Speaker Actions (concurrency: ${concurrency})`);
  console.log('='.repeat(50));

  const scenes = state.outline;
  const limit = pLimit(concurrency);

  const tasks = scenes.map((scene, i) =>
    limit(async () => {
      if (scene.type === 'quiz' || !scene.narration) {
        return { index: i, scene };
      }

      console.log(`🎬 Scene ${i + 1}/${scenes.length}: ${scene.title}`);
      const prompt = buildActionsPrompt(scene);

      try {
        const response = await llmAdapter.callWithRetry({
          messages: [{ role: 'user', content: prompt.userPrompt }],
          systemPrompt: prompt.systemPrompt,
          maxTokens: 1024,
        });

        const actionsData = parseLLMJson<{ actions: Scene['actions'] }>(response.text, `actionsNode scene ${i + 1}`);

        console.log(`✅ Scene ${i + 1} actions done`);
        return { index: i, scene: { ...scene, actions: actionsData.actions || [] } };
      } catch (error) {
        console.warn(`⚠️  Scene ${i + 1} actions failed`);
        return { index: i, scene };
      }
    })
  );

  const results = await Promise.all(tasks);
  const scenesWithActions = results
    .sort((a, b) => a.index - b.index)
    .map((r) => r.scene);

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
    scenes: state.outline,
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

export async function buildCourseGeneratorGraph(
  llmAdapter: OpenClawLLMAdapter,
  options: { concurrency?: number } = {}
) {
  const concurrency = options.concurrency ?? 3;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workflow: any = new StateGraph(CourseGeneratorState);

  workflow.addNode('init', initNode);
  workflow.addNode('outline', async (state: CourseGeneratorStateType) => outlineNode(state, llmAdapter));
  workflow.addNode('content', async (state: CourseGeneratorStateType) => contentNode(state, llmAdapter, concurrency));
  workflow.addNode('actions', async (state: CourseGeneratorStateType) => actionsNode(state, llmAdapter, concurrency));
  workflow.addNode('finalize', finalizeNode);

  workflow.addEdge(START, 'init');
  workflow.addEdge('init', 'outline');
  workflow.addEdge('outline', 'content');
  workflow.addEdge('content', 'actions');
  workflow.addEdge('actions', 'finalize');
  workflow.addEdge('finalize', END);

  return workflow.compile();
}
