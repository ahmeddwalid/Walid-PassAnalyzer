import {
  MAX_CUSTOM_DICTIONARIES,
  MAX_DICTIONARY_FILE_BYTES,
  MAX_DICTIONARY_WORD_LENGTH,
  MAX_DICTIONARY_WORDS,
} from '../constants';
import type { Dictionary, DictionaryImport, DictionaryMatch } from '../types';

export class DictionaryImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DictionaryImportError';
  }
}

interface Pattern {
  word: string;
  normalized: string;
  codePointLength: number;
}

interface MatchCandidate {
  pattern: Pattern;
  start: number;
  endExclusive: number;
}

interface AhoNode {
  next: Map<string, number>;
  fail: number;
  outputs: number[];
}

class AhoCorasick {
  private readonly nodes: AhoNode[] = [{ next: new Map(), fail: 0, outputs: [] }];

  private readonly patterns: Pattern[] = [];

  addPattern(pattern: Pattern): void {
    this.patterns.push(pattern);
    let nodeIndex = 0;
    for (const character of pattern.normalized) {
      const node = this.nodes[nodeIndex];
      if (!node) throw new Error('Matcher construction failed.');
      const existing = node.next.get(character);
      if (existing !== undefined) {
        nodeIndex = existing;
        continue;
      }
      const nextIndex = this.nodes.length;
      this.nodes.push({ next: new Map(), fail: 0, outputs: [] });
      node.next.set(character, nextIndex);
      nodeIndex = nextIndex;
    }
    const terminal = this.nodes[nodeIndex];
    if (terminal) terminal.outputs.push(this.patterns.length - 1);
  }

  build(): void {
    const queue: number[] = [];
    const root = this.nodes[0];
    if (!root) return;
    for (const child of root.next.values()) {
      const node = this.nodes[child];
      if (node) node.fail = 0;
      queue.push(child);
    }

    while (queue.length > 0) {
      const currentIndex = queue.shift();
      if (currentIndex === undefined) break;
      const current = this.nodes[currentIndex];
      if (!current) continue;

      for (const [character, childIndex] of current.next) {
        queue.push(childIndex);
        let failIndex = current.fail;
        let failNode = this.nodes[failIndex];
        while (failNode && failIndex !== 0 && !failNode.next.has(character)) {
          failIndex = failNode.fail;
          failNode = this.nodes[failIndex];
        }
        const failureTarget = failNode?.next.get(character);
        const child = this.nodes[childIndex];
        if (!child) continue;
        child.fail =
          failureTarget !== undefined && failureTarget !== childIndex ? failureTarget : 0;
        const target = this.nodes[child.fail];
        if (target) child.outputs.push(...target.outputs);
      }
    }
  }

  search(
    normalizedText: string[],
  ): Array<{ patternIndex: number; start: number; endExclusive: number }> {
    const results: Array<{ patternIndex: number; start: number; endExclusive: number }> = [];
    let nodeIndex = 0;

    normalizedText.forEach((character, textIndex) => {
      let node = this.nodes[nodeIndex];
      while (nodeIndex !== 0 && node && !node.next.has(character)) {
        nodeIndex = node.fail;
        node = this.nodes[nodeIndex];
      }
      const next = node?.next.get(character);
      nodeIndex = next ?? 0;
      const current = this.nodes[nodeIndex];
      if (!current) return;
      for (const patternIndex of current.outputs) {
        const pattern = this.patterns[patternIndex];
        if (!pattern) continue;
        results.push({
          patternIndex,
          start: textIndex - Array.from(pattern.normalized).length + 1,
          endExclusive: textIndex + 1,
        });
      }
    });

    return results;
  }
}

interface CompiledMatcher {
  automaton: AhoCorasick;
  patterns: Pattern[];
}

const matcherCache = new WeakMap<Dictionary, CompiledMatcher>();

function normalizeCodePoint(character: string): string[] {
  return Array.from(character.toLowerCase());
}

function normalizeWithMap(value: string): { text: string[]; map: number[] } {
  const text: string[] = [];
  const map: number[] = [];
  Array.from(value).forEach((character, originalIndex) => {
    for (const lowered of normalizeCodePoint(character)) {
      text.push(lowered);
      map.push(originalIndex);
    }
  });
  return { text, map };
}

