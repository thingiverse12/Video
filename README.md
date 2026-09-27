# Leif & Billy — Ett norrländskt äventyr

En spelbar 3D-prototyp i webbläsaren. Två bröder, en blå **Volvo V40**, fyra uppdrag och en liten, öppen värld med gårdar, jaktmarker, skogssjö och **ICA Sörbäcken**.

**Inofficiellt fanprojekt. Inte kopplat till eller godkänt av SVT, ICA eller Volvo.** Figurerna är egenbyggda, stiliserade 3D-modeller utifrån referensbildens kläder och färger, inte fotorealistiska avbilder. Butiken, handlaren och händelserna är påhittade. All jakt och alla slagsmål är tecknad, blodfri fiktion.

## Grafikuppdatering (0.8)

- **En sammanhållen norrländsk bildstil:** svalare himmelsljus, varmt solljus, mer färgdjup och luftig dis i fjärran. Finfin använder en tätare, stabiliserad solskugga runt spelområdet. Figurer, älgar, hus och V40 har dessutom mjuka markskuggor, även med realtidsskuggorna avstängda.
- **Material med struktur:** procedurgenererat gräs, grus, bark, tygväv och älgpäls. Grusvägarna har mjuka hjulspår och gårdens markfläckar tonar ut i gräset i stället för att bilda skarpa cirklar. Ängsblommor har stjälkar och kronblad. Sjömaterialet har rörliga krusningar och mjuk glans.
- **Mer form i skogen:** granarna har skulpterade, oregelbundna grenlager och gräset böjda blad. Björkkronorna använder instanser i stället för många separata objekt. Skymmande kronor framför figuren, bilen eller siktet kan döljas även utanför jaktläget; stammar och kollisioner finns kvar. Myrsjön visas nu också med rätt platsnamn vid snabbresans ankomstpunkt.
- **Brödernas kläder följer fortfarande referensen:** Leifs gröna jacka med bruna axelpartier, rutig tröja och grön keps, samt Billys orange väst, grågröna skjorta och mörka keps. Västen går nu runt ryggen på riktigt. Material, ansiktskonturer, sömmar och de illustrerade HUD-porträtten har putsats. Ingen kroppsgungning eller huvudsvaj har lagts tillbaka.
- **Den blå Volvo V40:n är kvar**, nu med blankare lack, tydligare glas/reflexstråk och mjuka markskuggor. Himmelsreflexer läggs bara på blanka/metalliska ytor, inte på hela skogens material.
- **Ett renare gränssnitt:** fältjournalens ljusa paneler, mörkgrönt figur-/jaktkort, varmare knappar, tydligare typografi och mindre uppdragskort på mobil. Touchknapparna behåller sina stora tryckytor och alla tidigare funktioner.
- Pekskärmar börjar automatiskt i **Lagom** (markskuggor, alla modeller/material och begränsad pixelupplösning). **Finfin** under Inställningar aktiverar dessutom solskuggor och högre upplösning. Ingen tung efterbehandling eller externa bild-/modellfiler används. Sparformat 3 och uppdrag är oförändrade.

## Tydligare gevärsstyrning (0.7.1)

- **Skjut är låst tills du själv placerat siktet.** Höj geväret med Sikta/Q och välj en riktning med musen, fingret eller piltangenterna. Först därefter fungerar skjutknappen, F eller mellanslag. Att bara höja geväret räcker inte. Siktet behöver inte ligga på ett mål för att avfyra: felriktade skott kan fortfarande missa.
- **F / den vanliga touchknappen skjuter när geväret är höjt**, i stället för att oväntat lägga undan det och slå. Knappen byter tydligt till Skjut. Utan höjt gevär är F fortfarande slagsmål; i V40:n är det tutan.
- Piltangenterna flyttar siktet i jaktläge, medan WASD/touchpilarna fortfarande flyttar figuren. Sänk med Q/E för vanlig gång med piltangenter igen. Ingen kroppsgungning eller kameraskakning har lagts till.
- Tydligare stegvis hjälp, låst Skjut-knapp innan siktning, något större synlig kula/spår och en påminnelse vid jaktmarken om geväret inte hämtats i huset. Att sänka/byta gevär återställer kravet på egen siktning.

