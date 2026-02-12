# Algoritmo Meal Solver – Documentazione analitica

## 1. Obiettivo

Dati:
- **Target del pasto**: \( T_{\text{kcal}}, T_{\text{C}}, T_{\text{P}}, T_{\text{F}} \) (kcal, carboidrati, proteine, grassi in grammi)
- **\( n \) alimenti** (solo quelli “liberi”, esclusi quelli a quantità fissa), ciascuno con valori **per 100 g**: \( k_j, c_j, p_j, f_j \)

Si cercano le **quantità in grammi** \( x_1, \ldots, x_n \geq 0 \) che minimizzano l’errore rispetto al target, con priorità calorie > proteine > ripartizione > carb/grassi.

---

## 2. Modello lineare

I totali del pasto sono (con \( x_j \) in grammi):

\[
\text{kcal} = \frac{1}{100} \sum_{j=1}^{n} k_j x_j, \quad
\text{C} = \frac{1}{100} \sum_{j} c_j x_j, \quad
\text{P} = \frac{1}{100} \sum_{j} p_j x_j, \quad
\text{F} = \frac{1}{100} \sum_{j} f_j x_j.
\]

In forma matriciale, con \( \mathbf{x} = (x_1,\ldots,x_n)^T \):

\[
\frac{1}{100} A \mathbf{x} = \mathbf{b}_{\text{target}},
\quad
A = \begin{bmatrix} k_1 & \cdots & k_n \\ c_1 & \cdots & c_n \\ p_1 & \cdots & p_n \\ f_1 & \cdots & f_n \end{bmatrix},
\quad
\mathbf{b} = \begin{bmatrix} T_{\text{kcal}} \\ T_{\text{C}} \\ T_{\text{P}} \\ T_{\text{F}} \end{bmatrix}.
\]

Quindi il sistema lineare usato nel codice è (in unità “scalate”):

\[
A \mathbf{x} = 100 \cdot \mathbf{b}.
\]

---

## 3. Funzione di costo (Weighted Least Squares)

Si minimizza:

\[
\text{Costo} = 100\, E_{\text{kcal}}^2 + 80\, E_{\text{P}}^2 + 40\, E_{\text{C}}^2 + 40\, E_{\text{F}}^2 + 20\cdot F_{\text{dist}},
\]

dove:
- \( E_{\text{kcal}} = (1/100)\sum_j k_j x_j - T_{\text{kcal}} \), e analogamente per C, P, F
- \( F_{\text{dist}} = \sum_{i=1}^{n} (x_i - \bar{x})^2 \), con \( \bar{x} = \frac{1}{n}\sum_i x_i \) (varianza delle quantità, per “ripartizione democratica”).

I primi quattro termini sono il **WLS** (Weighted Least Squares):

\[
\| W (A\mathbf{x} - \mathbf{b}_{\text{scaled}}) \|^2, \quad \mathbf{b}_{\text{scaled}} = 100\cdot \mathbf{b},
\]

con matrice dei pesi **diagonale** \( W = \text{diag}(w_1,w_2,w_3,w_4) \) tale che \( w_r^2 \) sia il coefficiente del quadrato dell’errore del rispettivo vincolo:

| Vincolo | Coefficiente nel costo | Peso \( w_r \) |
|--------|-------------------------|-----------------|
| Kcal   | 100                     | \( \sqrt{100} = 10 \) |
| Carb  | 40                      | \( \sqrt{40} \) |
| Prot  | 80                      | \( \sqrt{80} \) |
| Fat   | 40                      | \( \sqrt{40} \) |

Ordine delle righe in \( A \) nel codice: **riga 0 = kcal, 1 = carb, 2 = prot, 3 = fat**. Quindi:

\[
W^2 = (100,\, 40,\, 80,\, 40)^T \quad \text{(in ordine [kcal, carb, prot, fat])}.
\]

Nel codice:  
`WEIGHTS = [10, Math.sqrt(40), Math.sqrt(80), Math.sqrt(40)]`.

