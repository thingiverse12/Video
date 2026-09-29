// Stegar igenom spelets regler utan webbläsare: en hel jakttur (hämta geväret,
// åk till skogen, sikta, skjut, belöning), butiksrisken, Rurik och mätarlaget,
// straff, sparfilen och terrängen kring Myrsjön. Kör: node scripts/game-logic-test.mjs
import assert from 'node:assert/strict';
import { importPureModule } from './load-ts.mjs';

const types = await importPureModule('src/game/types.ts');
const terrain = await importPureModule('src/game/terrain.ts');
const rules = await importPureModule('src/game/rules.ts');
const save = await importPureModule('src/game/save.ts');
const colliders = await importPureModule('src/game/colliders.ts');

const { INITIAL_SNAPSHOT, MISSIONS, DESTINATIONS, HOME, SHOP } = types;
let checks = 0;
const ok = (label, condition) => { assert.ok(condition, label); checks++; };
const fresh = () => ({ ...structuredClone(INITIAL_SNAPSHOT), started: true });
const at = id => { const d = DESTINATIONS.find(x => x.id === id); return { x: d.x, z: d.z }; };
const rurikHome = { x: 35.4, z: -17.9 };

// 1. En hel jakttur: gevär → skog → sikta → skjut → belöning
{
  const state = fresh();
  const claimed = new Set();
  const visit = (player, toolboxTaken = false) => rules.advanceProgress(state, { player, rurik: rurikHome, toolboxTaken, claimed });

  ok('utan gevär går det inte att sikta', !rules.canUseRifle(state, at('home')));
  ok('jaktuppdraget pekar hem så länge geväret saknas', rules.missionWaypoint(state, 'hunt') === 'home');
  rules.trackMission(state, 'hunt');
  ok('att spåra jakten sätter vägpunkten hem', state.activeMission === 'hunt' && state.waypoint === 'home');
  ok('gevärsstället känns igen inne i stugan men inte ute på gården', terrain.nearRifleRack({ x: HOME.rifle.x + 0.5, z: HOME.rifle.z + 1 }) && !terrain.nearRifleRack({ x: HOME.door.x, z: HOME.door.z + 3 }));
  rules.pickUpRifle(state);
  ok('geväret är med: steg 1, jakten spåras och vägpunkten är jaktmarken', state.hasRifle && state.progress.hunt === 1 && state.activeMission === 'hunt' && state.waypoint === 'forest');
  ok('inne i stugan får geväret inte höjas', !rules.canUseRifle(state, HOME.center));
  ok('ute på gården går det att höja geväret', rules.canUseRifle(state, { x: HOME.door.x, z: HOME.door.z + 3 }));

  state.inCar = true;
  ok('bilen tar vägpunkten från jaktuppdraget', rules.carEntryWaypoint(state) === 'forest');
  ok('en biltur genom byn ändrar inget', visit({ x: 5, z: -20 }).length === 0 && state.progress.hunt === 1);
  const forest = at('forest');
  const arrival = visit({ x: forest.x, z: forest.z + 3 });
  ok('framme vid jaktmarken: steg 2 och vägpunkten släcks', arrival.includes('hunt-arrived') && arrival.includes('waypoint-reached') && state.progress.hunt === 2 && state.waypoint === null);
  ok('samma plats en gång till ger inga nya händelser', visit({ x: forest.x, z: forest.z + 3 }).length === 0);
  ok('i bilen går det inte att sikta', !rules.canUseRifle(state, forest));
  state.inCar = false;
  ok('till fots i skogen går det att sikta', rules.canUseRifle(state, forest));

  const before = state.money;
  ok('en miss ger feedback men inga pengar', rules.applyShotImpact(state, 'miss', false, claimed).hit === false && state.shotFeedback === 'miss' && state.money === before);
  ok('ett skott i marken räknas som miss', rules.applyShotImpact(state, 'ground', false, claimed).hit === false && state.shotFeedback === 'miss');
  ok('ett träd i vägen rapporteras som blockerat', rules.applyShotImpact(state, 'obstacle', false, claimed).hit === false && state.shotFeedback === 'blocked');
  ok('människor kan inte skadas', rules.applyShotImpact(state, 'person', false, claimed).hit === false && state.shotFeedback === 'person' && state.health === 100);
  ok('en redan fälld älg kan inte träffas igen', rules.applyShotImpact(state, 'elk', false, claimed).hit === false && state.shotsHit === 0);
  const hit = rules.applyShotImpact(state, 'elk', true, claimed);
  ok('träff: skottpeng, jakten klar och uppdragsbelöning', hit.hit && hit.rewarded && state.shotsHit === 1 && state.shotFeedback === 'hit' && state.progress.hunt === 3 && state.money === before + rules.ELK_BOUNTY + MISSIONS.hunt.reward);
  ok('plånboken stämmer med smoke-testets 440 kr', state.money === 440);
  ok('träffen gör er efterlysta', state.wanted >= 1);
  ok('en andra älg ger skottpeng men ingen ny uppdragsbelöning', rules.applyShotImpact(state, 'elk', true, claimed).rewarded === false && state.money === 490);
  ok('uppdraget betalas aldrig två gånger', rules.completeMission(state, 'hunt', claimed) === false && state.money === 490);

  const raw = JSON.stringify(save.serializeSave(state, false));
  const restored = fresh();
  const meta = save.restoreSave(raw, restored);
  ok('sparfilen återställer jakten och minns att belöningen är utbetald', meta && restored.hasRifle && restored.progress.hunt === 3 && restored.money === 490 && meta.claimed.includes('hunt') && restored.saved);
}