## Sikta och skjuta (0.7)

- **En synlig kula lämnar pipan**, med ett litet gult spår. Kulan rör sig genom världen; älgen räknas inte som träffad när du trycker på knappen, utan först om kulan faktiskt kolliderar med modellen. Ingen målsökning eller automatisk träff bara för att du står nära.
- **Dator:** hämta först geväret inne i huset. Utomhus till fots tar **Q**, högerklick eller **Sikta** fram siktet. Flytta musen till älgen och skjut med **vänsterklick**, **mellanslag** eller **Skjut**. Q/E eller Sänk lägger undan geväret. E nära en älg öppnar nu siktningen i stället för att omedelbart klara jakten.
- **Pekskärm:** tryck **Sikta**, peka eller dra för att placera siktet, och tryck sedan den separata **Skjut-knappen**. Att flytta fingret avlossar inte ett skott och vrider inte kameran. Pilarna fungerar fortfarande; man går långsammare när man siktar. Siktet och jaktinformationen frigör plats från uppdragskort/minikarta på mobil. Porträttläget får en lite bredare jaktvy. Om ingen älg syns: sänk geväret och dra i spelbilden för att se dig omkring.
- **Du kan missa.** Skymmande tallkronor döljs tillfälligt längs kamerans siktlinje så man kan se figuren och siktet; de återställs när geväret läggs undan. Trädstammar, väggar, mark och bilar stoppar skott. Figuren kan inte skjuta genom ett hinder framför pipan. Människor kan stoppa kulan men tar ingen skottskada; med geväret sänkt är F fortfarande de tecknade slagsmålen.
- Träffar ger den befintliga jaktbelöningen, missar ger ingenting. Uppdragsbelöningen betalas bara en gång; även senare jaktpengar sparas. Ammunitionen är obegränsad i prototypen, med en kort paus mellan skotten.
- Paus fryser kulor i luften. Snabbresa, brorbyte, återställning och återuppvaknande tar bort pågående skott. Siktning och kulor är tillfälliga; geväret och belöningarna använder oförändrat sparformat 3. Siktning tillåts inte inne i huset/butiken, i bilen, på trappan eller med matkassen.
- Inget nytt kroppsgung, rekylskak eller kameraskak. Pågående kamerainzoomning avslutas när siktet tas fram så siktet inte driver av sig självt.

## Utan gungande (0.6.2)

- **Kroppsgungandet är helt borttaget**, inte bara minskat. Leif och Billy har stilla överkropp och huvud när de står, går och springer. Ben, armar, slag och blinkningar animeras fortfarande. Träffar ger partikel-/HUD-feedback utan kroppsskakning, och yra NPC:er har en fast lutande pose.
- Kamerapositionen och blickpunkten använder samma följpunkt. Zoom och kameravridning kan fortfarande glida mjukt, men kameran jagar inte längre blickpunkten med en extra fördröjning som kan kännas som gung när man startar och stannar.
- Touchtestet kräver nu **exakt noll** kroppsgung och huvudsvaj för båda bröderna och testar att kamerans avstånd/vinkel till följpunkten inte driver under gång/stopp.

## Pekskärmsfix (0.6.1)

- **Stabil touchstyrning:** riktningskontrollen följer ett finger åt gången. Håll en pil eller glid med tummen mellan pilarna; diagonaler fungerar och mitten är en dödzon. Mellanrummen fångar också beröringen så den inte råkar vrida kameran. Pilarnas tryckytor är större och aktiva riktningar markeras.
- **Separata fingrar för gång och spring/broms:** lyft ett finger utan att avbryta det andra. Fysiska tangenter har egna inmatningskällor. Kameran följer bara fingret som började kameradragningen; ytterligare fingrar kan inte få den att hoppa fram och tillbaka.
- Släpp, avbruten beröring, förlorad pointer capture, paus, dolt fönster, skärmrotation/storleksändring och borttagna kontroller rensar de hållna touchkommandona.
- **Mjukare gånganimation:** en sammanhängande stegfas ersätter frekvensbyten på spelklockan. Gång/spring och stillastående tonas samman utan att benen hoppar till. Mindre gung och vridning i överkroppen. Animation och fotsteg använder faktisk förflyttning: figuren går inte på stället mot en vägg eller bilen.

