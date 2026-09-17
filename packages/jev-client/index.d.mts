export type Question =
  | { type: 'choice'; instructions: string; criteria: Record<string, string | null> }
  | { type: 'noul'; instructions: string; criteria?: { true?: string; false?: string } };
export type Answer =
  | { type: 'choice'; choice: string; confidence: number; probabilities: Record<string, number> }
  | { type: 'noul'; noul: number };
export type Response = {
  model: string;
  answers: Record<string, Answer>;
  usage?: { input_tokens: number; output_tokens: number };
};
export type JevOptions = {
  apiKey: string;
  reserve: (reservation: { maximumUsd: number; requestBytes: number }) => Promise<boolean>;
  fetchImpl?: typeof fetch;
};
export function validateAnswer(answer: unknown, question: Question): Answer;
export function validateResponse(response: unknown, questions: Record<string, Question>): Response;
export function askJev(
  options: JevOptions & {
    request: { model: 'jev-latest'; state: unknown; questions: Record<string, Question> };
    timeoutMs?: number;
    maxBytes?: number;
  }
): Promise<
  | { status: 'ok'; response: Response; latencyMs: number }
  | { status: 'unavailable'; reason: string; latencyMs: number }
>;