---

## 4. Equazioni normali con termine di distribuzione

Il minimo del costo (senza vincoli di non negatività) si ottiene risolvendo:

\[
\big( A^T W^2 A + 20\, (I - \tfrac{1}{n}\mathbf{1}\mathbf{1}^T) \big) \mathbf{x} = A^T W^2 \mathbf{b}_{\text{scaled}}.
\]

Dove:
- \( A^T W^2 A \): matrice \( n \times n \) delle equazioni normali WLS
- \( I - \tfrac{1}{n}\mathbf{1}\mathbf{1}^T \): matrice centrata (varianza delle \( x_i \)); il termine \( 20 \cdot (\ldots) \) penalizza quantità molto sbilanciate tra alimenti.

Elementi di \( A^T W^2 A \):

\[
(A^T W^2 A)_{ij} = \sum_{r=0}^{3} A_{r,i}\, W^2_r\, A_{r,j}.
\]

Elementi del termine di distribuzione (con \( \alpha = 20 \), \( \nu = 1/n \)):

\[
\alpha\cdot (I - \nu\mathbf{1}\mathbf{1}^T)_{ij} = \begin{cases}
20(1 - \nu) & \text{se } i = j, \\
-20\nu & \text{se } i \neq j.
\end{cases}
\]

Nel codice:  
`AtW2A[i][j] += 20 * (i === j ? 1 - oneOverN : -oneOverN)`.

---

## 5. Vincolo di non negatività e priorità calorie

L’algoritmo non risolve un NNLS vero e proprio; fa in sequenza:

1. **Risolvere** il sistema lineare (WLS + distribuzione) e ottenere \( \mathbf{x} \).
2. **Clamp**: \( x_j \leftarrow \max(0, x_j) \) per ogni \( j \).
3. **Scala per le kcal**:  
   \( \text{totKcal} = (1/100)\sum_j k_j x_j \),  
   se \( \text{totKcal} > 0 \): \( \lambda = T_{\text{kcal}} / \text{totKcal} \), poi \( x_j \leftarrow \max(0, \lambda\, x_j) \).

In questo modo le quantità restano \( \geq 0 \) e il totale kcal viene portato esattamente al target (quando possibile), mantenendo le proporzioni della soluzione WLS.

---

## 6. Alimenti “bloccati”

Se alcuni alimenti hanno **quantità fissa** (es. 1 uovo = 50 g):

- Si lavora solo sugli indici **liberi** e si costruisce \( A_{\text{free}} \) (4 righe × n_free colonne) e il vettore dei target **residui**:
  \[
  b_{\text{scaled},r} = 100\cdot T_r - \sum_{\text{locked } i} \frac{g_i}{100}\cdot (\text{nutriente}_r)_i \cdot 100.
  \]
- Il solver calcola le quantità solo per gli alimenti liberi; le quantità bloccate non entrano nel sistema, ma contribuiscono ai totali finali.

---

## 7. Arrotondamento

Dopo aver ottenuto \( x_1,\ldots,x_n \):

\[
x_j \leftarrow \max\big(0,\; \text{round}(x_j / 5)\cdot 5\big).
\]

Step fisso **5 g** per tutte le quantità (codice: `ROUND_STEP = 5`).

---

## 8. Match score (precisione 0–100)

Dati i totali effettivi del pasto \( (A_{\text{kcal}}, A_{\text{C}}, A_{\text{P}}, A_{\text{F}}) \) e i target \( (T_{\text{kcal}}, T_{\text{C}}, T_{\text{P}}, T_{\text{F}}) \):

- Errori relativi (con protezione per target = 0):
  \[
  e_{\text{kcal}} = \frac{|A_{\text{kcal}} - T_{\text{kcal}}|}{\max(T_{\text{kcal}},1)}, \quad
  e_{\text{C}}, e_{\text{P}}, e_{\text{F}} \text{ analoghi (solo se } T_r > 0\text{)}.
  \]