## Nytt i musikuppdateringen (0.6)

- **Myrstigen:** en egen, instrumental och folkmusikinspirerad vals i 88 BPM. Mjuk syntetiserad flöjtmelodi, plockade strängklanger, bas och lätt rumsklang. 32 takter (cirka 65 sekunder) loopar utan paus; ingen musik eller inspelning från tv-serien används.
- Klicka på **not-symbolen i sidhuvudet**, eller slå på **Bakgrundsmusik** under **Inställningar**. Musik och spelljud har separata av/på-knappar och volymreglage. Det går att lyssna på musiken utan fåglar, motor och fotsteg, och tvärtom.
- Allt ljud är avstängt vid en ny sidladdning och startar först efter ett klick. Musiken tonas mjukt in/ut, dämpas till 22 procent av vald nivå när dialogrutan öppnas och återgår när den stängs. Den fortsätter i menyerna, men ljudklockan pausas när webbläsarfliken döljs.
- Musiken skapas lokalt med Web Audio efter aktivering och spelas från en återanvänd loopbuffert. Ingen extern ljudtjänst, nedladdning, ljudfil eller prenumeration krävs. Upprepade klick skapar inte överlappande musik. Återställning av spelframsteg behåller de aktuella ljudvalen, medan omladdning återgår till avstängt ljud.

## Nytt i övervåningsuppdateringen (0.5)

- **En halv gurka i kylskåpet**, bredvid Kalles-tuben: mörkgrönt skal, rundad ände och en ljus snittyta med kärnor. E öppnar och stänger kylen som tidigare.
- **Tv-rummet och matplatsen är avskärmade** med åldrade väggar, träkarmar och riktiga dörrpassager. Väggarna är nedskurna för kameran, men har kollisioner. Matbordet har flyttats för att ge fri passage till trappan.
- **En gammal trätrappa med 14 steg och räcke** står vid matplatsen längs vänstra väggen. Gå fram och tryck **E** för att gå upp eller ner. Figuren går animerat längs stegen; kameran följer med. Paus stoppar även trappgången.
- **Billys rum finns på en verklig övervåning**, med eget golv, trappöppning, räcke, sovplats, den gamla gröna soffan och ett skrivbord. Våningen har separata kollisionskroppar; bottenvåningens kyl och gevär kan inte användas genom golvet. Brorbyte behåller rätt våning. Figuren kan inte gå ut genom väggen eller falla genom trappöppningen.
- **En gammal beige dator** med tjockskärm, diskettstation, tangentbord, sladdmus och kontorsstol står på skrivbordet. E startar/stänger av den; skärmen visar ett egenritat retro-skrivbord. Det är en interaktiv datorrekvisita, inte ett separat datorspel.
- Kyldörr, datorknapp och trappa fungerar också med touch. Sparformat 3 är oförändrat: pengar, uppdrag och utrustning bevaras; nya sessioner börjar på gården med datorn avstängd. Återställning och snabbresa avbryter trappgång säkert.

## Inredningsuppdateringen (0.4)

- **Gammal och sliten inredning:** två nedsuttna, mönstrade soffor med lagningar och rutiga filtar, blekta sjuttiotalstapeter, repigt trägolv och en sliten matta.
- En **gammal tjock-tv med antenner och vridreglage** står på en teakbänk framför huvudsoffan. Skärmen visar ett egenritat skogsprogram med scanlines. På soffbordet ligger fjärrkontroll, tidning och kaffemugg.
- Den gamla **diskbänken har en nedsänkt diskho** med kran, smutsiga tallrikar och koppar. På avrinningsytan står en kastrull, och där finns också disksvamp och kökshandduk.
- Ett **litet gulnat kylskåp** går att öppna och stänga med **E** eller touchknappen. Dörren svänger på gångjärnen och visar en blå **Kalles kaviar-tub** på hyllan. Tuben är egenritad spelrekvisita, inte en extern bild eller ett sponsrat inslag.
- Möblerna har kollisionskroppar, men mittgången, gevärsstället och utgången är fortfarande nåbara. Kylen stängs när man lämnar huset och vid återställning. Kylbesöket ändrar inte inventarier, pengar eller uppdrag; sparformatet är oförändrat.