// 2. Butiksrisken i Myrboden
{
  const state = fresh();
  const claimed = new Set();
  const visit = player => rules.advanceProgress(state, { player, rurik: rurikHome, toolboxTaken: false, claimed });
  const market = at('market');

  ok('att närma sig Myrboden ger steg 1', visit({ x: SHOP.center.x, z: SHOP.center.z + 12 }).includes('shop-discovered') && state.progress.shop === 1);
  rules.takeMeat(state);
  ok('köttet i kassen: steg 2, startrisk, vägpunkt hem och efterlyst', state.carryingMeat && state.progress.shop === 2 && state.shopRisk === rules.SHOP_RISK_START && state.waypoint === 'home' && state.wanted === 2);
  ok('med kassen i handen får geväret inte höjas', !rules.canUseRifle({ ...state, hasRifle: true }, { x: market.x, z: market.z + 20 }));
  // clerkNotices(arg, omtumlad, inne i butiken, avstånd till Marta)
  ok('Marta ser er inne i butiken när hon är arg', rules.clerkNotices(40, 0, true, 6));
  ok('en lugn Marta märker inget', !rules.clerkNotices(0, 0, true, 1));
  ok('en omtumlad Marta märker inget', !rules.clerkNotices(40, 3, true, 1));
  ok('utanför butiken gäller hennes synhåll', rules.clerkNotices(40, 0, false, 6.9) && !rules.clerkNotices(40, 0, false, 7.1));

  let caught = null;
  let seconds = 0;
  while (!caught && seconds < 20) {
    caught = rules.shopRiskStep(state, 0.05, true, true, seconds > rules.SHOP_GRACE_SECONDS);
    seconds += 0.05;
  }
  ok('risken slår i taket efter drygt fem sekunder framför Marta', caught === 'caught' && seconds > 5 && seconds < 5.5);
  ok('nådetiden skyddar precis efter greppet', (() => { const s = fresh(); rules.takeMeat(s); s.shopRisk = 100; return rules.shopRiskStep(s, 0.05, true, true, false) === null; })());
  ok('utanför butiken blir man inte tagen', (() => { const s = fresh(); rules.takeMeat(s); s.shopRisk = 100; return rules.shopRiskStep(s, 0.05, true, false, true) === null; })());

  ok('Marta tar tillbaka köttet', rules.caughtInShop(state) === true);
  ok('tagen: kassen borta, 20 kr i böter, steg 1 och vägpunkt tillbaka till butiken', !state.carryingMeat && state.money === 220 && state.progress.shop === 1 && state.waypoint === 'market' && state.wanted === 1);
  ok('utan kött finns inget att ta', rules.caughtInShop(state) === false);
  state.shopRisk = 10;
  rules.shopRiskStep(state, 0.5, true, true, true);
  ok('utan kött sjunker risken även om Marta tittar', state.shopRisk === 0);

  rules.takeMeat(state);
  for (let i = 0; i < 40; i++) rules.shopRiskStep(state, 0.05, false, false, true);
  ok('risken sjunker till noll när Marta tappat er ur sikte', state.shopRisk === 0 && state.carryingMeat);
  ok('halvvägs hem händer inget', visit({ x: 20, z: 12 }).length === 0 && state.carryingMeat);
  const delivered = visit({ x: 4, z: 8 });
  ok('hemma på gården: köttet levererat, 120 kr och hälsa', delivered.includes('meat-delivered') && !state.carryingMeat && state.progress.shop === 3 && state.money === 340 && state.wanted === 0);
  ok('vägpunkten hem släcks samtidigt', delivered.includes('waypoint-reached') && state.waypoint === null);
  ok('en andra kasse ger ingen ny belöning', (() => { rules.takeMeat(state); visit({ x: 4, z: 8 }); return state.money === 340 && state.progress.shop === 3; })());
}

