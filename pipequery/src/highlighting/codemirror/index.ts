import { StreamLanguage, LanguageSupport } from '@codemirror/language';
import { pipeQueryStreamParser } from './language.ts';
import { pipeQueryHighlightExtension, pipeQueryHighlightStyle } from './highlight.ts';

/**
 * CodeMirror 6 language support for PipeQuery.
 *
 * Usage:
 * ```ts
 * import { pipeQuery } from './highlighting/codemirror';
 * const editor = new EditorView({
 *   extensions: [pipeQuery()],
 * });
 * ```
 */
export function pipeQuery(): LanguageSupport {
  const lang = StreamLanguage.define(pipeQueryStreamParser);
  return new LanguageSupport(lang, [pipeQueryHighlightExtension]);
}

export { pipeQueryHighlightStyle, pipeQueryHighlightExtension };