## Hus- och jaktuppdateringen (0.3)

- **Hämta jaktgeväret inne i huset före jakten.** Gå fram till verandan på det röda huset och tryck **E**. Huset öppnar en möblerad, spelbar interiör med kök, soffa och gevärsställ. Gå längst in till vänster och tryck E vid geväret. Tillbaka vid dörren går E ut igen.
- Jakten spärras i spelmotorn om geväret saknas, även vid snabbresa till jaktmarken eller med touchknappar. Att sätta sig i bilen räknas inte som hämtad utrustning. Jaktuppdragets ordning är **hämta gevär → ta dig till jaktmarken → jaga älg**.
- Det hämtade geväret syns på den valda brodern, delas mellan Leif och Billy och följer med vid brorbyte. Utrustningsstatus visas på figurkortet. Det används bara för den befintliga, blodfria älgjakten; slagsmål med F är oförändrade.
- **ICA Sörbäcken** är nu det korrekta namnet på butikens 3D-skyltar, kartan, uppdragen och i spelguiden.
- Geväret sparas mellan sessioner. Äldre sparningar behåller pengar och avklarade uppdrag, men kräver hämtning av geväret innan man kan jaga igen. Återställning lägger tillbaka geväret i stället.

## Butiks-, bil- och figuruppdateringen (0.2)

- **ICA Sörbäcken** är en ny plats på båda kartorna, med anslutningsväg, parkering, skyltar, kundvagnar, varuhyllor, kassa och köttdisk. Gå fram till entrén och tryck **E**. Tak och övre väggar döljs inne i butiken så att det går att se och spela där.
- **Kött till kvällsmaten** är det fjärde uppdraget. Båda bröderna kan försöka ta ett köttpaket med E, bära en synlig matkasse och fly hem till gården. Handlaren Bosse reagerar och riskmätaren stiger. Om han stoppar er går köttet tillbaka, 20 kr dras och försöket kan göras om. Leverans hemma ger 120 kr och lite hälsa. Snabbresa är spärrad medan köttet bärs: gå, spring eller kör hem.
- **Volvo V40** ersätter den tidigare bilen med en ny kompakt kombimodell: lägre och kortare kaross, mjukt avfasad front, sluttande glaspartier, V40-märke, diagonalt Volvo-emblem, femekrade fälgar och höga baklampor. Bromsljusen tänds vid inbromsning.
- **Nya figurmodeller** har rundare kroppar och leder, tygmönster, jackfickor, sömmar, dragkedjor, böjda kepsskärmar, skägg, ögon med blinkningar, detaljerade händer och kängor samt mjukare gånganimationer. Leif behåller sin gröna jacka/keps och Billy sin orange väst/mörka keps från referensbilden.
- Touchkontroller har en **Spring/Bromsa**-knapp. Sparningar från 0.1 uppgraderas utan att pengar eller avklarade uppdrag försvinner.

## Kör lokalt

Kräver Node.js 20.19+ (eller 22.12+) och en webbläsare med WebGL 2.

```sh
npm ci
npm run dev
```

Vite lyssnar på `0.0.0.0:5173` och accepterar förhandsvisningens värdnamn. Öppna adressen som visas av utvecklingsmiljön. Klicka **Nu kör vi** för att spela, eller **Fortsätt äventyret** om en sparning finns.

```sh
npm run build       # TypeScript-kontroll och produktionsbygge
npm run preview     # Förhandsvisa produktionsbygget
```

## Netlify

Spelet kan publiceras som en **statisk React/Vite-webbplats** med en fast HTTPS-adress. Det kräver inga Netlify Functions, databaser eller hemliga miljövariabler. Det publika bygget innehåller spelet, de lokala teckensnitten och övriga webbresurser; utvecklingsverktyg och installerade agent-skills publiceras inte.

`netlify.toml` anger:

- Node.js **22** för Netlifys byggmiljö.
- Byggkommando **`npm run build`** och publiceringsmapp **`dist`**.
- SPA-fallback och svarshuvuden via `public/_redirects` och `public/_headers`, som Vite kopierar till `dist`.
- Grundläggande svarshuvuden utan att blockera inbäddade förhandsvisningar.
- Valfri Netlify-utvecklingsproxy på port 8888 framför Vite på port 5173. Vanliga Arena-förhandsvisningar kan fortfarande använda `npm run dev` direkt.

