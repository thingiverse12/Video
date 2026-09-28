# Gråmyren

Ett fristående svenskt 3D-skogäventyr för webbläsare. Spela som vännerna Nils och Ebbe, som rustar upp en skogsstuga i en fiktiv by, kör en obrandad blå fyrdörrars sedan, utforska skogen och välj bland fyra uppdrag. Spelets figurer, skyltar, porträtt, miljöer och musik skapas i kod; inga externa fotografier, inspelningar eller fordons-/butikslogotyper ingår i bygget.

## Spela lokalt

```sh
npm ci
npm run dev -- --port 5173
```

Öppna adressen som Vite visar. På mobil aktiveras pekknappar automatiskt; liggande läge har egen layout. Spelframsteg lagras endast i webbläsaren. Gråmyren använder en ny lokal sparnyckel; tidigare prototypers sparningar läses inte in automatiskt.

**Kontroller:** WASD/pilar går eller kör. Shift springer, E använder föremål och V byter figur. M öppnar kartan, I uppdragen, Esc pausar. H tuta; mellanslag bromsa i bilen. Hämta jaktgeväret **inne i huset** innan älgjakten. Utomhus till fots: Q/Sikta höjer geväret, placera siktet själv med mus, finger eller piltangenter, och skjut med vänsterklick, F, mellanslag eller Skjut. Projektilen syns och behöver faktiskt träffa älgen; människor kan inte skadas av skott. F utan upphöjt gevär ger ett tecknat slagsmål. Spelet använder ingen torso-/huvudgungning eller kameraskakning.

## Världen

- **Hemma:** slitna soffor, tjock-tv framför soffan, smutsig diskho, avskilda rum och ett litet E-öppningsbart kylskåp med en halv gurka och en grön tub örtkräm. Trätrappan leder till Ebbes rum på en separat övervåning med en gammal dator.
- **Myrboden:** fiktiv matbutik med köttdisk. Försök ta ett paket och ta det hem; Marta kan stoppa dig.
- **Jaktmarken:** hämta först geväret i huset, sikta manuellt och jaga en tecknad älg med synliga skott.
- **Reparationsboden:** prata, slåss eller försök ta en verktygslåda. **Mätarlaget:** envisa stigplanerare kan dyka upp på gården. **Myrsjön:** en lugn sjö att utforska.

Ljud och bakgrundsmusik är separata, avstängda från början och skapas lokalt med Web Audio efter att spelaren aktiverat dem. Ingen inspelad dialog utlovas.

Bilens 3D-form har ett kort, kantigt kupétak, sluttande bakruta och separat låg bagagelucka som en fyrdörrars sedan. Bilderna visar äldre blå sedaner; vi använder deras allmänna proportioner och dämpade blå färg utan att återge en specifik bilmodell. Fotografier, vattenmärken, modellnamn, märkesemblem och registreringsnummer ingår inte i spelet.

## Bygg, tester och Netlify

```sh
npm run build
npx playwright install chromium   # en gång, om Chromium inte redan finns
npm run dev -- --port 5173       # i en separat terminal
npm run test:smoke
npm run test:shop
npm run test:home
npm run test:upstairs
npm run test:rifle
npm run test:shooting
npm run test:aim
npm run test:graphics
npm run test:mobile
npm run test:touch
npm run test:music
npm run test:deploy
npm run test:rights  # begränsad kontroll av gamla namn och medföljande licenser
```

Browser-testerna använder `http://localhost:5173` som standard; ändra med `TEST_URL` och/eller `CHROMIUM_EXECUTABLE`. `SCREENSHOTS=1` sparar testbilder i den ignorerade mappen `screenshots/`. Netlify använder `netlify.toml` (byggkommando `npm run build`, publiceringsmapp `dist`) och SPA-omskrivningen i `public/_redirects`. Tidigare Netlify-förhandsvisningar med en äldre version är fortfarande åtkomliga; den som har Netlify-åtkomst måste ta ned eller ersätta dem. Den här kodändringen uppdaterar **inte** adresserna automatiskt.

## Rättigheter och publicering

Licensfiler för de medföljande typsnitten och programbiblioteken finns under `public/licenses/` och ingår i `dist/licenses/` efter byggning. Länken **Licenser** finns i spelets sidfot. `npm run build` kör automatiskt en begränsad kontroll som stoppar bygget om kända äldre namn eller märken dyker upp i dagens appfiler eller om licensfilerna saknas. Kontrollen bedömer inte juridisk originalitet.


Det här är en omarbetning med nya namn, nya figurkläder/porträtt, en ommärkt butik, generisk bil utan emblem och ny förpackningsgrafik. Det är en riskminskande förändring, **inte en juridisk garanti**. Granska fortfarande musik, kod, typsnitt, beroenden och helhetsintryck innan publik lansering. En friskrivning eller ändrad HEAD raderar inte tidigare Git-historik, gamla byggfiler eller redan publicerade webbplatser. Den som äger gamla driftsättningar behöver själv ta ned eller ersätta dem. Sök kvalificerad juridisk rådgivning vid behov.

## Kodöversikt

- `src/App.tsx`, `src/components/` — gränssnitt, porträtt, kartor och touchkontroller.
- `src/game/engine.ts`, `src/game/types.ts` — spel, uppdrag, styrning och sparning.
- `src/game/characters.ts`, `src/game/vehicles.ts`, `src/game/shop.ts`, `src/game/furniture.ts` — egenritade modeller och rekvisita.
- `src/game/hunting.ts`, `src/game/home.ts`, `src/game/upstairs.ts`, `src/game/world.ts` — jakt, hus, övervåning och terräng.
- `src/game/audio.ts`, `src/game/music.ts` — syntetiserat ljud och instrumental musik.
