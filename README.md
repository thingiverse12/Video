# Gråmyren

Ett fristående svenskt 3D-skogäventyr för webbläsare. Spela som vännerna Leffe och Bill, som rustar upp en skogsstuga i en fiktiv by, kör en obrandad blå fyrdörrars sedan, utforska skogen och välj bland fyra uppdrag. Spelets figurer, skyltar, porträtt, miljöer och musik skapas i kod; inga externa fotografier, inspelningar eller fordons-/butikslogotyper ingår i bygget.

## Spela lokalt

```sh
npm ci
npm run dev -- --port 5173
```

Öppna adressen som Vite visar. På mobil aktiveras pekknappar automatiskt; liggande läge har egen layout. Spelframsteg lagras endast i webbläsaren. Gråmyren använder en ny lokal sparnyckel; tidigare prototypers sparningar läses inte in automatiskt.

**Kontroller:** WASD/pilar går eller kör. Shift springer, E använder föremål och V byter figur. M öppnar kartan, I uppdragen, Esc pausar. H tuta; mellanslag bromsa i bilen. Hämta jaktgeväret **inne i huset** innan älgjakten. Utomhus till fots: Q/Sikta höjer geväret, placera siktet själv med mus, finger eller piltangenter, och skjut med vänsterklick, F, mellanslag eller Skjut. Projektilen syns och behöver faktiskt träffa älgen; människor kan inte skadas av skott. F utan upphöjt gevär ger ett tecknat slagsmål. Spelet använder ingen torso-/huvudgungning eller kameraskakning.

## Världen

- **Hemma:** slitna soffor, tjock-tv framför soffan, smutsig diskho, avskilda rum och ett litet E-öppningsbart kylskåp med en halv gurka och en grön tub örtkräm. Trätrappan leder till Bills rum på en separat övervåning med en gammal dator.
- **Myrboden:** fiktiv matbutik med köttdisk. Försök ta ett paket och ta det hem; Marta kan stoppa dig.
- **Jaktmarken:** hämta först geväret i huset, sikta manuellt och jaga en tecknad älg med synliga skott.
- **Reparationsboden:** prata, slåss eller försök ta en verktygslåda. **Mätarlaget:** envisa stigplanerare kan dyka upp på gården. **Skattemasarna:** spelets fiktiva skatteparodi kommer i ett kort klipp tretton sekunder efter start — deras bil rullar in, inspektörerna stämmer av era inkomster och åker vidare. **Myrsjön:** en lugn sjö att utforska.

Ljud och bakgrundsmusik är separata, avstängda från början och skapas lokalt med Web Audio efter att spelaren aktiverat dem. Ingen inspelad dialog utlovas.

Bilens 3D-form har ett kort, kantigt kupétak, sluttande bakruta och separat låg bagagelucka som en fyrdörrars sedan. Bilderna visar äldre blå sedaner; vi använder deras allmänna proportioner och dämpade blå färg utan att återge en specifik bilmodell. Fotografier, vattenmärken, modellnamn, märkesemblem och registreringsnummer ingår inte i spelet.

## API: Skogsprataren (`/api/ai`)

Spelet kan frivilligt prata med en språkmodell via en serverfunktion. Webbläsaren anropar bara `/api/ai` på samma adress som spelet; själva nyckeln ligger i serverns miljövariabler och skickas aldrig till spelaren, loggas aldrig och syns aldrig i svaren. Panelen finns under **Inställningar → Skogsprataren**. Utan nyckel visas i stället en förklaring, och spelet fungerar precis som vanligt.

```sh
# Lokalt: kör funktionen som den ser ut hos Netlify, utan konto
netlify functions:serve --port 9999 --offline   # eller: netlify dev
curl http://localhost:9999/api/ai                        # status, ingen nyckel krävs
curl -X POST http://localhost:9999/api/ai \
  -H 'content-type: application/json' \
  -d '{"prompt":"Skriv en kort skylt till stugan"}'
```