// 3. Rurik, verktygslådan och mätarlaget
{
  const state = fresh();
  const claimed = new Set();
  const visit = (player, toolboxTaken, rurik = rurikHome) => rules.advanceProgress(state, { player, rurik, toolboxTaken, claimed });

  ok('att komma fram till Reparationsboden ger steg 1', visit(at('rurik'), false).includes('rurik-discovered') && state.progress.rurik === 1);
  ok('utan verktygslåda finns inget att fly med', !visit(at('home'), false).includes('rurik-escaped') && state.progress.rurik === 1);
  rules.takeToolbox(state);
  ok('verktygslådan: steg 2 och efterlyst', state.progress.rurik === 2 && state.wanted === 2);
  ok('för nära boden: ingen belöning ännu', !visit({ x: 30, z: -14 }, true).includes('rurik-escaped') && state.progress.rurik === 2);
  ok('långt från boden men med Rurik i hälarna: fortfarande ingen belöning', !visit({ x: 61, z: -22 }, true, { x: 55, z: -22 }).includes('rurik-escaped') && state.progress.rurik === 2);
  const escaped = visit(at('home'), true);
  ok('undkommen: uppdraget klart och 100 kr', escaped.includes('rurik-escaped') && state.progress.rurik === 3 && state.money === 340 && state.wanted === 1);
  ok('hemkomsten ger inte pengar två gånger', !visit(at('home'), true).includes('rurik-escaped') && state.money === 340);

  ok('första mätaren bortjagad ger steg 2', rules.bailiffChasedOff(state, 1, claimed) === false && state.progress.bailiff === 2);
  state.bailiffsActive = true;
  ok('andra mätaren bortjagad avslutar besöket med 200 kr', rules.bailiffChasedOff(state, 2, claimed) === true && state.progress.bailiff === 3 && !state.bailiffsActive && state.money === 540);
  ok('besöket betalas inte två gånger', rules.completeMission(state, 'bailiff', claimed) === false && state.money === 540);
}

// 4. Straff och tupplur
{
  const state = fresh();
  rules.takeMeat(state);
  Object.assign(state, { inCar: true, health: 0, homeFloor: 1, onStairs: true });
  rules.respawnPenalty(state);
  ok('tupplur: 25 kr fattigare, köttet borta, ur bilen, frisk och nere på bottenvåningen', state.money === 215 && !state.carryingMeat && state.progress.shop === 1 && !state.inCar && state.health === 100 && state.wanted === 0 && state.homeFloor === 0 && !state.onStairs);
  const poor = fresh();
  poor.money = 5;
  rules.respawnPenalty(poor);
  ok('plånboken blir aldrig negativ', poor.money === 0);
}

// 5. Sparfilen tål gamla och trasiga versioner
{
  const untouched = fresh();
  ok('skräp och tomt ignoreras utan att röra tillståndet', save.restoreSave('{nope', untouched) === null && save.restoreSave(null, untouched) === null && untouched.money === 240 && !untouched.saved);
  ok('okänd version avvisas', save.restoreSave(JSON.stringify({ version: 9, money: 1 }), fresh()) === null);

  const v2 = fresh();
  const meta = save.restoreSave(JSON.stringify({ version: 2, money: 999, progress: { hunt: 2, shop: 2, rurik: 3, bailiff: 1 }, carryingMeat: true, character: 'bill', activeMission: 'hunt' }), v2);
  ok('version 2: geväret måste hämtas om, oavslutat besök nollas, köttet följer med', meta && !v2.hasRifle && v2.progress.hunt === 0 && v2.progress.bailiff === 0 && v2.carryingMeat && v2.progress.shop === 2 && v2.character === 'bill' && v2.money === 999 && meta.claimed.join() === 'rurik');

  const v1 = fresh();
  save.restoreSave(JSON.stringify({ version: 1, money: -5, progress: { hunt: 7 }, character: 'nisse', activeMission: 'hunt' }), v1);
  ok('version 1: ogiltiga fält hoppas över och uppdraget blir butiken', v1.money === 240 && v1.progress.hunt === 0 && v1.character === 'leffe' && v1.activeMission === 'shop');

  const halfShop = fresh();
  save.restoreSave(JSON.stringify({ version: 3, progress: { shop: 2 }, carryingMeat: false }), halfShop);
  ok('steg 2 utan kött backar till steg 1', halfShop.progress.shop === 1);

  // Bills bakmaskin på loftet: igång tills någon stänger av den, och avstängningen sparas.
  const bakery = fresh();
  ok('bakmaskinen är igång från början', bakery.breadMachineOn === true);
  bakery.breadMachineOn = false;
  const bakeryRaw = JSON.stringify(save.serializeSave(bakery, false));
  const bakeryRestored = fresh();
  save.restoreSave(bakeryRaw, bakeryRestored);
  ok('avstängd bakmaskin följer med i sparningen', bakeryRestored.breadMachineOn === false);
  const oldSave = fresh();
  save.restoreSave(JSON.stringify({ version: 3, money: 300 }), oldSave);
  ok('äldre sparningar utan fältet får maskinen igång', oldSave.breadMachineOn === true && oldSave.money === 300);
  ok('sparfilens nyckel och version är de motorn använder', save.SAVE_KEY === 'gramyren-adventure-v1' && save.SAVE_VERSION === 3);
}

