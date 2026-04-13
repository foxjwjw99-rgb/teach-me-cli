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

export const ContentSectionSchema = z.object({
  heading: z.string(),
  body: z.string().optional(),
  bullets: z.array(z.string()).default([]),
});
export type ContentSection = z.infer<typeof ContentSectionSchema>;

export const SceneContentSchema = z.object({
  text: z.string().optional(),
  html: z.string().optional(),
  imageUrl: z.string().optional(),
  callout: z.string().optional(),
  sections: z.array(ContentSectionSchema).default([]),
});
export type SceneContent = z.infer<typeof SceneContentSchema>;

export const DiscussionSchema = z.object({
  prompt: z.string(),
  participants: z.array(z.string()).default([]),
  expectedTakeaway: z.string().optional(),
});
export type Discussion = z.infer<typeof DiscussionSchema>;

export const QuizKindSchema = z.enum(['single_choice', 'multiple_choice', 'short_answer']);
export type QuizKind = z.infer<typeof QuizKindSchema>;

export const QuizSchema = z.object({
  kind: QuizKindSchema.default('single_choice'),
  question: z.string(),
  options: z.array(z.string()).optional(),
  answer: z.union([z.string(), z.array(z.string())]).optional(),
  explanation: z.string().optional(),
});
export type QuizConfig = z.infer<typeof QuizSchema>;

export const InteractiveSchema = z.object({
  format: z.enum(['simulation', 'exercise', 'demo', 'worksheet']).default('exercise'),
  instructions: z.string(),
  initialState: z.string().optional(),
  expectedOutcome: z.string().optional(),
});
export type InteractiveConfig = z.infer<typeof InteractiveSchema>;

export const PblSchema = z.object({
  role: z.string().optional(),
  challenge: z.string(),
  deliverable: z.string().optional(),
  milestones: z.array(z.string()).default([]),
});
export type PblConfig = z.infer<typeof PblSchema>;

export const SceneSchema = z.object({
  id: z.string(),
  type: SceneTypeSchema,
  title: z.string(),
  description: z.string().optional(),
  learningObjectives: z.array(z.string()).default([]),
  narration: z.string().optional(),
  teacherNotes: z.string().optional(),
  keyPoints: z.array(z.string()).default([]),
  actions: z.array(ActionSchema).default([]),
  duration: z.number().optional(),
  content: SceneContentSchema.optional(),
  discussion: DiscussionSchema.optional(),
  quiz: QuizSchema.optional(),
  interactive: InteractiveSchema.optional(),
  pbl: PblSchema.optional(),
});
export type Scene = Omit<z.infer<typeof SceneSchema>, 'learningObjectives'> & {
  learningObjectives?: string[];
};

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
export type Classroom = Omit<z.infer<typeof ClassroomSchema>, 'scenes'> & {
  scenes: Scene[];
};

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
  | 'generate_scene_details'
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
    refAudio: z.string().default('/Users/huli/.openclaw/workspace/voice-clones/jimmy-current-clone-reference.wav'),
    refText: z.string().default('这是现在我们学校流行的装饰品了。'),
    instruct: z.string().default('female, very low pitch'),
    speed: z.number().default(0.9),
    style: z.string().default('請用台灣國語的感覺說話，使用台灣繁體中文常用詞。不要香港口音，不要港式語調，不要粵語感。不要中國播報腔，不要兒化音。語氣自然、親切、口語，像台灣日常對話。'),
  }).optional(),
  generation: z.object({
    parallelScenes: z.number().default(3),
    timeoutMs: z.number().default(300000),
    retries: z.number().default(2),
  }).optional(),
  output: z.object({
    formats: z.array(z.enum(['pptx', 'json', 'html', 'mp4'])).default(['pptx', 'json']),
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
