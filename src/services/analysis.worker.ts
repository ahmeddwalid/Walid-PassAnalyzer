import * as zxcvbnModule from 'zxcvbn';
import { runModel, type ModelAnalysis, type ZxcvbnFunction } from './analysisCore';

interface AnalyzeRequest {
  type: 'analyze';
  id: number;
  password: string;
  userInputs: string[];
}

interface WorkerScope {
  onmessage: ((event: MessageEvent<AnalyzeRequest>) => void) | null;
  postMessage(message: unknown): void;
}

const analyzer = ((zxcvbnModule as unknown as { default?: ZxcvbnFunction }).default ??
  zxcvbnModule) as unknown as ZxcvbnFunction;

const scope = self as unknown as WorkerScope;

scope.onmessage = (event) => {
  const { id, password, userInputs } = event.data;
  try {
    const result: ModelAnalysis = runModel(password, userInputs, analyzer);
    scope.postMessage({ type: 'result', id, result });
  } catch {
    scope.postMessage({
      type: 'error',
      id,
      message:
        'The strength model could not complete this assessment. The candidate was not logged or transmitted.',
    });
  }
};

scope.postMessage({ type: 'ready' });