// 6. Terräng: byn, kullarna, Myrsjön och vägarna
{
  ok('byn är platt och utkanten kuperad', terrain.groundHeight(0, 0) === 0 && terrain.groundHeight(20, -30) === 0 && terrain.groundHeight(0, -100) > 2);
  ok('golvet i stugan och butiken går före marken', terrain.walkableHeight(HOME.center.x, HOME.center.z) === HOME.groundY && terrain.walkableHeight(HOME.center.x, HOME.center.z, 1) === HOME.upperY && terrain.walkableHeight(SHOP.center.x, SHOP.center.z) === 0.155);
  ok('loftet är ett tredje plan inne i stugan', terrain.walkableHeight(HOME.center.x, HOME.center.z, 2) === HOME.loftY && HOME.loftY > HOME.upperY && terrain.walkableHeight(HOME.center.x + 30, HOME.center.z, 2) !== HOME.loftY);
  ok('loftstegen nås från Bills rum och från loftet, inte från bottenvåningen', terrain.nearLadder(HOME.ladderBase, 1) && terrain.nearLadder(HOME.ladderTop, 2) && !terrain.nearLadder(HOME.ladderBase, 0) && !terrain.nearLadder({ x: HOME.ladderBase.x + 3, z: HOME.ladderBase.z }, 1));
  ok('trätrappan går inte att använda från loftet', !terrain.nearStairs(HOME.stairsTop, 2) && terrain.nearStairs(HOME.stairsTop, 1));
  ok('bakmaskinen nås bara framför bordet på loftet', terrain.nearBreadMachine({ x: HOME.breadMachine.x - 0.75, z: HOME.breadMachine.z + 0.45 }, 2) && !terrain.nearBreadMachine({ x: HOME.breadMachine.x - 0.75, z: HOME.breadMachine.z + 0.45 }, 1) && !terrain.nearBreadMachine({ x: HOME.breadMachine.x - 4, z: HOME.breadMachine.z }, 2));
  ok('bakmaskinens bord står på loftet', HOME.breadMachine.x > HOME.loft.minX && HOME.breadMachine.x < HOME.loft.maxX && Math.abs(HOME.breadMachine.z - HOME.center.z) < HOME.loft.halfDepth);
  ok('sjöns mitt ligger under vattenytan', terrain.groundHeight(terrain.LAKE.x, terrain.LAKE.z) < terrain.LAKE.surfaceY - 0.5);
  ok('marken stiger genom vattenytan innan spegeln tar slut', terrain.groundHeight(terrain.LAKE.x - terrain.LAKE.rx, terrain.LAKE.z) > terrain.LAKE.surfaceY);
  ok('stranden och den platta byn ligger ovanför vattenytan', terrain.groundHeight(terrain.LAKE.x - terrain.LAKE.rx - 3, terrain.LAKE.z) >= 0 && 0 > terrain.LAKE.surfaceY);
  ok('marken är kontinuerlig där sänkan tar slut', Math.abs(terrain.groundHeight(terrain.LAKE.x + terrain.LAKE.rx * 1.449, terrain.LAKE.z) - terrain.groundHeight(terrain.LAKE.x + terrain.LAKE.rx * 1.451, terrain.LAKE.z)) < 0.05);
  const underWater = (x, z) => terrain.lakeRadius(x, z) < 1.45 && terrain.groundHeight(x, z) < terrain.LAKE.surfaceY;
  for (const [i, road] of terrain.ROAD_POINTS.entries()) {
    for (const [x, z] of road) ok(`väg ${i} håller sig ur Myrsjön vid (${x}, ${z})`, !underWater(x, z));
  }
  ok('sista vägbiten fram till bryggan ligger på stranden', terrain.lakeRadius(38, -44) > 1 && terrain.lakeRadius(38, -44) < 1.1);
  const lake = at('lake');
  ok('bryggan når ut över vattnet och resmålet Myrsjön står på stranden', terrain.groundHeight(44, -44) < terrain.LAKE.surfaceY && terrain.groundHeight(lake.x, lake.z) >= 0);
}

