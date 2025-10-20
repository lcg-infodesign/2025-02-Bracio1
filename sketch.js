// sketch.js
// Autoritratti algoritmici — versione psichedelica anni '70
// Carica il tuo "asset/dataset.csv" con header column0..column4

// NOTE: qui sotto sono aggiunti commenti dettagliati in italiano per ogni parte del file,
// spiegando il ruolo di variabili, funzioni e i passaggi più complessi.
// I commenti non modificano il funzionamento, aiutano solo la comprensione.

let table;            // contiene i dati caricati dal CSV
let nRows;            // numero di righe del dataset
let colMins = [],     // array per i minimi di ciascuna colonna (usato per normalizzare)
    colMaxs = [];     // array per i massimi di ciascuna colonna (usato per normalizzare)

/*
 preload: viene chiamata da p5.js prima di setup per caricare risorse sincrone.
 Qui carichiamo la tabella CSV con header. Se il file non esiste il console.log mostrerà errori.
*/
function preload() {
  table = loadTable("asset/dataset.csv", "csv", "header");
}

/*
 setup: inizializzazione del canvas e layout a griglia.
 - Calcoliamo estensioni delle colonne (min/max) per poi normalizzare i valori.
 - Determiniamo la griglia (colonne/righe) in base alla larghezza della finestra e alla dimensione di ogni item.
 - Creiamo il canvas di altezza sufficiente per contenere tutti gli item.
 - Renderizziamo ogni glifo (faccina) passando i dati normalizzati alla funzione drawGlyph.
*/
function setup() {
  // calcola min/max per ogni colonna; serve prima di normalizzare nel loop principale
  calculateColumnExtents();

  // numero di righe del dataset
  nRows = table.getRowCount();

  // parametri di layout:
  let outer = 30;          // margine esterno a sinistra/destra/sopra/sotto
  let padding = 18;        // spazio tra gli item nella griglia
  let itemSize = 110;      // dimensione di riferimento di ogni item (puoi modificarla)

  // calcolo del numero di colonne: almeno 4, ma aumenta con la larghezza della finestra
  // floor(...) calcola quante colonne entrano, max(4, ...) garantisce minimo 4
  let cols = max(4, floor((windowWidth - outer * 2) / (itemSize + padding)));
  // calcolo di quante righe servono per contenere nRows elementi
  let rows = ceil(nRows / cols);

  // altezza totale necessaria: margini + righe * itemSize + spazi intermedi
  let totalH = outer * 2 + rows * itemSize + (rows - 1) * padding;

  // creazione canvas: larghezza finestra, altezza minima tra windowHeight e totalH
  createCanvas(windowWidth, max(windowHeight, totalH));

  // impostazioni visive iniziali
  background(18, 14, 30); // sfondo scuro per mettere in evidenza colori vivaci
  angleMode(DEGREES);     // lavoriamo in gradi per rotate()
  rectMode(CENTER);       // rettangoli disegnati dal centro (utile per posizionare gli elementi)
  noLoop();               // disegno statico (no draw loop continuo)

  // palette base: array di palette, ogni palette è un array di 4 colori (stringhe hex)
  let basePalettes = [
    ['#FF6B6B','#FFE66D','#4ECDC4','#1A535C'],
    ['#ff9f1c','#2ec4b6','#e71d36','#f9c74f'],
    ['#ff6f91','#845ec2','#ffc75f','#2b2d42'],
    ['#00bcd4','#ff5722','#ffd700','#8e44ad']
  ];

  // variabili per navigare la griglia mentre disegniamo gli elementi
  let colCount = 0;
  let rowCount = 0;
  let idx = 0;

  // per ogni riga del dataset creiamo un glifo nella posizione corrispondente
  for (let r = 0; r < nRows; r++) {
    // otteniamo la riga come oggetto { column0: "val", ... } usando .obj (più comodo)
    let data = table.getRow(r).obj;

    // calcolo della posizione del centro dell'item nella griglia
    let x = outer + colCount * (itemSize + padding) + itemSize/2;
    let y = outer + rowCount * (itemSize + padding) + itemSize/2;

    // scelta della palette: ciclica, legata all'index r (pseudo-deterministica)
    let pal = basePalettes[(r % basePalettes.length)];

    // isolamento del contesto di disegno per ciascun item
    push();
    translate(x, y);

    // estraiamo i valori numerici raw della riga in un array (float)
    // ATTENZIONE: l'ordine deve corrispondere a ["column0","column1",...]
    let vals = [
      float(data["column0"]),
      float(data["column1"]),
      float(data["column2"]),
      float(data["column3"]),
      float(data["column4"])
    ];

    // normalizziamo ogni valore rispetto al min/max della colonna (range 0..1)
    // se max==min (dati costanti) restituiamo 0.5 come valore neutro
    let norm = vals.map((v, i) => {
      let mn = colMins[i];
      let mx = colMaxs[i];
      if (mx === mn) return 0.5; // evitare divisione per zero
      return constrain((v - mn) / (mx - mn), 0, 1);
    });

    // disegno del glifo (dimensione presa da itemSize * 0.9)
    // passiamo sia valori normalizzati che raw per decisioni stilistiche
    drawGlyph(norm, vals, itemSize * 0.9, r, pal);

    pop();

    // avanza la posizione nella griglia
    colCount++;
    if (colCount == cols) {
      colCount = 0;
      rowCount++;
    }

    idx++;
  }

  // sovrappongo una texture leggera per l'effetto psichedelico (linee curve)
  drawPsychedelicOverlay();
}

