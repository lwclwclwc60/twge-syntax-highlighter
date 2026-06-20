import {
  CompletionItem,
  CompletionItemKind,
  Diagnostic,
  DiagnosticSeverity,
  Hover,
  InsertTextFormat,
  ParameterInformation,
  createConnection,
  InitializeParams,
  InitializeResult,
  MarkupKind,
  Position,
  ProposedFeatures,
  Range,
  SignatureHelp,
  SignatureInformation,
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

type BlockFunctionDef = {
  name: string;
  params: string[];
};

type StructParamDef = {
  name: string;
  type: string;
};

type BuiltinStructDef = {
  name: string;
  supportsNamedArgs: boolean;
  params: StructParamDef[];
};

const builtinStructDefs: BuiltinStructDef[] = [
  {
    name: 'Point',
    supportsNamedArgs: false,
    params: [
      { name: 'x', type: 'int' },
      { name: 'y', type: 'int' },
    ],
  },
  {
    name: 'ActorMatch',
    supportsNamedArgs: true,
    params: [
      { name: 'controller', type: 'string' },
      { name: 'id', type: 'string' },
      { name: 'matchKind', type: 'string' },
      { name: 'group', type: 'int' },
    ],
  },
  {
    name: 'Button',
    supportsNamedArgs: true,
    params: [
      { name: 'id', type: 'string' },
      { name: 'label', type: 'string' },
    ],
  },
  {
    name: 'CustomWeapon',
    supportsNamedArgs: true,
    params: [
      { name: 'reference', type: 'string' },
      { name: 'code', type: 'string' },
      { name: 'scaleOnGround', type: 'int' },
      { name: 'scaleOnIcon', type: 'int' },
      { name: 'weight', type: 'int' },
      { name: 'damage', type: 'int' },
      { name: 'swapTime', type: 'int' },
      { name: 'fireTime', type: 'int' },
      { name: 'fireType', type: 'int' },
      { name: 'pivotOnHandX', type: 'int' },
      { name: 'pivotOnHandXScale', type: 'int' },
      { name: 'pivotOnHandY', type: 'int' },
      { name: 'pivotOnHandYScale', type: 'int' },
      { name: 'pivotOnHandDegree', type: 'int' },
      { name: 'pivotOnIconX', type: 'int' },
      { name: 'pivotOnIconXScale', type: 'int' },
      { name: 'pivotOnIconY', type: 'int' },
      { name: 'pivotOnIconYScale', type: 'int' },
      { name: 'pivotOnIconDegree', type: 'int' },
    ],
  },
];

const builtinStructMap = new Map(builtinStructDefs.map((item) => [item.name, item]));

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
        triggerCharacters: ['(', ','],
        resolveProvider: false,
      },
      signatureHelpProvider: {
        triggerCharacters: ['(', ','],
        retriggerCharacters: [','],
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

  const functionDefs = parseBlockFunctionDefs(document.getText());

  const line = document.getText({
    start: { line: params.position.line, character: 0 },
    end: params.position,
  });
  const blockAssignmentCompletions = getBlockAssignmentCompletions(line, functionDefs);
  if (blockAssignmentCompletions.length > 0) {
    return [...blockAssignmentCompletions, ...baseCompletions];
  }

  const callContext = getFunctionCallContext(line);
  if (callContext) {
    const builtinParamCompletions = getBuiltinStructParamCompletions(callContext);
    if (builtinParamCompletions.length > 0) {
      return [...builtinParamCompletions, ...baseCompletions];
    }
  }

  const isTopLevel = /^\s*$/.test(line) || /^\s*(def|const|block|__)/.test(line);
  if (isTopLevel) {
    return [...snippetCompletions, ...baseCompletions];
  }

  return [...baseCompletions, ...snippetCompletions];
});