Netlifys 15 skills finns i `.agents/skills/`; `skills-lock.json` beskriver källan och versionernas innehållshashar. Netlify CLI installeras separat från spelets beroenden. Det lokala byggflödet med CLI kan kontrolleras utan molnanslutning:

```sh
npm run build:netlify   # Netlify-byggflödet, lokalt/offline; laddar inte upp något
```

Vanlig utveckling och Arena-förhandsvisning använder fortsatt **`npm run dev`**. Netlifys valfria utvecklingsproxy kan behöva hämta Edge Functions-miljön från nätet vid första start, även med CLI-flaggan `--offline`; den behövs inte för detta statiska spel. Kör inte proxyserverns Vite-instans och den vanliga Vite-servern samtidigt på port 5173. Ingen serveradapter eller Netlify-Vite-plugin krävs för statisk publicering.

### Repeterbar agentinstallation

`npm run setup:netlify` återställer verktygen i en ny arbetsmiljö. Skriptet installerar/uppdaterar Netlify-skills, kontrollerar CLI och installerar det globalt om det saknas, kontrollerar inloggningen och begär en riktig godkännandelänk vid behov. Det fortsätter sedan med lokal byggvalidering även om en tidigare åtgärd misslyckats. **Skriptet skapar ingen webbplats och publicerar ingenting.** Agenten kör det; användaren behöver inte köra terminalkommandon.

En kort statusrapport utan token eller OAuth-länkar sparas i den ignorerade `.cache/netlify-setup-status.json`. Exitkod 0 betyder att de lokala kontrollerna och inloggningen är klara; 4 betyder att webbläsargodkännande väntar; 1 betyder att någon åtgärd fortfarande är blockerad. Om anslutningen till `api.netlify.com` bryts före TLS-handskakningen kan ingen godkännandelänk skapas. Certifikatkontrollen ska inte stängas av; nätverksanslutningen måste fungera innan inloggningen kan slutföras.

### Förhandsversion via GitHub Actions

När arbetsmiljön inte når Netlifys API kan den godkända arbetsgrenen byggas på GitHubs servrar. `.github/workflows/netlify-preview.yml` är begränsad till **`arena/01a0dde8-video`** i det här repot. Den ändrar inte `main`, använder inga Netlify-kontohemligheter och skriver inte över en befintlig produktionssajt.

- En avsiktlig förhandsvisning begärs genom `.github/netlify-preview-request.json` och en commit märkt **`[netlify-preview]`**. Vanliga speländringar utlöser inte nya anonyma sajter av misstag.
- GitHub installerar beroenden, testar hanteringen av privata resultat, bygger `dist` och kör den verifierade Netlify CLI-versionen 27.10.0 med `--allow-anonymous --no-build`.
- Det är en **tillfällig** Netlify-förhandsvisning. Den måste kopplas till användarens Netlify-konto inom 60 minuter för att behållas. Netlifys eventuella förhandslösenord och ägandelänk lämnas privat till användaren.
- Länken som ger äganderätt får aldrig hamna i offentliga byggloggar. CLI-svaret krypteras med RSA-OAEP/SHA-256 och AES-256-GCM innan det sparas som en kortlivad Actions-artifact. Den krypterade behållaren kan också hämtas via GitHub-checknotiser om artifact-lagringen inte kan nås. Ett separat återhämtningsflöde hämtar en tidigare behållare utan att publicera igen. Bara mottagarens **publika** nyckel finns i Git. Den privata nyckeln förvaras utanför repot i agentens arbetsmiljö.
- Jobbet har läsrättighet till repo-innehållet och en tidsgräns på åtta minuter. Tredjepartsactions är låsta till verifierade commit-SHA:er. Ett fel ger ingen påhittad deploylänk; det privata felsvaret kan granskas av mottagaren.

SPA-regler och svarshuvuden finns i `public/_redirects` och `public/_headers`, som kopieras till `dist` vid bygget. Därmed följer de med även en anonym publicering eller ett uppladdat byggpaket. `npm run test:deploy` testar krypteringen lokalt utan någon riktig publicering.

