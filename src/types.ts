import { z } from 'zod';

// ============== Classroom Structure ==============

export const SceneTypeSchema = z.enum(['slide', 'quiz', 'interactive', 'pbl']);
export type SceneType = z.infer<typeof SceneTypeSchema>;

export const ActionTypeSchema = z.enum([
  'agent_speech',
  'whiteboard_draw',
  'whiteboard_text',
  'whiteboard_shape',
  'whiteboard_chart',
  'whiteboard_clear',
  'spotlight_on',
  'spotlight_off',
  'laser_pointer',
  'slide_transition',
  'element_animate',
  'agent_pause',
  'quiz_trigger',
  'discussion_prompt',
]);
export type ActionType = z.infer<typeof ActionTypeSchema>;

export const ActionSchema = z.object({
  type: ActionTypeSchema,
  params: z.record(z.string(), z.unknown()),
  delay: z.number().optional(),
  duration: z.number().optional(),
});
export type Action = z.infer<typeof ActionSchema>;

export const SceneSchema = z.object({
  id: z.string(),
  type: SceneTypeSchema,
  title: z.string(),
  narration: z.string().optional(),
  keyPoints: z.array(z.string()),
  actions: z.array(ActionSchema).default([]),
  duration: z.number().optional(),
  content: z.object({
    text: z.string().optional(),
    html: z.string().optional(),
    imageUrl: z.string().optional(),
  }).optional(),
});
export type Scene = z.infer<typeof SceneSchema>;

export const ClassroomSchema = z.object({
  id: z.string(),
  title: z.string(),
  topic: z.string(),
  description: z.string().optional(),
  scenes: z.array(SceneSchema),
  metadata: z.object({
    sourceFile: z.string().optional(),
    generatedAt: z.string(),
    generationModel: z.string().optional(),
    totalDuration: z.number().optional(),
  }),
});
export type Classroom = z.infer<typeof ClassroomSchema>;

// ============== LLM Request/Response ==============

export const LLMRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
});
export type LLMRequest = z.infer<typeof LLMRequestSchema>;

export const LLMResponseSchema = z.object({
  text: z.string(),
  stopReason: z.string().optional(),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
  }).optional(),
});
export type LLMResponse = z.infer<typeof LLMResponseSchema>;

// ============== Generation Progress ==============

export type GenerationStage = 
  | 'init'
  | 'parse_input'
  | 'generate_outline'
  | 'generate_content'
  | 'generate_images'
  | 'generate_actions'
  | 'generate_audio'
  | 'export_pptx'
  | 'export_json'
  | 'export_html'
  | 'complete'
  | 'error';

export const GenerationProgressSchema = z.object({
  stage: z.string() as z.ZodType<GenerationStage>,
  progress: z.number().min(0).max(100),
  message: z.string(),
  timestamp: z.string(),
});
export type GenerationProgress = z.infer<typeof GenerationProgressSchema>;

// ============== Config ==============

export const ConfigSchema = z.object({
  omnivoice: z.object({
    refAudio: z.string().optional(),
    refText: z.string().optional(),
    instruct: z.string().optional(),
    speed: z.number().optional(),
    style: z.string().optional(),
  }).optional(),
  generation: z.object({
    parallelScenes: z.number().default(3),
    timeoutMs: z.number().default(300000),
    retries: z.number().default(2),
  }).optional(),
  output: z.object({
    formats: z.array(z.enum(['pptx', 'json', 'html'])).default(['pptx', 'json']),
    dir: z.string().default('./output'),
  }).optional(),
  llm: z.object({
    // OpenClaw will provide these
    provider: z.enum(['openclaw', 'anthropic', 'openai', 'gemini']).optional(),
    model: z.string().optional(),
    temperature: z.number().optional(),
  }).optional(),
});
export type Config = z.infer<typeof ConfigSchema>;

// ============== File Input ==============

export const FileInputSchema = z.object({
  path: z.string(),
  type: z.enum(['pdf', 'markdown', 'text', 'url']),
  encoding: z.string().default('utf-8'),
});
export type FileInput = z.infer<typeof FileInputSchema>;

export const ParsedInputSchema = z.object({
  title: z.string(),
  content: z.string(),
  metadata: z.object({
    sourceFile: z.string(),
    fileType: z.string(),
    extractedAt: z.string(),
  }),
});
export type ParsedInput = z.infer<typeof ParsedInputSchema>;
