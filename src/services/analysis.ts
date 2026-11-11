import { MAX_MODEL_INPUT_LENGTH, SCORE_VERDICTS } from '../constants';
import type { AnalysisResult, Dictionary, Score } from '../types';
import { AnalysisError, type ModelAnalysis } from './analysisCore';
import { scanDictionaries } from './dictionaries';

export { AnalysisError } from './analysisCore';

export class AnalyzerNotReadyError extends Error {
  constructor() {
    super('The strength model is still loading.');
    this.name = 'AnalyzerNotReadyError';
  }
}

interface PendingRequest {
  resolve: (result: ModelAnalysis) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

type WorkerResponse =
  | { type: 'ready' }
  | { type: 'result'; id: number; result: ModelAnalysis }
  | { type: 'error'; id: number; message: string };

let worker: Worker | null = null;
let workerReady = false;
let loading: Promise<void> | null = null;
let nextRequestId = 0;
const pending = new Map<number, PendingRequest>();

function failPending(error: Error): void {
  for (const request of pending.values()) {
    clearTimeout(request.timer);
    request.reject(error);
  }
  pending.clear();
}

function workerFailure(): AnalysisError {
  return new AnalysisError(
    'The local model worker stopped unexpectedly. Reload the page to try again.',
  );
}

function handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
  const data = event.data;
  if (data.type === 'ready') {
    workerReady = true;
    return;
  }

  const request = pending.get(data.id);
  if (!request) return;
  pending.delete(data.id);
  clearTimeout(request.timer);

  if (data.type === 'result') {
    request.resolve(data.result);
  } else {
    request.reject(new AnalysisError(data.message));
  }
}

function handleWorkerFailure(): void {
  worker?.terminate();
  worker = null;
  workerReady = false;
  failPending(workerFailure());
}

/**
 * Loads zxcvbn inside a module worker so long candidates cannot block the
 * interface. No candidate is sent over the network; the worker is same-origin
 * and loaded from the static build.
 */
export function loadAnalyzer(): Promise<void> {
  if (workerReady) return Promise.resolve();
  if (loading) return loading;

  if (typeof Worker === 'undefined') {
    return Promise.reject(
      new AnalysisError(
        'This browser does not support the Web Worker required for local analysis. No weaker fallback was used.',
      ),
    );
  }

  loading = new Promise<void>((resolve, reject) => {
    let settled = false;
    const settleError = (error: Error) => {
      if (settled) return;
      settled = true;
      loading = null;
      reject(error);
    };

    try {
      const instance = new Worker(new URL('./analysis.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker = instance;

      instance.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === 'ready') {
          workerReady = true;
          loading = null;
          if (!settled) {
            settled = true;
            resolve();
          }
          return;
        }
        handleWorkerMessage(event);
      };

      instance.onerror = () => {
        handleWorkerFailure();
        settleError(workerFailure());
      };
      instance.onmessageerror = () => {
        handleWorkerFailure();
        settleError(new AnalysisError('The local model worker returned an unreadable message.'));
      };
    } catch {
      settleError(
        new AnalysisError(
          'The local model worker could not be started. Reload the page to try again.',
        ),
      );
    }
  });

  return loading;
}

export function isAnalyzerReady(): boolean {
  return workerReady;
}

async function analyzeInWorker(password: string, userInputs: string[]): Promise<ModelAnalysis> {
  if (!worker || !workerReady) throw new AnalyzerNotReadyError();

  return new Promise<ModelAnalysis>((resolve, reject) => {
    const id = (nextRequestId += 1);
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(
        new AnalysisError(
          'The local assessment took too long and was stopped. The candidate was not logged or transmitted.',
        ),
      );
    }, 30_000);

    pending.set(id, { resolve, reject, timer });

    try {
      worker?.postMessage({ type: 'analyze', id, password, userInputs });
    } catch {
      clearTimeout(timer);
      pending.delete(id);
      reject(new AnalysisError('The local model could not receive this candidate.'));
    }
  });
}

/**
 * The returned object is sanitized: no model token, matched word, or candidate
 * value is retained in React state. Custom dictionary matches are computed on
 * the main thread and merged into the worker result.
 */
export async function analyzePassword(
  password: string,
  dictionaries: Dictionary[] = [],
): Promise<AnalysisResult> {
  if (!workerReady) throw new AnalyzerNotReadyError();
  if (password.length === 0) {
    throw new AnalysisError('There is no candidate to analyze.');
  }
  if (Array.from(password).length > MAX_MODEL_INPUT_LENGTH) {
    throw new AnalysisError(
      `The pattern model is limited to ${MAX_MODEL_INPUT_LENGTH} characters. The candidate was not truncated or modified.`,
    );
  }

  const customScan = scanDictionaries(password, dictionaries);

  try {
    const model = await analyzeInWorker(password, customScan.matchedWords);
    return { ...model, customMatches: customScan.matches };
  } catch (error) {
    if (error instanceof AnalysisError) throw error;
    throw new AnalysisError(
      'The strength model could not complete this assessment. The candidate was not logged or transmitted.',
    );
  }
}

export function verdictFor(score: Score) {
  return SCORE_VERDICTS[score];
}
