// Type definitions for the GPT-2 application

export interface GenerationParameters {
  max_length?: number;
  temperature?: number;
  top_p?: number;
  do_sample?: boolean;
  return_full_text?: boolean;
}

export interface HuggingFaceRequest {
  inputs: string;
  parameters?: GenerationParameters;
}

export interface HuggingFaceResponse {
  generated_text?: string;
  error?: string;
}

export interface APIGenerateRequest {
  prompt: string;
}

export interface APIGenerateResponse {
  generated_text: string;
}

export interface APIErrorResponse {
  error: string;
}
