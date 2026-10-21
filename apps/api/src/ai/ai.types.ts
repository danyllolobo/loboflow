export interface JarvisChatInput {
  conversationId?: string;
  message: string;
}

export interface JarvisToolExecutionResult {
  tool: string;
  level: 1 | 2 | 3;
  status: 'succeeded' | 'pending_confirmation' | 'cancelled' | 'failed';
  details?: string;
}

export interface JarvisReference {
  type: string;
  id: string;
  label: string;
}

export interface JarvisChatResponse {
  conversationId: string;
  message: {
    id: string;
    role: 'assistant';
    content: string;
    toolExecution?: JarvisToolExecutionResult;
    references?: JarvisReference[];
    createdAt: string;
  };
}