### Nästa steg till en publicerad länk

1. Agenten kontrollerar CLI-inloggningen och skapar vid behov en Netlify-godkännandelänk. Användaren godkänner den i sin webbläsare; lösenord och API-token ska inte lämnas i chatten.
2. Välj en befintlig Netlify-webbplats eller godkänn att en ny skapas för spelet.
3. Efter användarens godkännande kan agenten publicera ett utkast från det lokala bygget. Ett Netlify-utkast har också en tillgänglig URL; produktion publiceras bara efter uttryckligt godkännande.
4. Git-baserad automatisk publicering är valfri. Appfiler och konfiguration behöver först vara committade och pushade från arbetsgrenen — en lokal, osparad Git-ändring följer inte med när Netlify klonar GitHub-repot. Ett CLI-utkast kan däremot använda arbetskatalogens aktuella bygge.

CLI-publicering görs uttryckligen från `dist`, efter ett lyckat bygge. `.netlify/` och lokala `.env`-filer är ignorerade i Git. Sparade spelframsteg ligger fortfarande i webbläsarens `localStorage`: de flyttas **inte automatiskt** från Arenas förhandsvisningsdomän till en ny Netlify-adress.

## Det går att göra

- Spela som Leif eller Billy, gå, springa och se sig omkring i en riktig Three.js-värld med kollisioner, skuggor och animerade figurer.
- Hoppa in i V40:n, köra, backa, bromsa, tuta och kliva ur. Den andra brodern följer med.
- Försöka sno kött på ICA Sörbäcken och få hem det utan att bli stoppad av Bosse.
- Gå in i huset och hämta jaktgeväret, sedan åka till jaktmarken, sikta själv och träffa tecknade älgar med synliga kulor.
- Besöka Tony, prata, slåss eller ta hans verktygslåda och komma undan.
- Jaga bort två fogdar. De kommer efter tre minuters aktiv speltid, eller direkt via uppdraget **Oväntat besök**.
- Slåss med brodern, Tony, handlaren och fogdarna. Figurerna blir yra, återhämtar sig eller springer iväg.
- Återställa hälsa med en kaffepaus vid verandan. Vid noll hälsa vaknar man hemma och förlorar 25 kr; ett pågående köttförsök avbryts.
- Följa fyra uppdrag, sätta vägpunkter och snabbresa på världskartan när man inte bär köttpåsen. Bilen följer med vid snabbresa bara om man sitter i den.
- Pausa, byta grafikkvalitet, slå på bakgrundsmusik och spelljud med separata volymer och spela med touchknappar.

## Kontroller

| Knapp | Funktion |
| --- | --- |
| WASD / piltangenter | Gå eller kör; med höjt gevär flyttar piltangenterna siktet |
| Shift | Spring |
| E | Interagera med dörrar, kyl, trappa, dator, gevär, prat eller fika; vid en älg ta fram siktet / lägg ner geväret |
| Q / högerklick / Sikta | Ta fram eller lägg ner jaktgeväret, utomhus till fots |
| Mus / peka och dra / piltangenter | Placera siktet när geväret är framme för att låsa upp Skjut |
| Vänsterklick / Skjut | Avfyra en kula i den valda riktningen |
| F | Skjut med höjt, manuellt siktat gevär; annars slå när du är nära någon; tuta i bilen |
| V | Byt bror |
| Mellanslag | Skjut när du siktar; bromsa i bilen |
| H | Tuta |
| M | Världskarta |
| I | Uppdrag |
| Esc | Paus / stäng meny |
| Dra med musen | Rotera kameran |
| Scrolla | Zooma |

Touchkontroller visas automatiskt på pekskärmar efter spelstart. De går också att aktivera i **Spelguide**. Håll en pil och glid med tummen för att ändra riktning; mitten stannar. Håll inne touchknappen **Spring** med andra fingret för att springa; i bilen är samma knapp en broms. Välj **Lagom** under Inställningar för lägre upplösning och utan dynamiska skuggor på långsammare enheter.

## Sparning