/*
 calculateColumnExtents:
 - legge ogni colonna (column0..column4) dal table e ne calcola min e max.
 - salva i risultati in colMins e colMaxs agli stessi indici delle colonne.
 Questo permette la normalizzazione dei valori riga per riga.
*/
function calculateColumnExtents() {
  let columns = ["column0","column1","column2","column3","column4"];
  for (let i = 0; i < columns.length; i++) {
    // getColumn restituisce array di stringhe, .map(float) li converte in numeri
    let col = table.getColumn(columns[i]).map(v => float(v));
    colMins[i] = min(col); // minimo della colonna i
    colMaxs[i] = max(col); // massimo della colonna i
  }
}

// -------------------------------------------
// drawGlyph: la funzione che genera 1 glifo (un "volto" astratto/psichedelico)
// parametri:
// - norm: array di 5 valori normalizzati (0..1) usati per modulare forme/size/rotazioni
// - raw: array dei 5 valori originali (possono essere usati per calcoli di parità o offset)
// - size: diametro di riferimento per il glifo
// - idx: indice della riga (0..n-1), utile come seed per rumore/variazioni
// - pal: palette di 4 colori (array di stringhe hex)
function drawGlyph(norm, raw, size, idx, pal) {
  // sommiamo i valori raw arrotondati per decidere una 'parità' visiva:
  // questa scelta permette alternanza di colori/elementi in modo deterministico.
  let sumRounded = raw.reduce((a,b)=>a + round(b), 0);
  let parity = (abs(sumRounded) % 2 === 0) ? 'even' : 'odd';

  // convertiamo i 4 colori della palette in oggetti p5.Color
  let bg = color(pal[0]);
  let accent = color(pal[1]);
  let accent2 = color(pal[2]);
  let strokeCol = color(pal[3]);

  // se la parità è 'odd' invertiamo alcune scelte cromatiche per ottenere alternanza
  // lerpColor(accent, accent2, 0.4) crea una miscela tra due colori
  if (parity === 'odd') {
    bg = color(lerpColor(accent, accent2, 0.4));
    accent = color(pal[2]);
    accent2 = color(pal[0]);
    strokeCol = color(255, 245, 235); // colore chiaro per i tratti su sfondo scuro
  }

  // decimalFlags: segnala quando la parte frazionaria del valore normalizzato * 10 è significativa
  // questa informazione genera "puntini/segni" decorativi legati alla granularità del dato
  let decimalFlags = norm.map(v => (fract(v * 10) > 0.5));

  // Wobble: uso del rumore (noise) per una leggera rotazione organica. noise(idx * 0.1) è
  // deterministico e produce valori coerenti per indice simile.
  let wobble = map(noise(idx * 0.1), 0, 1, -8, 8);
  rotate(wobble);

  // scale generale del glifo basata su norm[0] (effetto di "peso" o "dimensione personale")
  let s = map(norm[0], 0, 1, 0.85, 1.25);
  scale(s);

  // disegno della "testa" principale: uso di ellipse + rect per ottenere una forma morbida
  noStroke();
  push();
  fill(bg);
  // l'altezza dell'ellisse è modulata da norm[1] (più dinamismo)
  ellipse(0, 0, size * 0.9, size * map(norm[1], 0.7, 1.2, 0.7, 1.3));
  // rotazione aggiuntiva basata su norm[2] per dare inclinazione
  rotate(map(norm[2], 0, 1, -25, 25));
  fill(accent);
  // "frangia" o dettaglio sopra la testa: un rettangolo smussato
  rect(0, -size * 0.06, size * 0.6, size * 0.18, 18);
  pop();

  // overlay cubist pieces: pezzi geometrici intorno alla testa per dare struttura
  push();
  let pieces = int(map(norm[3], 0, 1, 2, 6)); // numero di pezzi variabile
  for (let p = 0; p < pieces; p++) {
    // angolazione di ciascun pezzo: distribuiamo intorno al cerchio e aggiungiamo una variazione legata a norm[4]
    let a = p * (360 / pieces) + (norm[4] * 90);
    push();
    rotate(a);
    // translate spostato in base a rumore per evitare disposizione troppo regolare
    translate(size * map(noise(idx + p*0.3), 0, 1, -0.12*size, 0.38*size), 0);
    fill(lerpColor(accent, accent2, p / pieces)); // sfumatura per ogni pezzo
    // alterniamo rettangolo/triangolo per varietà
    if (p % 2 === 0) rect(0, 0, size * 0.18, size * 0.28, 8);
    else triangle(-size*0.12, size*0.12, size*0.12, size*0.12, 0, -size*0.12);
    pop();
  }
  pop();

  // occhi: tre stili diversi selezionati usando una combinazione di norm[0] e norm[1]
  push();
  let eyeType = (round(norm[0]*10) + round(norm[1]*10)) % 3; // 0,1,2 => tre varianti
  let eyeOffsetX = size * map(norm[0], 0, 1, 0.18, 0.32);    // distanza orizzontale occhi
  let eyeY = -size * map(norm[2], 0, 1, 0.08, 0.18);          // posizione verticale occhi

  if (eyeType === 0) {
    // occhi tondi: uso del colore strokeCol per contrasto
    fill(strokeCol);
    ellipse(-eyeOffsetX, eyeY, size * 0.08, size * 0.08);
    ellipse(eyeOffsetX, eyeY, size * 0.08, size * 0.08);
  } else if (eyeType === 1) {
    // occhi a linee: uso stroke e peso variabile
    stroke(strokeCol);
    strokeWeight(map(norm[3], 0, 1, 2, 6));
    line(-eyeOffsetX - 6, eyeY, -eyeOffsetX + 6, eyeY);
    line(eyeOffsetX - 6, eyeY, eyeOffsetX + 6, eyeY);
    noStroke();
  } else {
    // occhi rettangolari colorati con accent2
    fill(accent2);
    rect(-eyeOffsetX, eyeY, size*0.12, size*0.06, 6);
    rect(eyeOffsetX, eyeY, size*0.12, size*0.06, 6);
  }
  pop();

  // bocca: la forma varia (sorriso/curvatura o zigzag) in base alla parity e ai valori
  push();
  let mouthBaseY = size * 0.25; // posizione verticale della bocca rispetto al centro
  let mouthW = size * map(norm[3], 0, 1, 0.18, 0.56); // larghezza della bocca basata su norm[3]
  let mouthExpression = raw[3]; // raw[3] può essere usato per parità/segno
  stroke(strokeCol);
  strokeWeight(map(norm[2], 0, 1, 2, 6)); // spessore tratti bocca modulato da norm[2]
  noFill();

  // se il valore arrotondato di raw[3] è pari usiamo arc (sorriso/curvatura),
  // altrimenti disegniamo un zigzag (più "energetico")
  if ((round(raw[3]) % 2) === 0) {
    // curvatura calcolata da norm[4] mappata in un range che può essere negativo/positivo
    let curv = map(norm[4], 0, 1, -1.2, 1.2);
    // se curv >= 0 disegniamo arco "convesso" (sorriso), altrimenti arco "concavo" (tristezza/inclinazione)
    if (curv >= 0) {
      // arc(x, y, w, h, start, stop) con angoli in gradi (DEGREES)
      arc(0, mouthBaseY, mouthW, mouthW * 0.4, 0, 180 * curv);
    } else {
      // arco invertito
      arc(0, mouthBaseY, mouthW, mouthW * 0.4, 180, 180 + 180 * curv);
    }
  } else {
    // zigzag: numero di denti modulato da norm[4], costruzione con beginShape/vertex
    let zig = int(map(norm[4], 0, 1, 3, 7));
    let step = mouthW / (zig - 1);
    beginShape();
    for (let z = 0; z < zig; z++) {
      let px = -mouthW/2 + z * step;
      // alterniamo sopra/sotto la baseline per ottenere zigzag; ampiezza modulata da norm[2]
      let py = mouthBaseY + (z % 2 === 0 ? -map(norm[2],0,1,2,10) : map(norm[2],0,1,2,10));
      vertex(px, py);
    }
    endShape();
  }
  pop();

  // segni decorativi (puntini/virgole): generati in base a decimalFlags
  // i segni sono orientati e posizionati attorno alla testa per effetto ornamentale
  for (let k = 0; k < decimalFlags.length; k++) {
    if (decimalFlags[k]) {
      push();
      // rotazione e traslazione per posizionare il segno in modo distribuito
      rotate(k * 28 + norm[k] * 80);
      translate(map(k,0,4,-size*0.45,size*0.45), -size*0.48);
      fill(lerpColor(accent, strokeCol, 0.5));
      // stili differenti a seconda dell'indice della colonna
      if (k % 2 === 0) ellipse(0,0, size*0.06, size*0.06);
      else rect(0,0, size*0.08, size*0.04, 6);
      pop();
    }
  }

  // contorni ondulati (rings) per effetto movimento/psichedelia
  push();
  stroke(255, 255, 255, 120); // bianco semi-trasparente
  strokeWeight(map(norm[0], 0, 1, 0.6, 3)); // peso tratti modulato da norm[0]
  noFill();
  let rings = int(map(norm[1], 0, 1, 1, 4)); // numero di anelli attorno alla testa
  for (let rr = 0; rr < rings; rr++) {
    // dimensione dell'anello basata su rr (dal più piccolo al più grande)
    let rsize = size * map(rr, 0, rings, 0.6, 1.6);
    // beginShape + curveVertex permette contorni morbidi; usiamo sin per ondulazione
    beginShape();
    for (let a = 0; a < 360; a += 14) {
      // rad è modulato dalla funzione sin per creare piccole ondulazioni
      // raw[0] e idx vengono usati per variare la forma in base ai dati e all'indice
      let rad = rsize * (1 + 0.06 * sin(a * 3 + raw[0] * 7 + idx));
      let vx = cos(a) * rad;
      let vy = sin(a) * rad;
      curveVertex(vx, vy);
    }
    endShape(CLOSE);
  }
  pop();

  // piccolo "collare" geometrico che dà coerenza tra i glifi
  push();
  rotate(8 * (norm[2] - 0.5)); // lieve rotazione basata su norm[2]
  fill(lerpColor(accent, accent2, 0.3));
  rect(0, size*0.52, size*0.28, size*0.12, 10);
  pop();
}