// 7. Kollisionstabellen
{
  const table = colliders.buildColliderTable([
    { type: 'circle', x: 10, z: 0, radius: 0.5 },
    { type: 'box', x: -10, z: 5, w: 4, d: 2 },
  ]);
  ok('tabellen packar båda sorterna', table.count === 2 && table.kind[0] === 0 && table.kind[1] === 1 && table.a[1] === 2 && table.b[1] === 1);
  ok('en figur som nuddar stammen stoppas', colliders.collidesAt(table, 10.8, 0, 0.43) && !colliders.collidesAt(table, 11.0, 0, 0.43));
  ok('lådan stoppar längs båda axlarna', colliders.collidesAt(table, -7.9, 5, 0.43) && colliders.collidesAt(table, -10, 6.3, 0.43) && !colliders.collidesAt(table, -7.5, 5, 0.43) && !colliders.collidesAt(table, -10, 6.5, 0.43));
  ok('bilen (större radie) fastnar tidigare än en fotgängare', colliders.collidesAt(table, 11.5, 0, 1.2) && !colliders.collidesAt(table, 11.5, 0, 0.43));
  ok('en tom tabell kolliderar aldrig', !colliders.collidesAt(colliders.buildColliderTable([]), 0, 0, 5));
}

// 8. Skattemasarnas besök: det korta klippet vid 13 sekunder
{
  const visit = rules.createSkatteVisit();
  ok('besöket börjar i vänteläge utan händelser', visit.phase === 'waiting' && rules.skatteVisitStep(visit, 0, 0.05) === null);
  ok('inget besök före tretton sekunder', rules.skatteVisitStep(visit, rules.SKATTE_ARRIVAL_SECONDS - 0.05, 0.05) === null && visit.phase === 'waiting');
  ok('klippet startar när bilen rullar in vid 13 sekunder', rules.SKATTE_ARRIVAL_SECONDS === 13 && rules.skatteVisitStep(visit, rules.SKATTE_ARRIVAL_SECONDS, 0.05) === 'cutscene-start' && visit.phase === 'cutscene');
  ok('mitten av klippet är tyst', rules.skatteVisitStep(visit, rules.SKATTE_ARRIVAL_SECONDS, rules.SKATTE_CUTSCENE_SECONDS / 2) === null && visit.phase === 'cutscene');
  ok('klippet är kort: inspektörerna kliver ur efter ' + rules.SKATTE_CUTSCENE_SECONDS + ' sekunder', rules.skatteVisitStep(visit, rules.SKATTE_ARRIVAL_SECONDS, rules.SKATTE_CUTSCENE_SECONDS / 2) === 'arrived' && visit.phase === 'visit' && visit.timer === 0);
  ok('besöket på gården varar i ' + rules.SKATTE_STAY_SECONDS + ' sekunder', rules.skatteVisitStep(visit, 0, rules.SKATTE_STAY_SECONDS) === 'leave' && visit.phase === 'leave');
  ok('inspektörerna går tillbaka till bilen', rules.skatteVisitStep(visit, 0, rules.SKATTE_LEAVE_SECONDS) === 'done' && visit.phase === 'done');
  ok('efter avslutat besök kommer inget nytt', rules.skatteVisitStep(visit, 999, 10) === null && visit.phase === 'done');

  const aborted = rules.createSkatteVisit();
  aborted.phase = 'visit'; aborted.timer = 3;
  ok('ett avbrutet besök går inte att ångra', rules.skatteVisitAborted(aborted) === true && aborted.phase === 'done' && rules.skatteVisitAborted(aborted) === false);
  ok('besöket rör aldrig plånboken', fresh().money === INITIAL_SNAPSHOT.money);
}

console.log(`✓ ${checks} spelregelkontroller gick igenom utan webbläsare`);