| Miljövariabel | Betydelse |
| --- | --- |
| `AI_API_KEY` | Nyckeln. `OPENAI_API_KEY` eller `ANTHROPIC_API_KEY` fungerar också, liksom de nycklar Netlify AI Gateway injicerar automatiskt. |
| `AI_PROVIDER` | `openai` (standard, OpenAI-kompatibelt) eller `anthropic`. |
| `AI_MODEL` | Modellnamn, t.ex. `gpt-4o-mini` eller `claude-sonnet-4-5`. |
| `AI_API_URL` | Annan basadress, t.ex. `https://openrouter.ai/api/v1` eller en egen gateway. |

`GET /api/ai` svarar `{ ok, configured, provider?, model?, maxPromptChars }`. `POST /api/ai` tar `{ "prompt": "...", "system"?, "maxTokens"? }` och svarar `{ ok: true, text, provider, model }`. Fel svarar med `400` (ogiltig kropp), `405` (fel metod), `413` (för lång prompt), `501` (nyckel saknas) eller `502` (tjänsten svarade inte). Netlify-varianten har även en gräns på 20 anrop per minut och IP.

Nyckeln sätts där appen körs, aldrig i `src/`:

- **Netlify:** fungerar bara på en claimad webbplats som publiceras med konto och token; anonyma Netlify-publiceringar kan inte innehålla funktioner alls. Sätt då `AI_API_KEY` under Site configuration → Environment variables med scope **Functions**.
- **Vercel:** Project → Settings → Environment Variables → `AI_API_KEY`, och deploya om. `api/ai.js` använder samma `server/ai-core.mjs` som Netlify-funktionen.
- **GitHub Pages:** statisk värd utan funktioner, så panelen visar bara att API:t inte finns där.

`npm run test:api` kör 71 kontroller av endpointen utan nätverk och utan riktiga nycklar, inklusive båda värdarnas funktionsformer och en kontroll som stoppar en nyckel som råkar hamna i webbläsarkoden.

## Bygg, tester och Netlify

```sh
npm run build
npx playwright install chromium   # en gång, om Chromium inte redan finns
npm run dev -- --port 5173       # i en separat terminal
npm run test:smoke
npm run test:shop
npm run test:skatte
npm run test:home
npm run test:upstairs
npm run test:rifle
npm run test:shooting
npm run test:aim
npm run test:api
npm run test:graphics
npm run test:mobile
npm run test:touch
npm run test:music
npm run test:deploy
npm run test:rights  # begränsad kontroll av gamla namn och medföljande licenser
```

Browser-testerna använder `http://localhost:5173` som standard; ändra med `TEST_URL` och/eller `CHROMIUM_EXECUTABLE`. `SCREENSHOTS=1` sparar testbilder i den ignorerade mappen `screenshots/`. `node scripts/record-skatte-clip.mjs` spelar in ett kort webm-klipp av Skattemasarnas ankomst till den ignorerade mappen `clips/`. Netlify använder `netlify.toml` (byggkommando `npm run build`, publiceringsmapp `dist`) och SPA-omskrivningen i `public/_redirects`. Tidigare Netlify-förhandsvisningar med en äldre version är fortfarande åtkomliga; den som har Netlify-åtkomst måste ta ned eller ersätta dem. Den här kodändringen uppdaterar **inte** adresserna automatiskt.

## Publicera med serverfunktion

**Var API:t kör.** Netlify CLI vägrar anonyma deployer så snart projektet innehåller en serverfunktion (`checkForFunctions()` avbryter utan meddelande), så en anonym Netlify-förhandsvisning kan bara innehålla själva spelet. API:t körs därför på Vercel-projektet som redan är kopplat till repot: varje push ger en ny förhandsvisning, och huvudgrenen ger produktion. Sätt `AI_API_KEY` under **Project → Settings → Environment Variables** i Vercel så svarar `/api/ai` där. Spelet på Vercel-adressen får då en fungerande Skogsprataren; på Netlify och GitHub Pages visar panelen att API:t inte finns på den adressen.

