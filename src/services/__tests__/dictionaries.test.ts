import { describe, expect, it } from 'vitest';
import { DictionaryImportError, importDictionaryText, scanDictionaries } from '../dictionaries';
import type { Dictionary } from '../../types';

function dictionary(words: string[], name = 'Test list'): Dictionary {
  return {
    id: `dict-${name}`,
    name,
    words,
    enabled: true,
    source: 'user',
    importedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

describe('dictionary import', () => {
  it('imports newline text, removes comments and duplicates, and lowercases', () => {
    const imported = importDictionaryText(
      '# comment\nOrion\norion\nfalcon\n\nproject\n',
      'Support team terms',
    );
    expect(imported.dictionary.words).toEqual(['orion', 'falcon', 'project']);
    expect(imported.stats.uniqueWords).toBe(3);
    expect(imported.dictionary.name).toBe('Support team terms');
  });

  it('accepts JSON arrays and named objects', () => {
    const array = importDictionaryText('["Alpha", "beta", "ALPHA"]', 'Array');
    expect(array.dictionary.words).toEqual(['alpha', 'beta']);

    const object = importDictionaryText(
      '{"name":"Org terms","words":["falcon","project"]}',
      'Fallback',
    );
    expect(object.dictionary.name).toBe('Org terms');
    expect(object.dictionary.words).toEqual(['falcon', 'project']);
  });

  it('rejects invalid JSON, non-string entries, empty lists, control characters, and long words', () => {
    expect(() => importDictionaryText('{ not json', 'Bad')).toThrow(DictionaryImportError);
    expect(() => importDictionaryText('[1, 2, 3]', 'Numbers')).toThrow(/non-string/i);
    expect(() => importDictionaryText('   \n# only comments\n', 'Empty')).toThrow(
      /no words|empty|usable/i,
    );
    expect(() => importDictionaryText('bad\u0000word', 'Control')).toThrow(/control/i);
    expect(() => importDictionaryText('a'.repeat(129), 'Long')).toThrow(/128/);
  });

  it('enforces the word count cap before building the dictionary', () => {
    const tooMany = Array.from({ length: 50_001 }, (_, index) => `word${index}`).join('\n');
    expect(() => importDictionaryText(tooMany, 'Too large')).toThrow(/50,000|limit/i);
    expect(() => importDictionaryText('a'.repeat(2 * 1024 * 1024 + 1), 'Huge paste')).toThrow(
      /2 MB/,
    );
  });
});

describe('dictionary matching', () => {
  it('finds case-insensitive matches with useful positions and severity', () => {
    const scan = scanDictionaries('orion-falcon-2024', [
      dictionary(['orion', 'falcon', 'project']),
    ]);
    expect(scan.matches).toHaveLength(2);
    expect(scan.matches[0]).toMatchObject({
      dictionaryName: 'Test list',
      start: 1,
      end: 5,
      severity: 'medium',
    });
    expect(scan.matches[1]).toMatchObject({
      start: 7,
      end: 12,
      severity: 'high',
    });
    expect(scan.matchedWords).toEqual(expect.arrayContaining(['orion', 'falcon']));
  });

  it('keeps the longest match at one position instead of double-counting substrings', () => {
    const scan = scanDictionaries('mypassword2024', [
      dictionary(['pass', 'password', 'passwords']),
    ]);
    expect(scan.matches).toHaveLength(1);
    expect(scan.matches[0]).toMatchObject({ start: 3, end: 10, wordLength: 8 });
  });

  it('ignores terms shorter than three characters', () => {
    const scan = scanDictionaries('ab-cd-ef', [dictionary(['ab', 'cd', 'ef'])]);
    expect(scan.matches).toHaveLength(0);
  });

  it('matches Unicode terms without losing code-point positions', () => {
    const scan = scanDictionaries('pré-café-2024', [dictionary(['café'])]);
    expect(scan.matches).toHaveLength(1);
    expect(scan.matches[0]).toMatchObject({ start: 5, end: 8 });
  });

  it('does not match disabled dictionaries', () => {
    const disabled = { ...dictionary(['orion']), enabled: false };
    expect(scanDictionaries('orion', [disabled]).matches).toHaveLength(0);
  });

  it('handles a large dictionary without pathological slowdown', () => {
    const words = Array.from({ length: 10_000 }, (_, index) => `term${index}`);
    const scan = scanDictionaries('prefix-term9999-suffix', [dictionary(words)]);
    expect(scan.matches[0]?.dictionaryName).toBe('Test list');
    expect(scan.matches[0]?.wordLength).toBe(8);
  });
});
