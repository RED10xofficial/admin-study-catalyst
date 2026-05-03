/**
 * Seed script — generates SQL for all tables.
 * Run: yarn seed-data:generate && yarn seed-data:local
 */
import { hashPassword } from '../lib/hash';
import { generateId, now } from '../lib/id';

// ── helpers ──────────────────────────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/'/g, "''");
}
function bool(v: boolean): number {
  return v ? 1 : 0;
}

async function main() {
  const ts = now();
  const out: string[] = [];
  const ln = (s: string) => out.push(s);

  // ── Exam Types ─────────────────────────────────────────────────────────────
  const etNeetUg = generateId();
  const etNeetPg = generateId();
  const etUpsc   = generateId();

  ln(`-- Exam Types`);
  ln(`INSERT OR IGNORE INTO exam_types (id, exam_name, tags, exam_question_count, created_at, updated_at) VALUES`);
  ln(`  ('${etNeetUg}', 'NEET UG',  '["Biology","Physics","Chemistry"]',          20, '${ts}', '${ts}'),`);
  ln(`  ('${etNeetPg}', 'NEET PG',  '["Medicine","Surgery","Pharmacology"]',       15, '${ts}', '${ts}'),`);
  ln(`  ('${etUpsc}',   'UPSC CSE', '["History","Polity","Geography","Economy"]',  25, '${ts}', '${ts}');`);

  // ── Units ──────────────────────────────────────────────────────────────────
  // NEET UG
  const uCellBio  = generateId();
  const uPhysio   = generateId();
  const uGenetics = generateId();
  // NEET PG
  const uMed      = generateId();
  const uSurgery  = generateId();
  const uPharma   = generateId();
  // UPSC
  const uHistory  = generateId();
  const uPolity   = generateId();
  const uGeo      = generateId();

  ln(`\n-- Units`);
  ln(`INSERT OR IGNORE INTO units (id, unit_name, image_url, exam_type_id, tags, access_type, is_deleted, created_at, updated_at) VALUES`);
  ln(`  ('${uCellBio}',  'Cell Biology & Division',          NULL, '${etNeetUg}', '["cell","mitosis","meiosis"]',              'free',    0, '${ts}', '${ts}'),`);
  ln(`  ('${uPhysio}',   'Human Physiology',                 NULL, '${etNeetUg}', '["digestion","circulation","respiration"]', 'free',    0, '${ts}', '${ts}'),`);
  ln(`  ('${uGenetics}', 'Genetics & Evolution',             NULL, '${etNeetUg}', '["mendel","DNA","evolution"]',              'premium', 0, '${ts}', '${ts}'),`);
  ln(`  ('${uMed}',      'Internal Medicine',                NULL, '${etNeetPg}', '["diabetes","hypertension","cardiac"]',     'free',    0, '${ts}', '${ts}'),`);
  ln(`  ('${uSurgery}',  'Surgery Essentials',               NULL, '${etNeetPg}', '["GI surgery","trauma","orthopedics"]',     'premium', 0, '${ts}', '${ts}'),`);
  ln(`  ('${uPharma}',   'Pharmacology',                     NULL, '${etNeetPg}', '["drugs","pharmacokinetics","antibiotics"]','free',    0, '${ts}', '${ts}'),`);
  ln(`  ('${uHistory}',  'Ancient & Medieval Indian History',NULL, '${etUpsc}',   '["Maurya","Mughal","Delhi Sultanate"]',     'free',    0, '${ts}', '${ts}'),`);
  ln(`  ('${uPolity}',   'Indian Polity & Governance',       NULL, '${etUpsc}',   '["constitution","parliament","judiciary"]', 'free',    0, '${ts}', '${ts}'),`);
  ln(`  ('${uGeo}',      'Physical Geography',               NULL, '${etUpsc}',   '["rivers","climate","mountains"]',          'premium', 0, '${ts}', '${ts}');`);

  // ── Practice Questions ─────────────────────────────────────────────────────
  // 4 per unit = 36 total
  interface Q {
    id: string;
    unitId: string;
    question: string;
    o1: string; o2: string; o3: string; o4: string;
    correct: string;
    desc: string;
    seq: number;
    access: 'free' | 'premium';
  }

  const practiceQs: Q[] = [];
  function pq(unitId: string, seq: number, question: string, o1: string, o2: string, o3: string, o4: string, correct: string, desc: string, access: 'free' | 'premium' = 'free'): void {
    practiceQs.push({ id: generateId(), unitId, question, o1, o2, o3, o4, correct, desc, seq, access });
  }

  // Cell Biology
  pq(uCellBio, 1, 'Which organelle is known as the powerhouse of the cell?', 'Nucleus', 'Mitochondria', 'Ribosome', 'Golgi apparatus', 'Mitochondria', 'Mitochondria produces ATP through cellular respiration, supplying energy to the cell.');
  pq(uCellBio, 2, 'DNA replication occurs during which phase of the cell cycle?', 'G1 phase', 'S phase', 'G2 phase', 'M phase', 'S phase', 'The S (synthesis) phase of interphase is when DNA is duplicated before cell division.');
  pq(uCellBio, 3, 'Which cell organelle is responsible for protein synthesis?', 'Lysosome', 'Vacuole', 'Ribosome', 'Centrosome', 'Ribosome', 'Ribosomes translate mRNA into proteins; they are found free in the cytoplasm or attached to the rough ER.');
  pq(uCellBio, 4, 'The fluid mosaic model describes the structure of which cellular component?', 'Cell wall', 'Cytoplasm', 'Cell membrane', 'Endoplasmic reticulum', 'Cell membrane', 'The fluid mosaic model explains the dynamic arrangement of phospholipids and proteins in the plasma membrane.');

  // Human Physiology
  pq(uPhysio, 1, 'Which enzyme initiates the digestion of starch in the mouth?', 'Pepsin', 'Lipase', 'Salivary amylase', 'Trypsin', 'Salivary amylase', 'Salivary amylase (ptyalin) breaks down starch into maltose in the oral cavity.');
  pq(uPhysio, 2, 'The SA node is located in which chamber of the heart?', 'Left ventricle', 'Right atrium', 'Left atrium', 'Right ventricle', 'Right atrium', 'The sinoatrial (SA) node, the natural pacemaker, is located in the right atrium near the opening of the superior vena cava.');
  pq(uPhysio, 3, 'Normal adult tidal volume is approximately:', '150 mL', '500 mL', '1200 mL', '3500 mL', '500 mL', 'Tidal volume is the amount of air inhaled or exhaled in a normal breath at rest, roughly 500 mL in adults.');
  pq(uPhysio, 4, 'Which hormone regulates blood calcium levels primarily?', 'Insulin', 'Thyroxine', 'Parathyroid hormone', 'Cortisol', 'Parathyroid hormone', 'PTH raises blood calcium by stimulating bone resorption, kidney reabsorption, and activating vitamin D.');

  // Genetics
  pq(uGenetics, 1, "Mendel's law of segregation states that:", 'Genes always blend together', 'Alleles segregate during gamete formation', 'All traits are dominant', 'Genes skip generations', 'Alleles segregate during gamete formation', 'During meiosis, the two alleles for each gene separate so each gamete receives only one allele.', 'premium');
  pq(uGenetics, 2, 'Which nitrogenous base is found in RNA but not in DNA?', 'Adenine', 'Cytosine', 'Thymine', 'Uracil', 'Uracil', 'RNA contains uracil where DNA has thymine; both pair with adenine during transcription.', 'premium');
  pq(uGenetics, 3, 'Down syndrome results from trisomy of chromosome:', '13', '18', '21', '23', '21', 'Trisomy 21 (three copies of chromosome 21) causes Down syndrome, the most common chromosomal disorder.');
  pq(uGenetics, 4, 'The theory of natural selection was proposed by:', 'Lamarck', 'Mendel', 'Darwin', 'Watson', 'Darwin', 'Charles Darwin proposed that organisms with favorable traits are more likely to survive and reproduce, driving evolutionary change.', 'premium');

  // Internal Medicine
  pq(uMed, 1, 'First-line treatment for Type 2 Diabetes Mellitus is:', 'Insulin', 'Metformin', 'Sulfonylurea', 'Thiazolidinediones', 'Metformin', 'Metformin reduces hepatic glucose production and is recommended as first-line therapy unless contraindicated.');
  pq(uMed, 2, 'Which finding is characteristic of left heart failure?', 'Pedal edema', 'JVP elevation', 'Pulmonary crackles', 'Hepatomegaly', 'Pulmonary crackles', 'Left ventricular failure causes pulmonary congestion, presenting as basal crepitations, orthopnea, and PND.');
  pq(uMed, 3, 'Target blood pressure in a diabetic patient is below:', '160/100 mmHg', '140/90 mmHg', '130/80 mmHg', '120/70 mmHg', '130/80 mmHg', 'ADA guidelines recommend BP <130/80 mmHg in patients with diabetes to reduce cardiovascular and renal risk.');
  pq(uMed, 4, 'ECG finding in hyperkalemia:', 'ST depression', 'Peaked T waves', 'Prolonged QT', 'Delta waves', 'Peaked T waves', 'Hyperkalemia causes tall, peaked T waves on ECG, followed by widening QRS and eventually sine-wave pattern.');

  // Surgery
  pq(uSurgery, 1, "Cullen's sign is associated with:", 'Acute appendicitis', 'Acute pancreatitis', 'Peptic ulcer perforation', 'Intestinal obstruction', 'Acute pancreatitis', "Cullen's sign (periumbilical bruising) indicates retroperitoneal hemorrhage, classically seen in severe acute pancreatitis.", 'premium');
  pq(uSurgery, 2, 'The most common site of ectopic pregnancy is:', 'Ovary', 'Cervix', 'Fallopian tube', 'Abdominal cavity', 'Fallopian tube', 'Over 95% of ectopic pregnancies occur in the fallopian tube, most commonly in the ampullary segment.', 'premium');
  pq(uSurgery, 3, 'Primary survey in ATLS follows which mnemonic?', 'SAMPLE', 'ABCDE', 'OPQRST', 'VINDICATE', 'ABCDE', 'ATLS primary survey: Airway, Breathing, Circulation, Disability, Exposure - in this sequence.', 'premium');
  pq(uSurgery, 4, "Murphy's sign is positive in:", 'Acute appendicitis', 'Acute cholecystitis', 'Renal colic', 'Splenic rupture', 'Acute cholecystitis', "Murphy's sign: pain and inspiratory arrest on palpation of the right hypochondrium - classic for acute cholecystitis.", 'premium');

  // Pharmacology
  pq(uPharma, 1, 'Which antibiotic inhibits cell wall synthesis by binding to PBPs?', 'Tetracycline', 'Penicillin', 'Ciprofloxacin', 'Metronidazole', 'Penicillin', 'Beta-lactam antibiotics (penicillins, cephalosporins) bind penicillin-binding proteins (PBPs) to inhibit bacterial cell wall synthesis.');
  pq(uPharma, 2, 'Drug of choice for Plasmodium falciparum malaria:', 'Chloroquine', 'Primaquine', 'Artemisinin combination therapy', 'Quinine alone', 'Artemisinin combination therapy', 'ACT (e.g., artemether-lumefantrine) is WHO first-line for uncomplicated P. falciparum due to widespread chloroquine resistance.');
  pq(uPharma, 3, 'Zero-order kinetics means drug elimination is:', 'Proportional to concentration', 'Constant regardless of concentration', 'Doubled when dose doubles', 'Exponential', 'Constant regardless of concentration', 'In zero-order kinetics, a fixed amount of drug is eliminated per unit time; examples include alcohol and phenytoin at high doses.');
  pq(uPharma, 4, 'Aspirin irreversibly inhibits:', 'COX-1 and COX-2', 'Lipoxygenase', 'Phospholipase A2', 'Thrombin', 'COX-1 and COX-2', 'Aspirin acetylates and irreversibly inhibits both COX isoforms, permanently blocking prostaglandin and thromboxane synthesis.');

  // Indian History
  pq(uHistory, 1, 'The Maurya Empire was founded by:', 'Chandragupta II', 'Ashoka', 'Chandragupta Maurya', 'Bindusara', 'Chandragupta Maurya', 'Chandragupta Maurya founded the Maurya Empire around 322 BCE with the help of Chanakya (Kautilya).');
  pq(uHistory, 2, 'Babur established the Mughal Empire after winning the:', 'Battle of Plassey', 'Battle of Panipat (1526)', 'Battle of Haldighati', 'Battle of Talikota', 'Battle of Panipat (1526)', 'Babur defeated Ibrahim Lodi at the First Battle of Panipat in 1526, establishing Mughal rule in India.');
  pq(uHistory, 3, 'The Qutub Minar was built by:', 'Akbar', 'Qutb ud-Din Aibak', 'Humayun', 'Sher Shah Suri', 'Qutb ud-Din Aibak', 'Construction of the Qutub Minar began under Qutb ud-Din Aibak, the founder of the Delhi Sultanate, around 1193 CE.');
  pq(uHistory, 4, 'Which Mughal emperor issued the Farman of 1717 granting trading rights to the British?', 'Jahangir', 'Shah Jahan', 'Aurangzeb', 'Farrukhsiyar', 'Farrukhsiyar', 'Emperor Farrukhsiyar issued the farman granting the East India Company duty-free trading rights, a landmark in British expansion.');

  // Indian Polity
  pq(uPolity, 1, 'The Constitution of India came into effect on:', '15 August 1947', '26 November 1949', '26 January 1950', '1 April 1950', '26 January 1950', 'Although the Constitution was adopted on 26 November 1949, it officially came into force on 26 January 1950 — celebrated as Republic Day.');
  pq(uPolity, 2, 'Which article of the Constitution deals with the right to equality?', 'Article 14', 'Article 19', 'Article 21', 'Article 32', 'Article 14', 'Article 14 guarantees equality before law and equal protection of laws to all persons within India.');
  pq(uPolity, 3, 'The President of India can be removed by:', 'The Supreme Court', 'The Prime Minister', 'Impeachment by Parliament', 'A vote of no confidence', 'Impeachment by Parliament', 'Article 61 provides the procedure for impeachment: charges initiated in one House, investigated, and then passed by 2/3 majority of the total membership.');
  pq(uPolity, 4, 'Money Bills can be introduced only in:', 'Rajya Sabha', 'Lok Sabha', 'Either House', 'Joint sitting', 'Lok Sabha', 'Under Article 110, Money Bills can only be introduced in the Lok Sabha; the Rajya Sabha cannot amend them, only recommend changes.');

  // Physical Geography
  pq(uGeo, 1, 'The Tropic of Cancer passes through how many Indian states?', '6', '7', '8', '9', '8', 'The Tropic of Cancer passes through 8 Indian states: Gujarat, Rajasthan, MP, Chhattisgarh, Jharkhand, West Bengal, Tripura, and Mizoram.', 'premium');
  pq(uGeo, 2, 'The Himalayan river system originates from:', 'The Western Ghats', 'Glaciers and snowfields of the Himalayas', 'Peninsular plateau', 'Eastern Ghats', 'Glaciers and snowfields of the Himalayas', 'Himalayan rivers like the Ganga, Indus, and Brahmaputra are perennial, fed by Himalayan glaciers and monsoon rains.', 'premium');
  pq(uGeo, 3, 'The Western Ghats are a biodiversity hotspot. What type of climate do they experience on the western slopes?', 'Arid', 'Semi-arid', 'Tropical wet', 'Subtropical dry', 'Tropical wet', 'The windward (western) slopes receive heavy orographic rainfall from the southwest monsoon, supporting tropical rainforests.');
  pq(uGeo, 4, "Chilika Lake, India's largest brackish water lagoon, is in:", 'Kerala', 'Tamil Nadu', 'Odisha', 'Andhra Pradesh', 'Odisha', "Chilika Lake on the Odisha coast is Asia's largest brackish water lagoon, an important Ramsar wetland site.", 'premium');

  ln(`\n-- Practice Questions`);
  ln(`INSERT OR IGNORE INTO questions (id, question, option1, option2, option3, option4, correct_answer, description, audio_url, unit_id, access_type, sequence_order, is_deleted, created_at) VALUES`);
  practiceQs.forEach((q, i) => {
    const comma = i < practiceQs.length - 1 ? ',' : ';';
    ln(`  ('${q.id}', '${esc(q.question)}', '${esc(q.o1)}', '${esc(q.o2)}', '${esc(q.o3)}', '${esc(q.o4)}', '${esc(q.correct)}', '${esc(q.desc)}', NULL, '${q.unitId}', '${q.access}', ${q.seq}, 0, '${ts}')${comma}`);
  });

  // ── Exam Questions ─────────────────────────────────────────────────────────
  interface EQ {
    id: string;
    unitId: string;
    question: string;
    o1: string; o2: string; o3: string; o4: string;
    correct: string;
    desc: string;
    difficulty: 'easy' | 'medium' | 'hard';
    access: 'free' | 'premium';
  }

  const examQs: EQ[] = [];
  function eq(unitId: string, question: string, o1: string, o2: string, o3: string, o4: string, correct: string, desc: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium', access: 'free' | 'premium' = 'free'): void {
    examQs.push({ id: generateId(), unitId, question, o1, o2, o3, o4, correct, desc, difficulty, access });
  }

  // Cell Biology exam questions
  eq(uCellBio, 'Which cell organelle contains hydrolytic enzymes for intracellular digestion?', 'Mitochondria', 'Lysosome', 'Peroxisome', 'Centrosome', 'Lysosome', 'Lysosomes are membrane-bound organelles containing acid hydrolases that digest worn-out organelles, food particles, and foreign invaders.', 'easy');
  eq(uCellBio, 'Cytokinesis in animal cells occurs via:', 'Cell plate formation', 'Cleavage furrow', 'Nuclear envelope dissolution', 'Centromere splitting', 'Cleavage furrow', 'In animal cells, a contractile ring of actin and myosin forms the cleavage furrow that pinches the cell in two.', 'medium');
  eq(uCellBio, 'The endosymbiotic theory proposes that mitochondria evolved from:', 'Infolding of the plasma membrane', 'An ancient prokaryotic symbiont', 'The nucleus', 'Ribosomes', 'An ancient prokaryotic symbiont', 'Lynn Margulis proposed that mitochondria and chloroplasts were once free-living bacteria engulfed by a proto-eukaryotic cell.', 'hard');

  // Physiology exam questions
  eq(uPhysio, 'Which structure prevents backflow of blood from the ventricles to atria?', 'Semilunar valves', 'Atrioventricular valves', 'Chordae tendineae', 'Tricuspid valve only', 'Atrioventricular valves', 'The AV valves (mitral and tricuspid) prevent backflow from ventricles to atria during systole; chordae tendineae prevent eversion.', 'easy');
  eq(uPhysio, 'Oxygen dissociation curve shifts to the right in:', 'Decreased temperature', 'Increased pH', 'Increased 2,3-DPG', 'Decreased CO2', 'Increased 2,3-DPG', 'A rightward shift (Bohr effect) indicates reduced Hb-O2 affinity: caused by increased 2,3-DPG, CO2, H+, or temperature.', 'hard');
  eq(uPhysio, 'The hormone responsible for water reabsorption in collecting ducts is:', 'Aldosterone', 'ANP', 'ADH (Vasopressin)', 'Renin', 'ADH (Vasopressin)', 'ADH promotes insertion of aquaporin-2 channels in collecting duct cells, increasing water reabsorption to concentrate urine.', 'medium');

  // Genetics exam questions
  eq(uGenetics, 'In a test cross, a tall pea plant (unknown genotype) × dwarf plant produces 50% tall and 50% dwarf offspring. The tall parent is:', 'TT', 'Tt', 'tt', 'Cannot be determined', 'Tt', 'A 1:1 ratio in a test cross indicates the tested parent is heterozygous (Tt × tt → 50% Tt tall, 50% tt dwarf).', 'medium', 'premium');
  eq(uGenetics, 'Turner syndrome (45,X0) is characterized by:', 'Tall stature', 'Normal fertility', 'Shield-shaped chest and webbed neck', 'Intellectual disability', 'Shield-shaped chest and webbed neck', 'Turner syndrome features include short stature, webbed neck, shield chest, primary amenorrhea, and streak gonads.', 'medium', 'premium');
  eq(uGenetics, 'Which enzyme is responsible for unwinding the DNA double helix during replication?', 'DNA polymerase', 'Ligase', 'Helicase', 'Primase', 'Helicase', 'Helicase breaks hydrogen bonds between base pairs to unwind the double helix, creating the replication fork.', 'easy', 'premium');

  // Internal Medicine exam questions
  eq(uMed, 'Troponin I elevation is most specific for:', 'Pulmonary embolism', 'Myocardial infarction', 'Heart failure', 'Pericarditis', 'Myocardial infarction', 'Cardiac troponin I (cTnI) is the most specific biomarker for myocardial injury; levels rise 3-6 hours after MI onset.', 'easy');
  eq(uMed, 'Which finding suggests nephrotic syndrome over nephritic syndrome?', 'Hematuria', 'Hypertension', 'Massive proteinuria >3.5 g/day', 'RBC casts', 'Massive proteinuria >3.5 g/day', 'Nephrotic syndrome triad: massive proteinuria, hypoalbuminemia, edema. Nephritic syndrome features hematuria, RBC casts, and azotemia.', 'medium');
  eq(uMed, 'Community-acquired pneumonia empirical treatment for a healthy outpatient includes:', 'IV vancomycin', 'Amoxicillin or azithromycin', 'Meropenem', 'Antifungal therapy', 'Amoxicillin or azithromycin', 'NICE/ATS guidelines recommend amoxicillin (atypical cover: azithromycin/doxycycline) for mild CAP managed in the community.', 'medium');

  // Surgery exam questions
  eq(uSurgery, 'The classic presentation of appendicitis includes pain that migrates from:', 'Right iliac fossa to umbilicus', 'Umbilicus to right iliac fossa', 'Epigastrium to right iliac fossa', 'Left iliac fossa to right iliac fossa', 'Umbilicus to right iliac fossa', "Appendicitis classically begins as periumbilical pain (visceral) that localizes to McBurney's point in the right iliac fossa.", 'easy', 'premium');
  eq(uSurgery, "Charcot's triad (fever, jaundice, RUQ pain) is associated with:", 'Acute pancreatitis', 'Ascending cholangitis', 'Acute cholecystitis', 'Hepatic abscess', 'Ascending cholangitis', "Charcot's triad is pathognomonic for ascending cholangitis. Reynolds' pentad adds septic shock and confusion.", 'medium', 'premium');
  eq(uSurgery, 'Which type of wound closure is appropriate for a heavily contaminated wound?', 'Primary closure', 'Delayed primary closure', 'Secondary intention', 'Immediate skin grafting', 'Delayed primary closure', 'Contaminated or infected wounds should be left open initially (delayed primary closure) to prevent abscess formation.', 'hard', 'premium');

  // Pharmacology exam questions
  eq(uPharma, 'The antidote for paracetamol (acetaminophen) overdose is:', 'Atropine', 'N-acetylcysteine', 'Naloxone', 'Flumazenil', 'N-acetylcysteine', 'NAC replenishes glutathione stores that are depleted by the toxic paracetamol metabolite NAPQI, preventing hepatic necrosis.');
  eq(uPharma, 'Which class of diuretic acts on the thick ascending limb of the loop of Henle?', 'Thiazides', 'Potassium-sparing', 'Loop diuretics', 'Osmotic diuretics', 'Loop diuretics', 'Furosemide and other loop diuretics inhibit the Na-K-2Cl cotransporter (NKCC2) in the TAL, producing potent diuresis.');
  eq(uPharma, 'Warfarin acts by inhibiting:', 'Thrombin directly', 'Factor Xa directly', 'Vitamin K-dependent clotting factor synthesis', 'Platelet aggregation', 'Vitamin K-dependent clotting factor synthesis', 'Warfarin inhibits vitamin K epoxide reductase, preventing regeneration of reduced vitamin K needed for factors II, VII, IX, X, and proteins C and S.');

  // History exam questions
  eq(uHistory, 'Who composed the Arthashastra, an ancient treatise on statecraft?', 'Valmiki', 'Chanakya (Kautilya)', 'Patanjali', 'Banabhatta', 'Chanakya (Kautilya)', 'The Arthashastra is attributed to Chanakya, the chief minister of Chandragupta Maurya, covering economics, military strategy, and governance.', 'easy');
  eq(uHistory, 'The Bhakti movement emphasized:', 'Rituals and caste hierarchy', 'Personal devotion to God transcending caste', 'Temple building', 'Military conquest', 'Personal devotion to God transcending caste', 'Bhakti saints like Kabir, Mirabai, and Tukaram stressed direct, personal devotion to God, challenging caste and ritualism.', 'medium');
  eq(uHistory, 'The Third Battle of Panipat (1761) was fought between the Marathas and:', 'The Mughals', 'Ahmad Shah Durrani (Abdali)', 'The British East India Company', 'Hyder Ali', 'Ahmad Shah Durrani (Abdali)', 'The Marathas were decisively defeated by Ahmad Shah Durrani at the Third Battle of Panipat, halting their expansion northward.', 'hard');

  // Polity exam questions
  eq(uPolity, 'Which Schedule of the Constitution lists the subjects under the Union, State, and Concurrent Lists?', '6th Schedule', '7th Schedule', '8th Schedule', '9th Schedule', '7th Schedule', 'The 7th Schedule contains three lists: Union List (97 subjects), State List (66 subjects), and Concurrent List (47 subjects).', 'medium');
  eq(uPolity, 'The concept of judicial review in India is derived from:', 'UK constitution', 'Canadian constitution', 'US constitution', 'Australian constitution', 'US constitution', "India borrowed the concept of judicial review - courts' power to strike down unconstitutional laws - from the USA.", 'easy');
  eq(uPolity, 'The 42nd Constitutional Amendment (1976) added which terms to the Preamble?', 'Democratic and Republic', 'Socialist, Secular, and Integrity', 'Sovereign and Justice', 'Liberty and Equality', 'Socialist, Secular, and Integrity', 'The 42nd Amendment (during Emergency) inserted "Socialist", "Secular", and "Integrity" into the Preamble.', 'hard');

  // Geography exam questions
  eq(uGeo, 'The Deccan Plateau is bounded by the Western Ghats and the:', 'Aravalli Range', 'Vindhya Range', 'Eastern Ghats', 'Satpura Range', 'Eastern Ghats', 'The Deccan Plateau is bounded by the Western Ghats to the west and the Eastern Ghats to the east.', 'easy', 'premium');
  eq(uGeo, 'El Niño is associated with:', 'Unusually cold Pacific sea surface temperatures', 'Warming of the central and eastern Pacific Ocean', 'Increased Atlantic hurricane activity', 'Stronger Indian monsoon', 'Warming of the central and eastern Pacific Ocean', 'El Niño involves abnormal warming of Pacific surface waters, disrupting global weather patterns including weakening the Indian monsoon.', 'medium', 'premium');
  eq(uGeo, 'The term rain shadow region refers to:', 'Areas that receive maximum rainfall', 'Areas on the leeward side of mountains that receive less rainfall', 'Coastal areas receiving sea breezes', 'Regions with permanent cloud cover', 'Areas on the leeward side of mountains that receive less rainfall', 'As moist air rises over a mountain, it cools and precipitates; the descending air on the leeward side is dry, creating a rain shadow.', 'hard', 'premium');

  ln(`\n-- Exam Questions`);
  ln(`INSERT OR IGNORE INTO exam_questions (id, question, option1, option2, option3, option4, correct_answer, short_description, difficulty, unit_id, access_type, is_deleted, created_at) VALUES`);
  examQs.forEach((q, i) => {
    const comma = i < examQs.length - 1 ? ',' : ';';
    ln(`  ('${q.id}', '${esc(q.question)}', '${esc(q.o1)}', '${esc(q.o2)}', '${esc(q.o3)}', '${esc(q.o4)}', '${esc(q.correct)}', '${esc(q.desc)}', '${q.difficulty}', '${q.unitId}', '${q.access}', 0, '${ts}')${comma}`);
  });

  // ── Question Statistics ────────────────────────────────────────────────────
  // For exam questions — sample analytics
  interface Stat { qId: string; total: number; correct: number; wrong: number }
  const statsData: Stat[] = [
    { qId: examQs[0]!.id,  total: 142, correct: 118, wrong: 24 },
    { qId: examQs[1]!.id,  total: 98,  correct: 61,  wrong: 37 },
    { qId: examQs[2]!.id,  total: 74,  correct: 31,  wrong: 43 },
    { qId: examQs[3]!.id,  total: 207, correct: 175, wrong: 32 },
    { qId: examQs[4]!.id,  total: 159, correct: 87,  wrong: 72 },
    { qId: examQs[5]!.id,  total: 183, correct: 140, wrong: 43 },
    { qId: examQs[6]!.id,  total: 56,  correct: 28,  wrong: 28 },
    { qId: examQs[7]!.id,  total: 91,  correct: 55,  wrong: 36 },
    { qId: examQs[8]!.id,  total: 112, correct: 89,  wrong: 23 },
    { qId: examQs[9]!.id,  total: 233, correct: 190, wrong: 43 },
    { qId: examQs[10]!.id, total: 88,  correct: 42,  wrong: 46 },
    { qId: examQs[11]!.id, total: 176, correct: 134, wrong: 42 },
    { qId: examQs[12]!.id, total: 64,  correct: 20,  wrong: 44 },
    { qId: examQs[13]!.id, total: 149, correct: 128, wrong: 21 },
    { qId: examQs[14]!.id, total: 97,  correct: 59,  wrong: 38 },
    { qId: examQs[15]!.id, total: 120, correct: 96,  wrong: 24 },
    { qId: examQs[16]!.id, total: 85,  correct: 62,  wrong: 23 },
    { qId: examQs[17]!.id, total: 108, correct: 71,  wrong: 37 },
  ];

  ln(`\n-- Question Statistics`);
  ln(`INSERT OR IGNORE INTO question_statistics (question_id, total_attempts, correct_attempts, wrong_attempts) VALUES`);
  statsData.forEach((s, i) => {
    const comma = i < statsData.length - 1 ? ',' : ';';
    ln(`  ('${s.qId}', ${s.total}, ${s.correct}, ${s.wrong})${comma}`);
  });

  // ── Students ───────────────────────────────────────────────────────────────
  const studentPassword = process.env['SEED_STUDENT_PASSWORD'] ?? 'Student@123';
  const pwHash = await hashPassword(studentPassword);
  const ph = pwHash.replace(/'/g, "''");

  const s1 = generateId(); // premium / book_qr / active
  const s2 = generateId(); // premium / manual_upgrade / active
  const s3 = generateId(); // normal / direct_registration / active
  const s4 = generateId(); // normal / direct_registration / active
  const s5 = generateId(); // normal / direct_registration / inactive

  ln(`\n-- Students (password: ${studentPassword})`);
  ln(`INSERT OR IGNORE INTO users (id, name, email, phone, password_hash, role, membership_type, membership_source, is_active, created_at, updated_at) VALUES`);
  ln(`  ('${s1}', 'Arjun Sharma',   'arjun.sharma@example.com',   '+91 9876543210', '${ph}', 'student', 'premium', 'book_qr',              1, '${ts}', '${ts}'),`);
  ln(`  ('${s2}', 'Priya Nair',     'priya.nair@example.com',     '+91 9876500001', '${ph}', 'student', 'premium', 'manual_upgrade',       1, '${ts}', '${ts}'),`);
  ln(`  ('${s3}', 'Rahul Verma',    'rahul.verma@example.com',    '+91 9876500002', '${ph}', 'student', 'normal',  'direct_registration',  1, '${ts}', '${ts}'),`);
  ln(`  ('${s4}', 'Meena Pillai',   'meena.pillai@example.com',   '+91 9876500003', '${ph}', 'student', 'normal',  'direct_registration',  1, '${ts}', '${ts}'),`);
  ln(`  ('${s5}', 'Suresh Gupta',   'suresh.gupta@example.com',   NULL,             '${ph}', 'student', 'normal',  'direct_registration',  0, '${ts}', '${ts}');`);

  // ── Student Exams ──────────────────────────────────────────────────────────
  const se1 = generateId();
  const se2 = generateId();
  const se3 = generateId();
  const se4 = generateId();
  const se5 = generateId();
  const se6 = generateId();

  ln(`\n-- Student Exams`);
  ln(`INSERT OR IGNORE INTO student_exams (id, student_id, unit_id, difficulty, score, total_questions, correct_answers, status, started_at, submitted_at) VALUES`);
  ln(`  ('${se1}', '${s1}', '${uCellBio}',  'medium', 80, 10, 8,  'submitted',  '${ts}', '${ts}'),`);
  ln(`  ('${se2}', '${s1}', '${uPhysio}',   'hard',   60, 10, 6,  'submitted',  '${ts}', '${ts}'),`);
  ln(`  ('${se3}', '${s2}', '${uMed}',      'medium', 70, 10, 7,  'submitted',  '${ts}', '${ts}'),`);
  ln(`  ('${se4}', '${s3}', '${uHistory}',  'easy',   90, 10, 9,  'submitted',  '${ts}', '${ts}'),`);
  ln(`  ('${se5}', '${s4}', '${uPolity}',   'medium', 50, 10, 5,  'submitted',  '${ts}', '${ts}'),`);
  ln(`  ('${se6}', '${s2}', '${uSurgery}',  'hard',   NULL, 10, NULL, 'active', '${ts}', NULL);`);

  // ── Student Question Progress ──────────────────────────────────────────────
  // Students have answered some practice questions
  const progressRows: Array<[string, string]> = [
    // s1 answered questions from Cell Biology and Physiology
    [s1, practiceQs[0]!.id],
    [s1, practiceQs[1]!.id],
    [s1, practiceQs[2]!.id],
    [s1, practiceQs[4]!.id],
    [s1, practiceQs[5]!.id],
    // s2 answered questions from Medicine and Genetics
    [s2, practiceQs[12]!.id],
    [s2, practiceQs[13]!.id],
    [s2, practiceQs[8]!.id],
    [s2, practiceQs[9]!.id],
    // s3 answered History questions
    [s3, practiceQs[24]!.id],
    [s3, practiceQs[25]!.id],
    [s3, practiceQs[26]!.id],
    // s4 answered Polity questions
    [s4, practiceQs[28]!.id],
    [s4, practiceQs[29]!.id],
    // s5 answered a couple of questions before going inactive
    [s5, practiceQs[0]!.id],
    [s5, practiceQs[4]!.id],
  ];

  ln(`\n-- Student Question Progress`);
  ln(`INSERT OR IGNORE INTO student_question_progress (id, student_id, question_id, status, answered_at) VALUES`);
  progressRows.forEach(([sid, qid], i) => {
    const rowId = generateId();
    const comma = i < progressRows.length - 1 ? ',' : ';';
    ln(`  ('${rowId}', '${sid}', '${qid}', 'answered', '${ts}')${comma}`);
  });

  console.log(out.join('\n'));
}

main();