Vill du ändå nå API:t från Netlify-adressen: sätt repositoryvariabeln `AI_API_BASE` till Vercel-adressens ursprung, till exempel `https://video-phi-six.vercel.app`. Publiceringen lägger då in en proxyregel i `_redirects` (`/api/* → <ursprung>/api/:splat`) och Netlify-skriptet rapporterar `proxied: true`. Regeln kräver ett `https://`-ursprung utan sökväg.

Arbetsflödet **Netlify preview** (`.github/workflows/netlify-preview.yml`) publicerar från den godkända arbetsgrenen när commit-meddelandet innehåller `[netlify-preview]`, eller manuellt via *Run workflow*. Det kör `npm run test:api`, bygger spelet, publicerar en anonym Netlify-förhandsvisning av de statiska filerna och kontrollerar till sist `GET /api/ai` över HTTPS. Svaret där säger antingen att funktionen är igång (via proxy till Vercel) eller att bara statiska filer publicerades.

En anonym Netlify-webbplats måste claimas inom 60 minuter, annars stängs den. Claimlänken och lösenordet skrivs aldrig i klartext i loggen: de ligger i ett krypterat kuvert i körningens artefakt och i `NETLIFY_ENVELOPE_*`-notiserna. Öppna dem med den egna nyckeln:

```sh
node scripts/netlify-owner-key.mjs generate            # en gång: ny publik nyckel + lokal privat nyckel
node scripts/netlify-owner-key.mjs open .netlify/preview-owner-private-key.pem --log run.log
```

Den publika nyckeln (`.github/netlify-preview-public.pem`) versionshanteras; den privata (`.netlify/preview-owner-private-key.pem`) är ignorerad av Git och ska aldrig delas eller publiceras. Vercel är redan kopplad till repot och kör `api/ai.js` vid push, så den vägen behöver ingen claim alls.

## Rättigheter och publicering

Licensfiler för de medföljande typsnitten och programbiblioteken finns under `public/licenses/` och ingår i `dist/licenses/` efter byggning. Länken **Licenser** finns i spelets sidfot. `npm run build` kör automatiskt en begränsad kontroll som stoppar bygget om kända äldre namn eller märken dyker upp i dagens appfiler eller om licensfilerna saknas. Kontrollen bedömer inte juridisk originalitet.


Det här är en omarbetning med nya namn, nya figurkläder/porträtt, en ommärkt butik, generisk bil utan emblem och ny förpackningsgrafik. Det är en riskminskande förändring, **inte en juridisk garanti**. Granska fortfarande musik, kod, typsnitt, beroenden och helhetsintryck innan publik lansering. En friskrivning eller ändrad HEAD raderar inte tidigare Git-historik, gamla byggfiler eller redan publicerade webbplatser. Den som äger gamla driftsättningar behöver själv ta ned eller ersätta dem. Sök kvalificerad juridisk rådgivning vid behov.

## GitHub Pages

Aktivera Pages en gång i repositoryts inställningar: **Settings → Pages → Build and deployment → Source → GitHub Actions**. `actions/configure-pages@v5` läser Pages-konfigurationen och kan ge `404 Not Found` om den ännu inte finns. Indata `enablement: true` kräver en token med behörighet att administrera Pages; workflowens vanliga `GITHUB_TOKEN` räcker inte. När källan har valts, kör om workflowet **Deploy static content to Pages**.

## Kodöversikt

- `src/App.tsx`, `src/components/` — gränssnitt, porträtt, kartor och touchkontroller.
- `src/game/engine.ts`, `src/game/types.ts` — spel, uppdrag, styrning och sparning.
- `src/game/characters.ts`, `src/game/vehicles.ts`, `src/game/shop.ts`, `src/game/furniture.ts` — egenritade modeller och rekvisita.
- `src/game/hunting.ts`, `src/game/home.ts`, `src/game/upstairs.ts`, `src/game/world.ts` — jakt, hus, övervåning och terräng.
- `src/game/audio.ts`, `src/game/music.ts` — syntetiserat ljud och instrumental musik.
