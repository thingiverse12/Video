// Statisk vakt för bildruteloopen: funktionerna som körs varje simuleringssteg
// får inte skapa nya objekt – inga new/clone/literaler/closures/spridningar och
// inga list- eller strängmetoder som allokerar. Testet läser källkoden med
// TypeScript-kompilatorn och misslyckas med fil, rad och uttryck när någon lägger
// till en allokering. Behövs en allokering ändå (t.ex. bara när något händer) märks
// raden med kommentaren "tillåten allokering" och en motivering.
//
// Körtidsmätningen finns i scripts/perf-smoke-test.mjs; den här filen är den
// exakta vakten, eftersom JIT-tillståndet gör körtidsmätningar brusiga.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const ALLOWED_MARKER = /tillåten allokering/;

/** Funktioner som körs varje steg (eller varje bildruta), per fil. */
const HOT_FUNCTIONS = {
  'src/game/engine.ts': [
    'tick', 'simulate', 'updateEnvironment', 'updatePlayer', 'updateActor', 'updateShop', 'updateBailiffs',
    'updateProgress', 'updateCamera', 'updateStairTravel', 'updateAim', 'move', 'collides', 'walkableHeight',
  ],
  'src/game/rules.ts': ['advanceProgress', 'shopRiskStep', 'clerkNotices', 'canUseRifle', 'distance'],
  'src/game/terrain.ts': ['groundHeight', 'lakeRadius', 'walkableHeight', 'isInsideHome', 'isInsideShop'],
  'src/game/colliders.ts': ['collidesAt'],
  'src/game/camera.ts': ['positionFollowCamera'],
  'src/game/characters.ts': ['animateCharacter'],
  'src/game/world.ts': ['updateAimingFoliage', 'crownBlocks'],
  'src/game/hunting.ts': ['update'],
};

const ALLOCATING_METHODS = new Set([
  'clone', 'map', 'filter', 'forEach', 'some', 'every', 'reduce', 'slice', 'concat', 'flat', 'flatMap',
  'from', 'of', 'keys', 'values', 'entries', 'split', 'join', 'padStart', 'padEnd', 'repeat', 'toFixed',
  'toString', 'hypot', 'bind', 'find', 'findIndex', 'sort', 'toSorted', 'toReversed', 'reverse',
]);

function findHotFunctions(source, names) {
  const wanted = new Set(names);
  // Klassmetoder och klassfält går före lokala pilfunktioner med samma namn
  // (engine.ts har t.ex. både metoden move() och en pekarhanterare som heter move).
  const found = new Map();
  const offer = (name, body, rank) => {
    if (!wanted.has(name)) return;
    const current = found.get(name);
    if (!current || rank < current.rank) found.set(name, { body, rank });
  };
  const visit = node => {
    if ((ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node)) && node.body) offer(node.name.getText(source), node.body, 0);
    else if (ts.isPropertyDeclaration(node) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) offer(node.name.getText(source), node.initializer.body, 1);
    else if (ts.isFunctionDeclaration(node) && node.name && node.body) offer(node.name.getText(source), node.body, 2);
    else if (ts.isVariableDeclaration(node) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) offer(node.name.getText(source), node.initializer.body, 3);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return new Map([...found.entries()].map(([name, { body }]) => [name, body]));
}

/** Toasts och repliker är händelser, inte något som sker varje steg. */
function isEventCall(node) {
  const call = node.parent;
  if (!call || !ts.isCallExpression(call) || !ts.isPropertyAccessExpression(call.expression)) return false;
  return ['onToast', 'say', 'onDialogue'].includes(call.expression.name.text);
}

function allocationsIn(source, body) {
  const problems = [];
  const report = (node, what) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    const text = source.text.split('\n')[line];
    if (ALLOWED_MARKER.test(text)) return;
    problems.push({ line: line + 1, what, snippet: node.getText(source).replace(/\s+/g, ' ').slice(0, 90) });
  };
  const visit = node => {
    if (ts.isNewExpression(node)) report(node, 'new');
    else if (ts.isArrayLiteralExpression(node)) report(node, 'listliteral');
    else if (ts.isObjectLiteralExpression(node)) { if (!isEventCall(node)) report(node, 'objektliteral'); }
    else if (ts.isSpreadElement(node) || ts.isSpreadAssignment(node)) report(node, 'spridning');
    else if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) { report(node, 'closure'); return; }
    else if (ts.isTemplateExpression(node)) report(node, 'strängmall');
    else if (ts.isRegularExpressionLiteral(node)) report(node, 'reguljärt uttryck');
    else if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ALLOCATING_METHODS.has(node.expression.name.text)) report(node, `.${node.expression.name.text}()`);
    else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken && (ts.isStringLiteral(node.left) || ts.isStringLiteral(node.right))) report(node, 'strängsammanslagning');
    ts.forEachChild(node, visit);
  };
  visit(body);
  return problems;
}

let checked = 0;
const failures = [];
for (const [file, names] of Object.entries(HOT_FUNCTIONS)) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found = findHotFunctions(source, names);
  for (const name of names) {
    const body = found.get(name);
    assert.ok(body, `${file}: hittar inte funktionen ${name} – har den bytt namn? Uppdatera listan i scripts/frame-loop-allocation-test.mjs.`);
    checked++;
    for (const problem of allocationsIn(source, body)) failures.push(`${file}:${problem.line} i ${name}(): ${problem.what} – ${problem.snippet}`);
  }
}

if (failures.length) {
  console.error('Bildruteloopen skapar nya objekt:\n  ' + failures.join('\n  '));
  console.error('\nAnvänd de delade vektorerna överst i engine.ts, vanliga loopar och positionsargument. Måste raden allokera, skriv "// tillåten allokering: <varför>" på samma rad.');
  process.exit(1);
}
console.log(`✓ ${checked} funktioner i bildruteloopen skapar inga nya objekt`);