connection.onSignatureHelp((params): SignatureHelp | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const functionDefs = parseBlockFunctionDefs(document.getText());
  const line = document.getText({
    start: { line: params.position.line, character: 0 },
    end: params.position,
  });

  const callContext = getBlockAssignmentCallContext(line);
  if (callContext) {
    const fn = functionDefs.find((item) => item.name === callContext.name);
    if (fn) {
      const parameters = fn.params.map((param) => ParameterInformation.create(param));
      const signatureLabel = `${fn.name}(${fn.params.join(', ')})`;
      const signature = SignatureInformation.create(signatureLabel, 'User-defined TWGE block function.', ...parameters);

      return {
        signatures: [signature],
        activeSignature: 0,
        activeParameter: Math.min(callContext.activeParameter, Math.max(0, fn.params.length - 1)),
      };
    }
  }

  const genericCall = getFunctionCallContext(line);
  if (!genericCall) {
    return null;
  }

  const builtinStruct = builtinStructMap.get(genericCall.name);
  if (!builtinStruct) {
    return null;
  }

  const parameters = builtinStruct.params.map((param) =>
    ParameterInformation.create(`${param.name}: ${param.type}`)
  );
  const signatureLabel = `${builtinStruct.name}(${builtinStruct.params
    .map((param) => `${param.name}: ${param.type}`)
    .join(', ')})`;
  const signature = SignatureInformation.create(
    signatureLabel,
    'Builtin struct constructor.',
    ...parameters
  );

  return {
    signatures: [signature],
    activeSignature: 0,
    activeParameter: Math.min(
      genericCall.activeParameter,
      Math.max(0, builtinStruct.params.length - 1)
    ),
  };
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

function parseBlockFunctionDefs(text: string): BlockFunctionDef[] {
  const output: BlockFunctionDef[] = [];
  const seen = new Set<string>();
  const defRegex = /^\s*def\s+([^\s(]+)\s*\(([^)]*)\)\s*:\s*block\b/gm;

  let match: RegExpExecArray | null = defRegex.exec(text);
  while (match) {
    const name = match[1].trim();
    const paramsRaw = match[2].trim();
    const params = paramsRaw.length === 0
      ? []
      : paramsRaw.split(',').map((item) => item.trim()).filter((item) => item.length > 0);

    if (!seen.has(name)) {
      output.push({ name, params });
      seen.add(name);
    }

    match = defRegex.exec(text);
  }

  return output;
}

function getBlockAssignmentCompletions(linePrefix: string, defs: BlockFunctionDef[]): CompletionItem[] {
  const match = linePrefix.match(/^\s*block\s+[^\s=]+\s*=\s*([^\n]*)$/);
  if (!match) {
    return [];
  }

  const rhs = match[1];
  const typedPrefixMatch = rhs.match(/([^\s(,]*)$/);
  const typedPrefix = typedPrefixMatch ? typedPrefixMatch[1] : '';

  return defs
    .filter((item) => typedPrefix.length === 0 || item.name.startsWith(typedPrefix))
    .map((item) => {
      const argsSnippet = item.params
        .map((param, index) => `\${${index + 1}:${escapeSnippetValue(param)}}`)
        .join(', ');
      const insertText = `${item.name}(${argsSnippet})`;

      return {
        label: item.name,
        kind: CompletionItemKind.Function,
        detail: `def ${item.name}(${item.params.join(', ')}) : block`,
        documentation: 'User-defined TWGE block function.',
        insertText,
        insertTextFormat: InsertTextFormat.Snippet,
      };
    });
}

function getBlockAssignmentCallContext(
  linePrefix: string
): { name: string; activeParameter: number } | null {
  const match = linePrefix.match(/^\s*block\s+[^\s=]+\s*=\s*([^\s(]+)\s*\(([^)]*)$/);
  if (!match) {
    return null;
  }

  const name = match[1].trim();
  const argsPart = match[2];
  const activeParameter = argsPart.trim().length === 0
    ? 0
    : argsPart.split(',').length - 1;

  return {
    name,
    activeParameter,
  };
}

function getFunctionCallContext(
  linePrefix: string
): { name: string; activeParameter: number; argsText: string } | null {
  let depth = 0;
  let openParenIndex = -1;

  for (let i = linePrefix.length - 1; i >= 0; i--) {
    const c = linePrefix[i];
    if (c === ')') {
      depth += 1;
      continue;
    }
    if (c === '(') {
      if (depth === 0) {
        openParenIndex = i;
        break;
      }
      depth -= 1;
    }
  }

  if (openParenIndex < 0) {
    return null;
  }

  let end = openParenIndex - 1;
  while (end >= 0 && /\s/.test(linePrefix[end])) {
    end -= 1;
  }
  if (end < 0) {
    return null;
  }

  let start = end;
  while (start >= 0 && /[A-Za-z0-9_:\u0080-\uFFFF]/.test(linePrefix[start])) {
    start -= 1;
  }

  const name = linePrefix.slice(start + 1, end + 1).trim();
  if (name.length === 0) {
    return null;
  }

  const argsText = linePrefix.slice(openParenIndex + 1);
  return {
    name,
    activeParameter: getActiveParameterIndex(argsText),
    argsText,
  };
}

function getBuiltinStructParamCompletions(callContext: {
  name: string;
  activeParameter: number;
  argsText: string;
}): CompletionItem[] {
  const structDef = builtinStructMap.get(callContext.name);
  if (!structDef) {
    return [];
  }

  if (!structDef.supportsNamedArgs) {
    return structDef.params
      .filter((_param, index) => index >= callContext.activeParameter)
      .map((param, idx) => {
        const isLast = callContext.activeParameter + idx >= structDef.params.length - 1;
        return {
          label: param.name,
          kind: CompletionItemKind.Variable,
          detail: `${param.name}: ${param.type} (positional)`,
          documentation: `${structDef.name} positional parameter`,
          insertText: `\${1:${defaultValueForType(param.type)}}${isLast ? '' : ', '}`,
          insertTextFormat: InsertTextFormat.Snippet,
        };
      });
  }

  const usedNames = new Set<string>();
  const namedArgRegex = /\b([A-Za-z_\u0080-\uFFFF][\w\u0080-\uFFFF]*)\s*=/g;
  let namedMatch: RegExpExecArray | null = namedArgRegex.exec(callContext.argsText);
  while (namedMatch) {
    usedNames.add(namedMatch[1]);
    namedMatch = namedArgRegex.exec(callContext.argsText);
  }

  const typedPrefixMatch = callContext.argsText.match(/([A-Za-z_\u0080-\uFFFF][\w\u0080-\uFFFF]*)?$/);
  const typedPrefix = typedPrefixMatch?.[1] ?? '';

  return structDef.params
    .filter((param) => !usedNames.has(param.name))
    .filter((param) => typedPrefix.length === 0 || param.name.startsWith(typedPrefix))
    .map((param) => ({
      label: param.name,
      kind: CompletionItemKind.Field,
      detail: `${param.name}: ${param.type}`,
      documentation: `${structDef.name} field`,
      insertText: `${param.name} = \${1:${defaultValueForType(param.type)}}`,
      insertTextFormat: InsertTextFormat.Snippet,
    }));
}

function getActiveParameterIndex(argsText: string): number {
  let roundDepth = 0;
  let squareDepth = 0;
  let curlyDepth = 0;
  let inString = false;
  let commas = 0;

  for (let i = 0; i < argsText.length; i++) {
    const c = argsText[i];
    const prev = i > 0 ? argsText[i - 1] : '';

    if (c === '"' && prev !== '\\') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }

    if (c === '(') {
      roundDepth += 1;
    } else if (c === ')') {
      if (roundDepth > 0) {
        roundDepth -= 1;
      }
    } else if (c === '[') {
      squareDepth += 1;
    } else if (c === ']') {
      if (squareDepth > 0) {
        squareDepth -= 1;
      }
    } else if (c === '{') {
      curlyDepth += 1;
    } else if (c === '}') {
      if (curlyDepth > 0) {
        curlyDepth -= 1;
      }
    } else if (c === ',' && roundDepth === 0 && squareDepth === 0 && curlyDepth === 0) {
      commas += 1;
    }
  }

  const hasNonWhitespace = argsText.trim().length > 0;
  return hasNonWhitespace ? commas : 0;
}

function defaultValueForType(type: string): string {
  if (type === 'string') {
    return '""';
  }
  return '0';
}

function escapeSnippetValue(value: string): string {
  return value.replace(/[$}\\]/g, '\\$&');
}

documents.listen(connection);
connection.listen();
