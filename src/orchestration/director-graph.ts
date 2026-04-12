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

// ============== Nodes ==============

/**
 * Stage 1: Parse input and prepare outline generation
 */
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

/**
 * Stage 2: Generate course outline using LLM
 */
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

    // Parse JSON response
    let outline: Scene[] = [];
    try {
      const text = response.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      outline = JSON.parse(text);
    } catch (e) {
      console.error('❌ Failed to parse outline JSON');
      throw e;
    }

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

/**
 * Stage 3: Generate detailed content for each scene
 */
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
      // Quiz scenes: keep simple
      enrichedScenes.push({
        ...scene,
        narration: '小測驗時間，請回答以下問題。',
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

      // Parse and merge content
      const contentData = JSON.parse(
        response.text
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
      );

      enrichedScenes.push({
        ...scene,
        ...contentData,
      });

      console.log(`✅ Scene ${i + 1} content generated`);
    } catch (error) {
      console.warn(`⚠️  Failed to generate content for scene ${i + 1}, using defaults`);
      enrichedScenes.push(scene);
    }

    // Update progress
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

/**
 * Stage 4: Generate speaker actions (whiteboard, speech, effects)
 */
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
      scenesWithActions.push(scene);
      continue;
    }

    const prompt = buildActionsPrompt(scene);
    
    try {
      const response = await llmAdapter.call({
        messages: [{ role: 'user', content: prompt.userPrompt }],
        systemPrompt: prompt.systemPrompt,
        maxTokens: 1024,
      });

      const actionsData = JSON.parse(
        response.text
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
      );

      scenesWithActions.push({
        ...scene,
        actions: actionsData.actions || [],
      });

      console.log(`✅ Actions generated for scene ${i + 1}`);
    } catch (error) {
      console.warn(`⚠️  Failed to generate actions for scene ${i + 1}`);
      scenesWithActions.push(scene);
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

/**
 * Finalize: Create classroom structure
 */
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

export async function buildCourseGeneratorGraph(llmAdapter: OpenClawLLMAdapter) {
  const workflow = new StateGraph(CourseGeneratorState);

  workflow.addNode('init', initNode);
  workflow.addNode('outline', async (state) => outlineNode(state, llmAdapter));
  workflow.addNode('content', async (state) => contentNode(state, llmAdapter));
  workflow.addNode('actions', async (state) => actionsNode(state, llmAdapter));
  workflow.addNode('finalize', finalizeNode);

  workflow.addEdge(START, 'init');
  workflow.addEdge('init', 'outline');
  workflow.addEdge('outline', 'content');
  workflow.addEdge('content', 'actions');
  workflow.addEdge('actions', 'finalize');
  workflow.addEdge('finalize', END);

  return workflow.compile();
}