Pengar, uppdragssteg, vald bror, jaktgevär, köttpåse och verktygslåda sparas automatiskt i webbläsarens `localStorage` under `lillasen-adventure-v1`. Nytt dataformat är version 3 med `hasRifle`, men använder samma nyckel och läser också version 1 och 2. Vid migrering bevaras pengar, övriga uppdrag och redan avklarad jakt. En oavklarad jakt utan gevär återgår till det nya första steget (hämta geväret), utan att ge eller dra någon belöning. Ingen server, inga konton och inga externa API:er behövs.

En ny session börjar på gården. En sparad köttpåse kan levereras där när spelet återupptas; ett pågående fogdebesök startas om. Spelvärlden och tiden pausas när en meny är öppen. **Inställningar → Börja om** raderar sparningen efter bekräftelse.

## Verifiering

Tio end-to-end-tester använder det vanliga gränssnittet och tangentbordet, inte spelmotorns interna tillstånd:

1. **Grundspelet:** gevärshämtning i huset, V40-körning, byte av bror, jakt, Tony, båda fogdarna, belöningar, paus, sparning, mobil layout, touchkontroller och återställning.
2. **Sörbäcken:** butikens entré och interiör, stöldförsök med båda bröderna, upptäckt och återförsök, spärrad snabbresa med köttet, en riktig flykt till fots genom världen, leverans/belöning, fyra uppdragskort på mobil och migrering av en version-1-sparning.
3. **Hus och gevär:** jakt utan gevär nekas, bilåkning hoppar inte över hämtningen, fysisk entré/hämtning/utgång, båda bröderna, jaktbelöning, kvarvarande utrustning efter omladdning, tomt ställ, återställning, mobil E-knapp och migrering från sparformat 1/2. Testernas gånghjälp använder WASD och de skrivskyddade kartkoordinaterna i gränssnittet – den ändrar inte spelmotorns tillstånd.

4. **Gammal inredning:** husets gångvägar och soffkollision, kylskåpets öppna/stängda läge med båda bröderna, paus, mobil E-knapp, Kalles-visning, fortsatt gevärshämtning/jakt, omladdning och återställning.

5. **Övervåning och gurka:** kylens nya innehåll, dörrpassager, animerad trappa och paus mitt i trappan, separat våningshöjd, datorns strömbrytare, brorbyte på övervåningen, mobil E-knapp, nedgång, fortsatt gevärshämtning/jakt, omladdning och återställning från Billys rum.

6. **Bakgrundsmusik:** riktigt Web Audio kontrolleras för hörbar signal, 32 takter, säker ljudnivå och loopskarv. Gränssnittstester verifierar inget autoplay, separata volymreglage, upprepade av/på-klick, dämpning vid ett samtal med brodern, flikpaus, avbruten uppstart vid stängning, mobilkontroller, återställning och omladdning.

7. **Pekskärm:** riktiga flerpunkts-touchhändelser via Chromium/CDP verifierar jämn förflyttning, stopp vid släpp, tumdrag/diagonaler, spring med två fingrar, oberoende lyft, kamerans fingerlås, avbrutna gester, paus, fokusförlust, storleksändring, stopp mot hinder, V40-gas/broms, E och brorbyte. Enhetstester kontrollerar inmatningsägare och kontinuerlig animation.

8. **Sikte och kulor:** ändlig flygtid, svepta kollisioner (inga genomskjutna hinder vid låg bildfrekvens), vägg/träd/person framför eller bakom älgen, ingen målsökning, riktig gevärshämtning, utebliven E-autoträff, avsiktlig bom utan belöning, paus mitt i skottet, faktisk träff/belöning, Billys pekskärmssikte, Skjut-knappen, oförändrad kamerariktning vid siktgest, sparning och rensning vid resa. De äldre jakttesterna använder också riktig siktning/skjutning.

9. **Sikta före skott:** skjutknapp/F/mellanslag är låsta tills siktet placerats, F skjuter utan att sänka geväret, piltangenter siktar utan att flytta figuren/kameran, touchens vanliga F-knapp ger ett synligt skott och riktig träff, samt återgång till slagsmål när geväret sänks. Ett normalt sparformat-3-testfall representerar ett redan hämtat gevär; fysisk hämtning kontrolleras separat i skjuttestet.