function compileMatcher(dictionary: Dictionary): CompiledMatcher {
  const cached = matcherCache.get(dictionary);
  if (cached) return cached;

  const automaton = new AhoCorasick();
  const patterns: Pattern[] = [];
  const seen = new Set<string>();

  for (const word of dictionary.words) {
    const normalized = Array.from(word)
      .map((character) => normalizeCodePoint(character).join(''))
      .join('');
    if (normalized.length < 3 || seen.has(normalized)) continue;
    seen.add(normalized);
    const pattern: Pattern = {
      word,
      normalized,
      codePointLength: Array.from(word).length,
    };
    patterns.push(pattern);
    automaton.addPattern(pattern);
  }

  automaton.build();
  const compiled = { automaton, patterns };
  matcherCache.set(dictionary, compiled);
  return compiled;
}

export function prewarmDictionary(dictionary: Dictionary): void {
  if (dictionary.enabled && dictionary.words.length > 0) {
    compileMatcher(dictionary);
  }
}

function severityFor(
  start: number,
  endExclusive: number,
  passwordLength: number,
  wordLength: number,
): 'low' | 'medium' | 'high' {
  const coverage = passwordLength === 0 ? 0 : wordLength / passwordLength;
  const exact = start === 0 && endExclusive === passwordLength;
  if (exact || (wordLength >= 6 && coverage >= 0.35)) return 'high';
  if (wordLength >= 4) return 'medium';
  return 'low';
}

export interface DictionaryScan {
  matches: DictionaryMatch[];
  /** Internal only: these words are fed to zxcvbn as user inputs. */
  matchedWords: string[];
}

export function scanDictionaries(password: string, dictionaries: Dictionary[]): DictionaryScan {
  if (password.length === 0) return { matches: [], matchedWords: [] };

  const { text, map } = normalizeWithMap(password);
  const passwordCodePointLength = Array.from(password).length;
  const candidates: Array<MatchCandidate & { dictionary: Dictionary }> = [];

  for (const dictionary of dictionaries) {
    if (!dictionary.enabled || dictionary.words.length === 0) continue;
    const compiled = compileMatcher(dictionary);
    const found = compiled.automaton.search(text);

    // Keep the longest match at each start position. A nested word such as
    // "pass" inside "password" is not a second, equally important finding.
    const sorted = found
      .map((result) => {
        const pattern = compiled.patterns[result.patternIndex];
        if (!pattern) return null;
        const originalStart = map[result.start];
        const originalEnd = map[result.endExclusive - 1];
        if (originalStart === undefined || originalEnd === undefined) return null;
        return {
          pattern,
          start: originalStart,
          endExclusive: originalEnd + 1,
          dictionary,
        };
      })
      .filter((candidate): candidate is MatchCandidate & { dictionary: Dictionary } =>
        Boolean(candidate),
      )
      .sort((left, right) => {
        if (left.start !== right.start) return left.start - right.start;
        return right.endExclusive - right.start - (left.endExclusive - left.start);
      });

    const kept: typeof sorted = [];
    for (const candidate of sorted) {
      const contained = kept.some(
        (existing) =>
          existing.start <= candidate.start && existing.endExclusive >= candidate.endExclusive,
      );
      if (contained) continue;
      kept.push(candidate);
      if (kept.length >= 80) break;
    }
    candidates.push(...kept);
  }

  const unique = new Map<string, MatchCandidate & { dictionary: Dictionary }>();
  for (const candidate of candidates) {
    const key = `${candidate.dictionary.id}:${candidate.start}:${candidate.endExclusive}:${candidate.pattern.normalized}`;
    if (!unique.has(key)) unique.set(key, candidate);
  }

  const matches: DictionaryMatch[] = [];
  const matchedWords = new Set<string>();

  for (const candidate of unique.values()) {
    const wordLength = candidate.endExclusive - candidate.start;
    matches.push({
      dictionaryId: candidate.dictionary.id,
      dictionaryName: candidate.dictionary.name,
      start: candidate.start + 1,
      end: candidate.endExclusive,
      wordLength,
      severity: severityFor(
        candidate.start,
        candidate.endExclusive,
        passwordCodePointLength,
        wordLength,
      ),
    });
    matchedWords.add(candidate.pattern.word);
  }

  matches.sort((left, right) => left.start - right.start || left.end - right.end);
  return {
    matches: matches.slice(0, 25),
    matchedWords: Array.from(matchedWords).slice(0, 25),
  };
}

function cleanName(value: string, fallback: string): string {
  const cleaned = value
    // Control characters are intentionally stripped from user-provided names.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned || fallback;
}

