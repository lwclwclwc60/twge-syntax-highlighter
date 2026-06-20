import {
  CompletionItem,
  CompletionItemKind,
  Diagnostic,
  DiagnosticSeverity,
  Hover,
  InsertTextFormat,
  createConnection,
  InitializeParams,
  InitializeResult,
  MarkupKind,
  Position,
  ProposedFeatures,
  Range,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

type KeywordDoc = {
  label: string;
  detail: string;
  docs: string;
};

const keywordDocs: KeywordDoc[] = [
  { label: 'block', detail: 'TWGE block declaration', docs: 'Declare a game event block.' },
  { label: 'actions', detail: 'TWGE action body type', docs: 'Function body type for action statements.' },
  { label: 'triggers', detail: 'TWGE trigger body type', docs: 'Function body type for trigger statements.' },
  { label: 'checks', detail: 'TWGE check body type', docs: 'Function body type for check statements.' },
  { label: 'def', detail: 'TWGE function definition', docs: 'Define reusable TWGE functions.' },
  { label: 'const', detail: 'TWGE const definition', docs: 'Declare compile-time constants.' },
  { label: 'if', detail: 'Conditional expression', docs: 'Conditional statement.' },
  { label: 'else', detail: 'Conditional branch', docs: 'Fallback branch for if.' },
  { label: 'for', detail: 'Loop statement', docs: 'Iterate over a range/list with in.' },
  { label: 'in', detail: 'Loop keyword', docs: 'Used in for loops.' },
  { label: 'true', detail: 'Boolean literal', docs: 'Boolean true.' },
  { label: 'false', detail: 'Boolean literal', docs: 'Boolean false.' },
  { label: 'Point', detail: 'Builtin struct', docs: 'Builtin Point value type.' },
  { label: 'ActorMatch', detail: 'Builtin struct', docs: 'Builtin ActorMatch value type.' },
  { label: 'Button', detail: 'Builtin struct', docs: 'Builtin Button value type.' },
  { label: 'CustomWeapon', detail: 'Builtin struct', docs: 'Builtin CustomWeapon value type.' },
  { label: 'twge::to_string', detail: 'Intrinsic function', docs: 'Convert value to string.' },
  { label: 'twge::to_int', detail: 'Intrinsic function', docs: 'Convert value to int.' },
  { label: 'twge::to_bool', detail: 'Intrinsic function', docs: 'Convert value to bool.' },
  { label: 'twge::get_index', detail: 'Intrinsic function', docs: 'Read indexed item from list/string.' },
  { label: 'twge::get_length', detail: 'Intrinsic function', docs: 'Get collection length.' },
  { label: 'twge::get_slice', detail: 'Intrinsic function', docs: 'Slice collection by range.' },
  { label: 'twge::assert', detail: 'Intrinsic function', docs: 'Assertion for development-time checks.' },
];

const keywordDocMap = new Map(keywordDocs.map((k) => [k.label, k]));

const baseCompletions: CompletionItem[] = keywordDocs.map((item) => ({
  label: item.label,
  kind: CompletionItemKind.Keyword,
  detail: item.detail,
  documentation: item.docs,
}));

const snippetCompletions: CompletionItem[] = [
  {
    label: 'snippet:block',
    kind: CompletionItemKind.Snippet,
    detail: 'Create a block declaration',
    insertTextFormat: InsertTextFormat.Snippet,
    insertText: 'block ${1:blockName} = ${2:funName}(${3:args});',
    documentation: 'Block declaration snippet.',
  },
  {
    label: 'snippet:def block',
    kind: CompletionItemKind.Snippet,
    detail: 'Create a block function definition',
    insertTextFormat: InsertTextFormat.Snippet,
    insertText: 'def ${1:name}(${2:params}): block {\n\t$0\n}',
    documentation: 'Block function definition snippet.',
  },
  {
    label: 'snippet:def actions',
    kind: CompletionItemKind.Snippet,
    detail: 'Create an actions function definition',
    insertTextFormat: InsertTextFormat.Snippet,
    insertText: 'def ${1:name}(${2:params}): actions {\n\t$0\n}',
    documentation: 'Actions function definition snippet.',
  },
  {
    label: 'snippet:const',
    kind: CompletionItemKind.Snippet,
    detail: 'Create a const declaration',
    insertTextFormat: InsertTextFormat.Snippet,
    insertText: 'const ${1:key} = ${2:value};',
    documentation: 'Const declaration snippet.',
  },
  {
    label: 'snippet:metadata',
    kind: CompletionItemKind.Snippet,
    detail: 'Create metadata assignment',
    insertTextFormat: InsertTextFormat.Snippet,
    insertText: '__${1:key}__ = ${2:value};',
    documentation: 'Metadata declaration snippet.',
  },
];

connection.onInitialize((_params: InitializeParams): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
      },
      hoverProvider: true,
    },
  };
});