10. **Grafik:** shader-/webbläsarfel, båda kvalitetslägena, deterministiska texturer, utåtriktade normala grenytor, dekorativa skuggor utan träffyta, Billys orangea rygg, blå V40-lack och ingen återinförd gungning. Desktop-/mobilbilder, rätt sjönamn, stora touchytor, fysisk hus-/kyl-/gevärsinteraktion och ett siktat skott verifieras via gränssnittet.

```sh
npx playwright install chromium  # en gång
npm run dev                     # i en separat terminal
npm run test:smoke
npm run test:shop
npm run test:rifle
npm run test:home
npm run test:upstairs
npm run test:music
npm run test:touch
npm run test:shooting
npm run test:aim
npm run test:graphics
```

Miljövariabler för testerna:

- `TEST_URL`: annan serveradress än `http://localhost:5173`.
- `CHROMIUM_EXECUTABLE`: använd en redan installerad Chromium-binär.
- `SCREENSHOTS=1`: grundtestet sparar en mobilskärmbild, gevärstestet sparar hus-, utrustnings- och mobilbilder och inrednings- och övervåningstesterna sparar rum, kyl, trappa, dator och mobilläge; grafiktestet sparar också startvy, gård, sjö, inställningar och jakt i den git-ignorerade mappen `screenshots/`.

## Struktur

- `src/visual-refresh.css` — grafikuppdateringens palett, paneler, typografi och mobil-HUD.
- `src/game/look.ts` — lokala yttexturer, trädkronor, gräs, blommor, icke-interaktiva markskuggor, himmel och reflexkarta.
- `src/App.tsx` — svenskt gränssnitt, HUD, menyer, dialoger och tillgänglighet.
- `src/game/hunting.ts` — synliga projektiler, flygtid, närmaste fysiska träff, blockerande omgivning och rensning.
- `src/components/HuntingControls.tsx` — sikte, träff/bom-status och separata Sikta/Skjut-knappar för mus och pekskärm.
- `src/game/camera.ts` — stabil följkamera utan dubbel eftersläpning.
- `src/game/input.ts` — åtskilda tangentbords-/fingerkommandon och riktningskontrollens dödzon.
- `src/components/TouchControls.tsx` — fingerlås, tumdrag, diagonaler, touchknappar och säker avslutning av gester.
- `src/game/engine.ts` — spel-loop, styrning, kamera, NPC:er, butiksrisk, uppdrag och sparning.
- `src/game/world.ts` — terräng, skog, byggnader, rekvisita och kollisionskroppar.
- `src/game/characters.ts` — detaljerade, animerade figurmodeller och matkasse.
- `src/game/vehicles.ts` — V40-kaross, fönster, hjul och bromsljus.
- `src/game/home.ts` – möblerad husinteriör och ställ med ett hämtbart gevär; ytterhuset växlar till en öppen genomskärning vid inträde.
- `src/game/furniture.ts` — gamla soffor, tjock-tv, diskho med disk, öppningsbar kyl, Kalles-tub och egenritade material.
- `src/game/upstairs.ts` — gammal trätrappa, trappöppning, Billys sovrum, separat övervåningskollision och den på-/avslagningsbara retrodatorn.
- `src/game/equipment.ts` – återanvändbar stiliserad gevärsmodell för stället och brödernas utrustning.
- `src/game/shop.ts` — den fiktiva ICA-butiken, inredning och köttpaket.
- `src/game/models.ts` — hus, älgar, ved och övriga modeller.
- `src/game/primitives.ts` — återanvändbara former, rundade geometrier, material och skyltar.
- `src/game/optimize.ts` — sammanfogning av statisk geometri för färre draw calls.
- `src/game/audio.ts` — separata Web Audio-bussar för spelljud och musik, flikpaus och dialogdämpning.
- `src/game/music.ts` — den egenkomponerade melodin Myrstigen, instrumentsyntes, sömlös loop och mjuk volymstyrning.
- `src/components/` — egenritade porträtt, minikarta och interaktiv världskarta.

Alla 3D-modeller och illustrationer byggs i koden. Teckensnitt följer med bygget. Inga fjärrbilder, ljudfiler eller SVT-logotyper används.