function validateWords(rawWords: unknown[], sourceName: string): string[] {
  if (rawWords.length === 0) {
    throw new DictionaryImportError('The dictionary contains no words.');
  }
  if (rawWords.length > MAX_DICTIONARY_WORDS) {
    throw new DictionaryImportError(
      `The dictionary contains ${rawWords.length.toLocaleString('en-US')} entries. The limit is ${MAX_DICTIONARY_WORDS.toLocaleString('en-US')}.`,
    );
  }

  const words: string[] = [];
  for (const rawWord of rawWords) {
    if (typeof rawWord !== 'string') {
      throw new DictionaryImportError(
        `"${sourceName}" contains a non-string entry. Every entry must be text.`,
      );
    }
    const word = rawWord.trim();
    if (word.length === 0 || word.startsWith('#')) continue;
    if (Array.from(word).length > MAX_DICTIONARY_WORD_LENGTH) {
      throw new DictionaryImportError(
        `A word in "${sourceName}" exceeds ${MAX_DICTIONARY_WORD_LENGTH} characters.`,
      );
    }
    // Control characters are intentionally rejected in imported dictionary words.
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(word)) {
      throw new DictionaryImportError(`A word in "${sourceName}" contains control characters.`);
    }
    words.push(word.normalize('NFC').toLowerCase());
  }

  if (words.length === 0) {
    throw new DictionaryImportError('The dictionary contains no usable words.');
  }
  return words;
}

function parseSerializedDictionary(
  text: string,
  fallbackName: string,
): {
  words: unknown[];
  name: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new DictionaryImportError(
      'The file looks like JSON but could not be parsed. Check commas, quotes, and brackets.',
    );
  }

  if (Array.isArray(parsed)) {
    return { words: parsed, name: fallbackName };
  }
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    Array.isArray((parsed as { words?: unknown }).words)
  ) {
    const object = parsed as { words: unknown[]; name?: unknown };
    return {
      words: object.words,
      name: typeof object.name === 'string' ? object.name : fallbackName,
    };
  }
  throw new DictionaryImportError(
    'Expected a JSON array of words, or an object with a "words" array.',
  );
}

export function importDictionaryText(
  rawText: string,
  name: string,
  looksLikeJson = false,
): DictionaryImport {
  const text = rawText.replace(/^\uFEFF/, '');
  if (text.length > MAX_DICTIONARY_FILE_BYTES) {
    throw new DictionaryImportError(
      `The list is larger than ${(MAX_DICTIONARY_FILE_BYTES / 1024 / 1024).toFixed(0)} MB.`,
    );
  }
  if (text.trim().length === 0) {
    throw new DictionaryImportError('The dictionary is empty.');
  }

  const fallbackName = cleanName(name, 'Imported dictionary');
  const serialized =
    looksLikeJson || text.trimStart().startsWith('{') || text.trimStart().startsWith('[');
  const parsed = serialized
    ? parseSerializedDictionary(text, fallbackName)
    : {
        words: text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.startsWith('#')),
        name: fallbackName,
      };

  const totalCandidates = parsed.words.length;
  const cleaned = validateWords(parsed.words, parsed.name);
  const unique = Array.from(new Set(cleaned));

  const dictionary: Dictionary = {
    id: `dictionary-${Date.now()}-${nextDictionaryId()}`,
    name: cleanName(parsed.name, fallbackName),
    words: unique,
    enabled: true,
    source: 'user',
    importedAt: new Date(),
  };

  return {
    dictionary,
    stats: {
      totalCandidates,
      uniqueWords: unique.length,
      duplicatesRemoved: Math.max(0, totalCandidates - unique.length),
    },
  };
}

let dictionaryCounter = 0;
function nextDictionaryId(): number {
  dictionaryCounter += 1;
  return dictionaryCounter;
}

export async function importDictionaryFile(file: File): Promise<DictionaryImport> {
  if (file.size > MAX_DICTIONARY_FILE_BYTES) {
    throw new DictionaryImportError(
      `The file is larger than ${(MAX_DICTIONARY_FILE_BYTES / 1024 / 1024).toFixed(0)} MB.`,
    );
  }
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith('.json') && !lowerName.endsWith('.txt')) {
    throw new DictionaryImportError('Only .json and .txt files are supported.');
  }
  if (file.size === 0) {
    throw new DictionaryImportError('The file is empty.');
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new DictionaryImportError('The file could not be read.');
  }

  return importDictionaryText(text, file.name.replace(/\.[^.]+$/, ''), lowerName.endsWith('.json'));
}

export function assertDictionaryCapacity(count: number): void {
  if (count >= MAX_CUSTOM_DICTIONARIES) {
    throw new DictionaryImportError(
      `You can keep up to ${MAX_CUSTOM_DICTIONARIES} custom dictionaries in this session. Remove one before importing another.`,
    );
  }
}