// helper: fractional part
// restituisce la parte frazionaria assoluta di v, usata per decidere flag decorativi
function fract(v) {
  return abs(v - floor(v));
}

/*
 drawPsychedelicOverlay:
 Disegna una texture leggera in overlay costituita da curve orizzontali ondulate.
 - Il colore delle linee è modulato da sin/cos per variare tonalità lungo l'asse y.
 - L'alpha è bassa (12) per non sovraccaricare il disegno principale.
*/
function drawPsychedelicOverlay() {
  push();
  translate(0,0);
  noFill();
  strokeWeight(1.2);
  for (let y = 0; y < height; y += 18) {
    // attenzione: qui usiamo valori numerici nel range previsto da p5 per stroke(r,g,b,a)
    // la funzione sin/cos restituisce valori -1..1, li mappiamo con moltiplicatori e offset
    stroke((sin(y*0.02)*80)+180, (cos(y*0.015)*60)+150, (sin(y*0.03)*90)+140, 12);
    beginShape();
    for (let x = 0; x <= width; x += 12) {
      let vy = y + 8 * sin((x + y) * 0.02); // ondulazione funzione seno
      curveVertex(x, vy);
    }
    endShape();
  }
  pop();
}

/*
 mousePressed:
 - Individua quale glifo è stato cliccato calcolando colonna/row in base al layout usato in setup.
 - Se il click è all'interno dell'area di un glifo, crea una tooltip HTML che mostra il contenuto
   della riga (nome colonna: valore) e la rimuove automaticamente dopo 3 secondi.
 - I ritorni di funzione (return) proteggono da click fuori dalla griglia o fuori dall'area centrale.
*/
function mousePressed() {
  // parametri identici a quelli usati in setup: devono corrispondere al layout visualizzato
  let outer = 30;
  let padding = 18;
  let itemSize = 110;
  let cols = max(4, floor((windowWidth - outer * 2) / (itemSize + padding)));

  // calcola la colonna e la riga dove è avvenuto il click (coordinate di griglia)
  let col = floor((mouseX - outer) / (itemSize + padding));
  let row = floor((mouseY - outer) / (itemSize + padding));
  // se siamo fuori range (click nei margini) usciamo
  if (col < 0 || row < 0) return;

  // indice della riga del dataset corrispondente alla posizione in griglia
  let idx = row * cols + col;
  // controllo che l'indice sia valido
  if (idx < 0 || idx >= nRows) return;

  // Verifica più precisa: controlliamo che il click cada dentro il quadrato
  // centrato su centerX/centerY con dimensione itemSize (ricordare rectMode(CENTER))
  let centerX = outer + col * (itemSize + padding) + itemSize / 2;
  let centerY = outer + row * (itemSize + padding) + itemSize / 2;
  if (mouseX < centerX - itemSize/2 || mouseX > centerX + itemSize/2) return;
  if (mouseY < centerY - itemSize/2 || mouseY > centerY + itemSize/2) return;

  // otteniamo la riga come oggetto e costruiamo un HTML semplice con "colonna: valore"
  let rowObj = table.getRow(idx).obj;
  let entries = Object.entries(rowObj);
  // messageHTML contiene tutte le coppie "header: value" separate da <br/>
  let messageHTML = entries.map(([k, v]) => `<strong>${k}:</strong> ${v}`).join('<br/>');

  // log su console per debug (utile durante sviluppo)
  console.log('Riga', idx + 1, rowObj);

  // Creazione di una tooltip HTML (createDiv è di p5.dom). La posizioniamo vicino al mouse.
  let d = createDiv('');
  d.position(mouseX + 8, mouseY + 8);
  d.style('background', 'rgba(0,0,0,0.85)');
  d.style('color', '#fff');
  d.style('padding', '6px 10px');
  d.style('border-radius', '6px');
  d.style('font-family', 'monospace');
  d.style('z-index', '10000');
  d.style('max-width', '420px');      // limite larghezza per non uscire dallo schermo
  d.style('white-space', 'pre-wrap'); // mantiene gli a-capo se presenti
  d.html(messageHTML);                // inserisce il contenuto HTML costruito sopra

  // rimuove la tooltip dopo 3 secondi per evitare accumulo di elementi DOM
  setTimeout(() => d.remove(), 3000);
}