- Score parziali:
  \[
  \text{scoreKcal} = \max(0, 1 - e_{\text{kcal}})\cdot 100,
  \quad
  \text{scoreMacro} = \max\left(0, 1 - \frac{e_{\text{C}}+e_{\text{P}}+e_{\text{F}}}{3}\right)\cdot 100
  \]
  (se tutti i macro target sono 0, scoreMacro = 100).
- **Match score**:
  \[
  \text{matchScore} = \text{round}\big(0.6\cdot \text{scoreKcal} + 0.4\cdot \text{scoreMacro}\big).
  \]

Se matchScore < 80 si mostra “Configurazione sbilanciata (Precisione: X%)” e si può segnalare il macro “mancante”.

---

## 9. Macro mancante (per suggerimenti)

Si calcolano i **deficit** (solo se positivi):

\[
d_{\text{C}} = T_{\text{C}} - A_{\text{C}}, \quad
d_{\text{P}} = T_{\text{P}} - A_{\text{P}}, \quad
d_{\text{F}} = T_{\text{F}} - A_{\text{F}}.
\]

Si filtrano i macro con \( d > 1 \); tra questi si sceglie quello con **deficit massimo** come “macro mancante” (es. per il pulsante “Mancano carboidrati. Aggiungi Riso/Pasta?”).

---

## 10. Pseudocodice complessivo

```
INPUT: target (T_kcal, T_C, T_P, T_F), foods[] con eventuali fixedGrams

1. Separa indici locked / free.
2. Se n_free == 0:
   - Calcola totali dalle sole quantità fisse, matchScore, missingMacro.
   - Ritorna risultato (senza ottimizzazione).
3. Costruisci b_scaled = 100 * target e sottrai il contributo degli alimenti locked.
4. Costruisci A_free (4 × n_free): colonna j = [k_j, c_j, p_j, f_j] per 100 g dell’alimento j libero.
5. W² = [100, 40, 80, 40]  (ordine kcal, carb, prot, fat).
6. Q = A_free' * W² * A_free   (normali WLS).
7. Aggiungi a Q il termine 20*(I - 11'/n): Q[i,j] += 20*(1[i=j] - 1/n).
8. rhs = A_free' * W² * b_scaled.
9. Risolvi Q * x_free = rhs (Gauss con pivot).
10. x_free = max(0, x_free).
11. totKcal = (1/100) * sum_j A_free[0,j] * x_free[j].
12. Se totKcal > 0: scale = T_kcal / totKcal; x_free = max(0, scale * x_free).
13. Ricostruisci il vettore quantità completo (locked + free).
14. Arrotonda ogni quantità al multiplo di 5 g più vicino (e ≥ 0).
15. Calcola totali effettivi, matchScore, missingMacro.
16. Ritorna items, actual, matchScore, message (se < 80), missingMacro.
```

---

## 11. Risoluzione del sistema lineare (Gauss)

Il sistema \( M \mathbf{x} = \mathbf{rhs} \) è risolto con **eliminazione di Gauss con pivot per colonna** (si sceglie la riga con elemento in colonna massimo in valore assoluto). Poi **sostituzione all’indietro**. Elementi pivot \( < 10^{-12} \) vengono trattati come zero (evitare divisioni per zero).

---

## 12. Riepilogo parametri fissi

| Parametro        | Valore | Significato                          |
|------------------|--------|--------------------------------------|
| Pesi costo       | 100, 80, 40, 40 | Kcal, Prot, Carb, Fat          |
| Fattore distrib. | 20     | Peso varianza quantità               |
| Arrotondamento   | 5 g    | Step per tutte le quantità           |
| Soglia warning   | 80     | Se matchScore < 80 → messaggio + suggerimento |
| Peso matchScore  | 0.6 kcal, 0.4 macro | Formula del punteggio        |

Questo è l’algoritmo esatto implementato in `MealSolverService.ts` per il calcolo automatico del pasto.
