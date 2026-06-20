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

type FunctionBodyKind = 'block' | 'actions' | 'checks' | 'triggers';

type FunctionDef = {
  name: string;
  params: string[];
  bodyKind: FunctionBodyKind;
};

type StructParamDef = {
  name: string;
  type: string;
};

type InstructionParamDef = {
  name: string;
  type: string;
};

type InstructionDef = {
  scope: Exclude<FunctionBodyKind, 'block'>;
  name: string;
  zh: string;
  params: InstructionParamDef[];
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

const instructionDefs: InstructionDef[] = [
  {
    scope: 'actions',
    name: 'actorAttributes',
    zh: '設定角色屬性',
    params: [
      { name: 'actorId', type: 'string' },
      { name: 'attr', type: 'string' },
      { name: 'value', type: 'int|string' },
    ],
  },
  {
    scope: 'actions',
    name: 'actorDisappear',
    zh: '角色消失',
    params: [
      { name: 'actorId', type: 'string' },
      { name: 'delay', type: 'int|string' },
      { name: 'duration', type: 'int|string' },
    ],
  },
  {
    scope: 'actions',
    name: 'actorFollow',
    zh: '跟隨人物',
    params: [
      { name: 'actorId', type: 'string' },
      { name: 'targetId', type: 'string' },
      { name: 'type', type: 'string' },
    ],
  },
  {
    scope: 'actions',
    name: 'actorRelocate',
    zh: '移動角色位置',
    params: [
      { name: 'actorId', type: 'string' },
      { name: 'keepAbility', type: 'bool' },
      { name: 'x', type: 'int|string' },
      { name: 'y', type: 'int|string' },
    ],
  },
  {
    scope: 'actions',
    name: 'actorSpawnLoc',
    zh: '角色重生位置',
    params: [
      { name: 'actorId', type: 'string' },
      { name: 'x', type: 'int|string' },
      { name: 'y', type: 'int|string' },
    ],
  },
  {
    scope: 'actions',
    name: 'actorTalk',
    zh: '角色說話',
    params: [
      { name: 'actorId', type: 'string' },
      { name: 'cleanTalk', type: 'bool' },
      { name: 'duration', type: 'int|string' },
      { name: 'text', type: 'string' },
      { name: 'wait', type: 'bool' },
    ],
  },
  {
    scope: 'actions',
    name: 'addActor',
    zh: '新增角色',
    params: [
      { name: 'camp', type: 'string' },
      { name: 'externRole', type: 'string' },
      { name: 'hp', type: 'int|string' },
      { name: 'id', type: 'string' },
      { name: 'localVarname', type: 'string' },
      { name: 'movableRange', type: 'int|string' },
      { name: 'name', type: 'string' },
      { name: 'patrol', type: 'list[Point]' },
      { name: 'range', type: 'int|string' },
      { name: 'role', type: 'string' },
      { name: 'rotation', type: 'int|string' },
      { name: 'strength', type: 'int|string' },
      { name: 'teamId', type: 'int|string' },
      { name: 'weapon1', type: 'string' },
      { name: 'weapon2', type: 'string' },
      { name: 'x', type: 'int|string' },
      { name: 'y', type: 'int|string' },
    ],
  },
  {
    scope: 'actions',
    name: 'addDropItem',
    zh: '新增放置可拾取道具',
    params: [
      { name: 'itemCode', type: 'string' },
      { name: 'localVarname', type: 'string' },
      { name: 'range', type: 'int|string' },
      { name: 'scale', type: 'int|string' },
      { name: 'type', type: 'string' },
      { name: 'x', type: 'int|string' },
      { name: 'y', type: 'int|string' },
    ],
  },
  {
    scope: 'actions',
    name: 'addMapObject',
    zh: '新增地圖物件',
    params: [
      { name: 'autoTuneHeight', type: 'bool' },
      { name: 'object', type: 'string' },
      { name: 'range', type: 'int|string' },
      { name: 'walkable', type: 'bool' },
      { name: 'x', type: 'int|string' },
      { name: 'y', type: 'int|string' },
    ],
  },
  {
    scope: 'actions',
    name: 'addMapSign',
    zh: '新增告示牌',
    params: [
      { name: 'buttons', type: 'list[Button]' },
      { name: 'range', type: 'int|string' },
      { name: 'rotation', type: 'int|string' },
      { name: 'showButtons', type: 'bool' },
      { name: 'text', type: 'string' },
      { name: 'x', type: 'int|string' },
      { name: 'y', type: 'int|string' },
    ],
  },
  {
    scope: 'actions',
    name: 'addStuff',
    zh: '新增武器道具',
    params: [
      { name: 'code', type: 'string' },
      { name: 'item', type: 'string' },
      { name: 'range', type: 'int|string' },
      { name: 'refill', type: 'bool' },
      { name: 'refillInterval', type: 'int|string' },
      { name: 'rotation', type: 'int|string' },
      { name: 'x', type: 'int|string' },
      { name: 'y', type: 'int|string' },
    ],
  },
  {
    scope: 'actions',
    name: 'avoidFriendFire',
    zh: '迴避友軍攻擊',
    params: [{ name: 'value', type: 'bool' }],
  },
  {
    scope: 'actions',
    name: 'deltaHp',
    zh: '角色加減血',
    params: [
      { name: 'actorCode', type: 'string' },
      { name: 'casterCode', type: 'string' },
      { name: 'type', type: 'string' },
      { name: 'value', type: 'int|string' },
    ],
  },
  {
    scope: 'actions',
    name: 'enblastEffect',
    zh: '光彈特效',
    params: [
      { name: 'damage', type: 'int|string' },
      { name: 'fromActor', type: 'string' },
      { name: 'fromType', type: 'string' },
      { name: 'scale', type: 'int|string' },
      { name: 'speed', type: 'int|string' },
      { name: 'toAngle', type: 'int|string' },
      { name: 'toType', type: 'string' },
    ],
  },
  {
    scope: 'actions',
    name: 'equipWeapon',
    zh: '人物裝備武器',
    params: [
      { name: 'actorCode', type: 'string' },
      { name: 'hand', type: 'int|string' },
      { name: 'isDefault', type: 'bool' },
      { name: 'type', type: 'string' },
    ],
  },
  {
    scope: 'actions',
    name: 'getCookie',
    zh: '取得Cookies',
    params: [
      { name: 'cookies', type: 'string' },
      { name: 'varName', type: 'string' },
    ],
  },
  {
    scope: 'actions',
    name: 'getUserState',
    zh: '取得玩家狀態',
    params: [
      { name: 'category', type: 'string' },
      { name: 'key', type: 'string' },
      { name: 'playerId', type: 'string' },
      { name: 'varName', type: 'string' },
    ],
  },
  {
    scope: 'actions',
    name: 'mapWarp',
    zh: '設定地圖傳送點',
    params: [
      { name: 'direction', type: 'string' },
      { name: 'fromX', type: 'int|string' },
      { name: 'fromY', type: 'int|string' },
      { name: 'toX', type: 'int|string' },
      { name: 'toY', type: 'int|string' },
    ],
  },
  {
    scope: 'actions',
    name: 'missionComplete',
    zh: '任務完成',
    params: [{ name: 'camp', type: 'string' }],
  },
  {
    scope: 'actions',
    name: 'longBo',
    zh: '龍波',
    params: [{ name: 'actorCode', type: 'string' }],
  },
  {
    scope: 'actions',
    name: 'print',
    zh: '控制台輸出',
    params: [
      { name: 'text', type: 'string' },
      { name: 'type', type: 'string' },
    ],
  },
  {
    scope: 'actions',
    name: 'removeDevice',
    zh: '移除地圖機關',
    params: [
      { name: 'region_h', type: 'int|string' },
      { name: 'region_w', type: 'int|string' },
      { name: 'region_x', type: 'int|string' },
      { name: 'region_y', type: 'int|string' },
    ],
  },
  {
    scope: 'actions',
    name: 'removeMapObject',
    zh: '移除地圖物件',
    params: [
      { name: 'region_h', type: 'int|string' },
      { name: 'region_w', type: 'int|string' },
      { name: 'region_x', type: 'int|string' },
      { name: 'region_y', type: 'int|string' },
    ],
  },
  {
    scope: 'actions',
    name: 'setCookie',
    zh: '儲存Cookies',
    params: [
      { name: 'cookies', type: 'string' },
      { name: 'playerId', type: 'string' },
      { name: 'type', type: 'string' },
      { name: 'value', type: 'string' },
    ],
  },
  {
    scope: 'actions',
    name: 'setGlobal',
    zh: '儲存全域變數',
    params: [
      { name: 'key', type: 'string' },
      { name: 'type', type: 'string' },
      { name: 'value', type: 'int|string' },
    ],
  },
  {
    scope: 'actions',
    name: 'setObjectVar',
    zh: '儲存物件變數',
    params: [
      { name: 'key', type: 'string' },
      { name: 'object', type: 'string' },
      { name: 'type', type: 'string' },
      { name: 'value', type: 'int|string' },
    ],
  },
  {
    scope: 'actions',
    name: 'setUserState',
    zh: '儲存玩家狀態',
    params: [
      { name: 'category', type: 'string' },
      { name: 'key', type: 'string' },
      { name: 'playerId', type: 'string' },
      { name: 'type', type: 'string' },
      { name: 'value', type: 'string' },
    ],
  },
  {
    scope: 'actions',
    name: 'setWeaponAbility',
    zh: '設定武器技能',
    params: [
      { name: 'ability', type: 'string' },
      { name: 'level', type: 'int|string' },
      { name: 'operation', type: 'string' },
      { name: 'weapon', type: 'string' },
    ],
  },
  {
    scope: 'actions',
    name: 'showSelectDialog',
    zh: '彈出選項視窗',
    params: [
      { name: 'actorId', type: 'string' },
      { name: 'message', type: 'string' },
      { name: 'options', type: 'list[Button]' },
    ],
  },
  {
    scope: 'actions',
    name: 'tipOnMap',
    zh: '地圖標示文字',
    params: [
      { name: 'duration', type: 'int|string' },
      { name: 'html', type: 'bool' },
      { name: 'text', type: 'string' },
      { name: 'x', type: 'int|string' },
      { name: 'y', type: 'int|string' },
    ],
  },
  {
    scope: 'actions',
    name: 'wait',
    zh: '等待',
    params: [{ name: 'duration', type: 'int|string' }],
  },
  {
    scope: 'actions',
    name: 'EnhFF::playerMousePosition',
    zh: 'EnhFF::玩家滑鼠座標',
    params: [
      { name: 'actorId', type: 'string' },
      { name: 'varX', type: 'string' },
      { name: 'varY', type: 'string' },
    ],
  },
  {
    scope: 'actions',
    name: 'EnhFF::generalCircularRange',
    zh: 'EnhFF::廣義圓形範圍',
    params: [
      { name: 'actorId', type: 'string' },
      { name: 'color', type: 'string' },
      { name: 'deltaHpCD', type: 'int|string' },
      { name: 'deltaHpCasterCode', type: 'string' },
      { name: 'deltaHpTarget', type: 'ActorMatch' },
      { name: 'deltaHpType', type: 'string' },
      { name: 'deltaHpValue', type: 'int|string' },
      { name: 'duration', type: 'int|string' },
      { name: 'lineWidth', type: 'int|string' },
      { name: 'offsetX', type: 'int|string' },
      { name: 'offsetY', type: 'int|string' },
      { name: 'radius', type: 'int|string' },
      { name: 'x', type: 'int|string' },
      { name: 'y', type: 'int|string' },
    ],
  },
  {
    scope: 'checks',
    name: 'actorCount',
    zh: '計算人數',
    params: [
      { name: 'actor', type: 'ActorMatch' },
      { name: 'op', type: 'string' },
      { name: 'region_h', type: 'int|string' },
      { name: 'region_w', type: 'int|string' },
      { name: 'region_x', type: 'int|string' },
      { name: 'region_y', type: 'int|string' },
      { name: 'value', type: 'int|string' },
      { name: 'varname', type: 'string' },
    ],
  },
  {
    scope: 'checks',
    name: 'actorRegion',
    zh: '角色所在區域',
    params: [
      { name: 'actorId', type: 'string' },
      { name: 'checkAlive', type: 'bool' },
      { name: 'region_h', type: 'int|string' },
      { name: 'region_w', type: 'int|string' },
      { name: 'region_x', type: 'int|string' },
      { name: 'region_y', type: 'int|string' },
    ],
  },
  {
    scope: 'checks',
    name: 'checkNumber',
    zh: '比較數字',
    params: [
      { name: 'lhs', type: 'int|string' },
      { name: 'op', type: 'string' },
      { name: 'rhs', type: 'int|string' },
    ],
  },
  {
    scope: 'checks',
    name: 'checkString',
    zh: '比對字串',
    params: [
      { name: 'matchKind', type: 'string' },
      { name: 'str', type: 'string' },
      { name: 'value', type: 'string' },
    ],
  },
  {
    scope: 'checks',
    name: 'forEachActor',
    zh: '找出所有角色',
    params: [
      { name: 'actor', type: 'ActorMatch' },
      { name: 'varname', type: 'string' },
    ],
  },
  {
    scope: 'triggers',
    name: 'actorAdded',
    zh: '角色進入戰場',
    params: [
      { name: 'actor', type: 'ActorMatch' },
      { name: 'varName', type: 'string' },
    ],
  },
  {
    scope: 'triggers',
    name: 'actorDead',
    zh: '角色死亡',
    params: [
      { name: 'actor', type: 'ActorMatch' },
      { name: 'hitterVarName', type: 'string' },
      { name: 'varName', type: 'string' },
    ],
  },
  {
    scope: 'triggers',
    name: 'actorFire',
    zh: '角色發動攻擊',
    params: [
      { name: 'actor', type: 'ActorMatch' },
      { name: 'varName', type: 'string' },
      { name: 'weapon', type: 'string' },
    ],
  },
  {
    scope: 'triggers',
    name: 'actorHit',
    zh: '角色受傷',
    params: [
      { name: 'actor', type: 'ActorMatch' },
      { name: 'actorVarName', type: 'string' },
      { name: 'damageValueVarName', type: 'string' },
      { name: 'hitter', type: 'ActorMatch' },
      { name: 'hitterVarName', type: 'string' },
      { name: 'weapon', type: 'string' },
    ],
  },
  {
    scope: 'triggers',
    name: 'clickButton',
    zh: '告示牌按鈕',
    params: [
      { name: 'actor', type: 'ActorMatch' },
      { name: 'buttonId', type: 'string' },
      { name: 'varName', type: 'string' },
    ],
  },
  {
    scope: 'triggers',
    name: 'dialogConfirm',
    zh: '視窗確認',
    params: [
      { name: 'buttonName', type: 'string' },
      { name: 'playerLocalId', type: 'string' },
    ],
  },
  {
    scope: 'triggers',
    name: 'keyboardPressed',
    zh: '鍵盤按鍵',
    params: [
      { name: 'actorId', type: 'string' },
      { name: 'key', type: 'string' },
      { name: 'timing', type: 'string' },
      { name: 'varName', type: 'string' },
    ],
  },
  {
    scope: 'triggers',
    name: 'itemPickup',
    zh: '拾取武器道具',
    params: [
      { name: 'actor', type: 'ActorMatch' },
      { name: 'actorVarname', type: 'string' },
      { name: 'itemMatchCode', type: 'string' },
      { name: 'itemVarname', type: 'string' },
      { name: 'matchKind', type: 'string' },
    ],
  },
  {
    scope: 'triggers',
    name: 'mouseEvent',
    zh: '滑鼠點擊',
    params: [
      { name: 'XVarName', type: 'string' },
      { name: 'YVarName', type: 'string' },
      { name: 'actorId', type: 'string' },
      { name: 'actorVarName', type: 'string' },
    ],
  },
  {
    scope: 'triggers',
    name: 'releasePower',
    zh: '發動技能',
    params: [
      { name: 'ability', type: 'string' },
      { name: 'actor', type: 'ActorMatch' },
      { name: 'manaUsage', type: 'int|string' },
      { name: 'preventDefault', type: 'bool' },
      { name: 'varName', type: 'string' },
      { name: 'weapon', type: 'string' },
    ],
  },
];

const instructionByScope = new Map<Exclude<FunctionBodyKind, 'block'>, InstructionDef[]>([
  ['actions', instructionDefs.filter((item) => item.scope === 'actions')],
  ['checks', instructionDefs.filter((item) => item.scope === 'checks')],
  ['triggers', instructionDefs.filter((item) => item.scope === 'triggers')],
]);

const instructionByScopeAndName = new Map<string, InstructionDef>(
  instructionDefs.map((item) => [`${item.scope}::${item.name}`, item])
);

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
    label: 'snippet:def checks',
    kind: CompletionItemKind.Snippet,
    detail: 'Create a checks function definition',
    insertTextFormat: InsertTextFormat.Snippet,
    insertText: 'def ${1:name}(${2:params}): checks {\n\t$0\n}',
    documentation: 'Checks function definition snippet.',
  },
  {
    label: 'snippet:def triggers',
    kind: CompletionItemKind.Snippet,
    detail: 'Create a triggers function definition',
    insertTextFormat: InsertTextFormat.Snippet,
    insertText: 'def ${1:name}(${2:params}): triggers {\n\t$0\n}',
    documentation: 'Triggers function definition snippet.',
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
        triggerCharacters: ['(', ',', ';', '{'],
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

  const functionDefs = parseFunctionDefs(document.getText());

  const line = document.getText({
    start: { line: params.position.line, character: 0 },
    end: params.position,
  });
  const textBeforeCursor = document.getText({
    start: { line: 0, character: 0 },
    end: params.position,
  });
  const instructionScope = getInstructionScope(textBeforeCursor);

  const blockAssignmentCompletions = getBlockAssignmentCompletions(line, functionDefs);
  if (blockAssignmentCompletions.length > 0) {
    return [...blockAssignmentCompletions, ...baseCompletions];
  }

  const callContext = getFunctionCallContext(line);
  if (callContext) {
    if (instructionScope) {
      const instructionParamCompletions = getInstructionParamCompletions(callContext, instructionScope);
      if (instructionParamCompletions.length > 0) {
        return [...instructionParamCompletions, ...baseCompletions];
      }
    }

    const functionParamCompletions = getUserFunctionParamCompletions(callContext, functionDefs);
    if (functionParamCompletions.length > 0) {
      return [...functionParamCompletions, ...baseCompletions];
    }

    const builtinParamCompletions = getBuiltinStructParamCompletions(callContext);
    if (builtinParamCompletions.length > 0) {
      return [...builtinParamCompletions, ...baseCompletions];
    }
  }

  if (instructionScope) {
    const instructionCompletions = getInstructionNameCompletions(instructionScope);
    const hasTypedInstructionPrefix = /[A-Za-z_\u0080-\uFFFF:][\w:\u0080-\uFFFF]*$/.test(line);
    if (hasTypedInstructionPrefix || shouldOfferInstructionListAtCursor(textBeforeCursor, line)) {
      return [...instructionCompletions, ...baseCompletions];
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

  const functionDefs = parseFunctionDefs(document.getText());
  const line = document.getText({
    start: { line: params.position.line, character: 0 },
    end: params.position,
  });
  const textBeforeCursor = document.getText({
    start: { line: 0, character: 0 },
    end: params.position,
  });
  const instructionScope = getInstructionScope(textBeforeCursor);

  const callContext = getBlockAssignmentCallContext(line);
  if (callContext) {
    const fn = functionDefs.find((item) => item.name === callContext.name && item.bodyKind === 'block');
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

  if (instructionScope) {
    const instruction = instructionByScopeAndName.get(`${instructionScope}::${genericCall.name}`);
    if (instruction) {
      const parameters = instruction.params.map((param) =>
        ParameterInformation.create(`${param.name}: ${param.type}`)
      );
      const signatureLabel = `${instruction.name}(${instruction.params
        .map((param) => `${param.name}: ${param.type}`)
        .join(', ')})`;
      const signature = SignatureInformation.create(
        signatureLabel,
        `${instruction.scope} instruction: ${instruction.zh}`,
        ...parameters
      );

      return {
        signatures: [signature],
        activeSignature: 0,
        activeParameter: Math.min(
          genericCall.activeParameter,
          Math.max(0, instruction.params.length - 1)
        ),
      };
    }
  }

  const userFunction = functionDefs.find((item) => item.name === genericCall.name);
  if (userFunction) {
    const parameters = userFunction.params.map((param) => ParameterInformation.create(param));
    const signatureLabel = `${userFunction.name}(${userFunction.params.join(', ')})`;
    const signature = SignatureInformation.create(
      signatureLabel,
      `User-defined TWGE ${userFunction.bodyKind} function.`,
      ...parameters
    );

    return {
      signatures: [signature],
      activeSignature: 0,
      activeParameter: Math.min(
        genericCall.activeParameter,
        Math.max(0, userFunction.params.length - 1)
      ),
    };
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

function parseFunctionDefs(text: string): FunctionDef[] {
  const output: FunctionDef[] = [];
  const seen = new Set<string>();
  const defRegex = /^\s*def\s+([^\s(]+)\s*\(([^)]*)\)\s*:\s*(block|actions|checks|triggers)\b/gm;

  let match: RegExpExecArray | null = defRegex.exec(text);
  while (match) {
    const name = match[1].trim();
    const paramsRaw = match[2].trim();
    const bodyKind = match[3].trim() as FunctionBodyKind;
    const params = paramsRaw.length === 0
      ? []
      : paramsRaw.split(',').map((item) => item.trim()).filter((item) => item.length > 0);

    if (!seen.has(name)) {
      output.push({ name, params, bodyKind });
      seen.add(name);
    }

    match = defRegex.exec(text);
  }

  return output;
}

function getBlockAssignmentCompletions(linePrefix: string, defs: FunctionDef[]): CompletionItem[] {
  const match = linePrefix.match(/^\s*block\s+[^\s=]+\s*=\s*([^\n]*)$/);
  if (!match) {
    return [];
  }

  const rhs = match[1];
  const typedPrefixMatch = rhs.match(/([^\s(,]*)$/);
  const typedPrefix = typedPrefixMatch ? typedPrefixMatch[1] : '';

  return defs
    .filter((item) => item.bodyKind === 'block')
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

function getUserFunctionParamCompletions(
  callContext: { name: string; activeParameter: number; argsText: string },
  defs: FunctionDef[]
): CompletionItem[] {
  const def = defs.find((item) => item.name === callContext.name);
  if (!def) {
    return [];
  }

  return def.params
    .filter((_param, index) => index >= callContext.activeParameter)
    .map((param, idx) => {
      const isLast = callContext.activeParameter + idx >= def.params.length - 1;
      return {
        label: param,
        kind: CompletionItemKind.Variable,
        detail: `${param} (parameter)`,
        documentation: `Parameter for ${def.name} (${def.bodyKind}).`,
        insertText: `\${1:${escapeSnippetValue(param)}}${isLast ? '' : ', '}`,
        insertTextFormat: InsertTextFormat.Snippet,
      };
    });
}

function getInstructionNameCompletions(
  scope: Exclude<FunctionBodyKind, 'block'>
): CompletionItem[] {
  const defs = instructionByScope.get(scope) ?? [];
  return defs.map((item) => {
    const argsSnippet = item.params
      .map(
        (param, index) => `${param.name} = \${${index + 1}:${defaultValueForType(param.type)}}`
      )
      .join(', ');

    return {
      label: item.name,
      kind: CompletionItemKind.Function,
      detail: `${scope} instruction | ${item.zh}`,
      documentation: `${item.name}(${item.params
        .map((param) => `${param.name}: ${param.type}`)
        .join(', ')})`,
      filterText: `${item.name} ${item.zh}`,
      insertText: `${item.name}(${argsSnippet});`,
      insertTextFormat: InsertTextFormat.Snippet,
    };
  });
}

function getInstructionParamCompletions(
  callContext: { name: string; activeParameter: number; argsText: string },
  scope: Exclude<FunctionBodyKind, 'block'>
): CompletionItem[] {
  const instruction = instructionByScopeAndName.get(`${scope}::${callContext.name}`);
  if (!instruction) {
    return [];
  }

  const hasNamedArg = /\b[A-Za-z_\u0080-\uFFFF][\w\u0080-\uFFFF]*\s*=/.test(callContext.argsText);
  if (!hasNamedArg) {
    return instruction.params
      .filter((_param, index) => index >= callContext.activeParameter)
      .map((param, idx) => {
        const isLast = callContext.activeParameter + idx >= instruction.params.length - 1;
        return {
          label: param.name,
          kind: CompletionItemKind.Field,
          detail: `${param.name}: ${param.type}`,
          documentation: `${instruction.name} parameter | ${instruction.zh}`,
          insertText: `${param.name} = \${1:${defaultValueForType(param.type)}}${isLast ? '' : ', '}`,
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

  return instruction.params
    .filter((param) => !usedNames.has(param.name))
    .filter((param) => typedPrefix.length === 0 || param.name.startsWith(typedPrefix))
    .map((param) => ({
      label: param.name,
      kind: CompletionItemKind.Field,
      detail: `${param.name}: ${param.type}`,
      documentation: `${instruction.name} parameter | ${instruction.zh}`,
      insertText: `${param.name} = \${1:${defaultValueForType(param.type)}}`,
      insertTextFormat: InsertTextFormat.Snippet,
    }));
}

function getInstructionScope(textBeforeCursor: string): Exclude<FunctionBodyKind, 'block'> | null {
  const stack: FunctionBodyKind[] = [];
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < textBeforeCursor.length; i++) {
    const c = textBeforeCursor[i];
    const n = i + 1 < textBeforeCursor.length ? textBeforeCursor[i + 1] : '';

    if (inLineComment) {
      if (c === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (c === '*' && n === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (!inString && c === '/' && n === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (!inString && c === '/' && n === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }

    if (c === '"') {
      const prev = i > 0 ? textBeforeCursor[i - 1] : '';
      if (prev !== '\\') {
        inString = !inString;
      }
      continue;
    }

    if (inString) {
      continue;
    }

    if (c === '{') {
      const prefix = textBeforeCursor.slice(0, i);
      const kindMatch = prefix.match(/:\s*(block|actions|checks|triggers)\s*$/);
      if (kindMatch) {
        stack.push(kindMatch[1] as FunctionBodyKind);
      } else {
        stack.push('block');
      }
      continue;
    }

    if (c === '}') {
      if (stack.length > 0) {
        stack.pop();
      }
    }
  }

  for (let i = stack.length - 1; i >= 0; i--) {
    const kind = stack[i];
    if (kind === 'actions' || kind === 'checks' || kind === 'triggers') {
      return kind;
    }
  }

  return null;
}

function shouldOfferInstructionListAtCursor(textBeforeCursor: string, linePrefix: string): boolean {
  if (linePrefix.trim().length > 0) {
    return false;
  }

  const beforeCurrentLine = textBeforeCursor.slice(0, textBeforeCursor.length - linePrefix.length);
  let i = beforeCurrentLine.length - 1;
  while (i >= 0 && /\s/.test(beforeCurrentLine[i])) {
    i -= 1;
  }

  if (i < 0) {
    return false;
  }

  const prevChar = beforeCurrentLine[i];
  return prevChar === '{' || prevChar === ';';
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
  if (type.includes('string')) {
    return '""';
  }

  if (type === 'bool') {
    return 'false';
  }

  if (type.startsWith('list[')) {
    return '[]';
  }

  if (type === 'Point') {
    return 'Point(0, 0)';
  }

  if (type === 'ActorMatch') {
    return 'ActorMatch(controller = "", id = "", matchKind = "", group = 0)';
  }

  if (type === 'Button') {
    return 'Button(id = "", label = "")';
  }

  if (type === 'CustomWeapon') {
    return 'CustomWeapon(reference = "", code = "")';
  }

  return '0';
}

function escapeSnippetValue(value: string): string {
  return value.replace(/[$}\\]/g, '\\$&');
}

documents.listen(connection);
connection.listen();