connection.onHover((params): Hover | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const wordRange = getWordRange(document, params.position);
  if (!wordRange) {
    return null;
  }

  const word = document.getText(wordRange);
  const doc = keywordDocMap.get(word);
  if (!doc) {
    return null;
  }

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: `**${doc.label}**\n\n${doc.docs}`,
    },
    range: wordRange,
  };
});

connection.onCompletion((params): CompletionItem[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [...baseCompletions, ...snippetCompletions];
  }

  const line = document.getText({
    start: { line: params.position.line, character: 0 },
    end: params.position,
  });
  const isTopLevel = /^\s*$/.test(line) || /^\s*(def|const|block|__)/.test(line);
  if (isTopLevel) {
    return [...snippetCompletions, ...baseCompletions];
  }

  return [...baseCompletions, ...snippetCompletions];
});

documents.onDidOpen((event) => {
  validateTextDocument(event.document);
});

documents.onDidChangeContent((event) => {
  validateTextDocument(event.document);
});

documents.onDidClose((event) => {
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

function validateTextDocument(document: TextDocument): void {
  const diagnostics: Diagnostic[] = [];
  const text = document.getText();
  const lines = text.split(/\r?\n/);
  const opening: Record<string, string> = { '{': '}', '(': ')', '[': ']' };
  const closing: Record<string, string> = { '}': '{', ')': '(', ']': '[' };
  const stack: Array<{ char: string; line: number; character: number }> = [];

  let inBlockComment = false;
  let inString = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    let i = 0;

    while (i < line.length) {
      const c = line[i];
      const n = i + 1 < line.length ? line[i + 1] : '';

      if (inBlockComment) {
        if (c === '*' && n === '/') {
          inBlockComment = false;
          i += 2;
          continue;
        }
        i += 1;
        continue;
      }

      if (!inString && c === '/' && n === '/') {
        break;
      }

      if (!inString && c === '/' && n === '*') {
        inBlockComment = true;
        i += 2;
        continue;
      }

      if (c === '"') {
        const escaped = i > 0 && line[i - 1] === '\\';
        if (!escaped) {
          inString = !inString;
        }
      }

      if (!inString) {
        if (c in opening) {
          stack.push({ char: c, line: lineIndex, character: i });
        } else if (c in closing) {
          const expected = closing[c];
          const top = stack[stack.length - 1];
          if (!top || top.char !== expected) {
            diagnostics.push({
              severity: DiagnosticSeverity.Error,
              range: {
                start: { line: lineIndex, character: i },
                end: { line: lineIndex, character: i + 1 },
              },
              message: `Unexpected '${c}', expected matching '${expected}'.`,
              source: 'twge-lsp',
            });
          } else {
            stack.pop();
          }
        }
      }

      i += 1;
    }

    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('//') || inBlockComment) {
      continue;
    }

    const isMetadata = /^__[^\s]+__\s*=/.test(trimmed);
    const isConst = /^const\s+/.test(trimmed);
    const isAssignment = /^[A-Za-z_\u0080-\uFFFF][\w\u0080-\uFFFF.:]*\s*=/.test(trimmed);
    const needsSemicolon = (isMetadata || isConst || isAssignment) && !trimmed.endsWith(';');

    if (needsSemicolon) {
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: { line: lineIndex, character: 0 },
          end: { line: lineIndex, character: line.length },
        },
        message: 'This statement likely needs a trailing semicolon (;).',
        source: 'twge-lsp',
      });
    }
  }

  for (const unclosed of stack) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: unclosed.line, character: unclosed.character },
        end: { line: unclosed.line, character: unclosed.character + 1 },
      },
      message: `Unclosed '${unclosed.char}'.`,
      source: 'twge-lsp',
    });
  }

  if (inString) {
    const lastLine = Math.max(0, lines.length - 1);
    const lastChar = lines[lastLine]?.length ?? 0;
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: lastLine, character: Math.max(0, lastChar - 1) },
        end: { line: lastLine, character: lastChar },
      },
      message: 'Unclosed string literal.',
      source: 'twge-lsp',
    });
  }

  connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

function getWordRange(document: TextDocument, position: Position): Range | null {
  const line = document.getText({
    start: { line: position.line, character: 0 },
    end: { line: position.line + 1, character: 0 },
  });

  if (line.length === 0) {
    return null;
  }

  let start = Math.min(position.character, line.length);
  let end = Math.min(position.character, line.length);

  while (start > 0 && /[A-Za-z0-9_:\u0080-\uFFFF]/.test(line[start - 1])) {
    start -= 1;
  }
  while (end < line.length && /[A-Za-z0-9_:\u0080-\uFFFF]/.test(line[end])) {
    end += 1;
  }

  if (start === end) {
    return null;
  }

  return {
    start: { line: position.line, character: start },
    end: { line: position.line, character: end },
  };
}

documents.listen(connection);
connection.listen();
