/**
 * Upserts all ChapterContent rows from the fixture files into the database.
 *
 * Run from the backend/ directory:
 *   node scripts/seedChapterContent.mjs
 */

import { PrismaClient } from '@prisma/client';
import { createRequire } from 'module';

// Fixtures are TypeScript — use ts-node/esm or compile first.
// Simpler: inline the data directly here, sourced from the fixtures.
// This file stays in sync with the fixture files via the pdfS3Key values below.

const prisma = new PrismaClient();

// ── Maths ────────────────────────────────────────────────────────────────────

const maths = [
  { chapterNumber: 1, chapterName: 'Large Numbers Around Us',              difficulty: 'easy',   estimatedMinutes: 45,  pdfS3Key: 'NCERT/Class_7/Mathematics/ch_01_large_numbers_around_us.pdf',              concepts: ['Place value','Indian number system','International number system','Estimation'],                                                   keyFacts: ['In the Indian system, periods are ones, thousands, lakhs, crores','In the International system, periods are ones, thousands, millions, billions'] },
  { chapterNumber: 2, chapterName: 'Arithmetic Expressions',               difficulty: 'medium', estimatedMinutes: 50,  pdfS3Key: 'NCERT/Class_7/Mathematics/ch_02_arithmetic_expressions.pdf',               concepts: ['BODMAS rule','Order of operations','Brackets','Arithmetic operators'],                                                              keyFacts: ['BODMAS stands for Brackets, Orders, Division, Multiplication, Addition, Subtraction','Multiplication and division are done before addition and subtraction'] },
  { chapterNumber: 3, chapterName: 'A Peek Beyond the Point',              difficulty: 'medium', estimatedMinutes: 45,  pdfS3Key: 'NCERT/Class_7/Mathematics/ch_03_a_peek_beyond_the_point.pdf',              concepts: ['Decimal numbers','Place value of decimals','Comparing decimals','Operations on decimals'],                                            keyFacts: ['Digits after the decimal point occupy tenths, hundredths, thousandths places','To compare decimals, align the decimal points and compare digit by digit'] },
  { chapterNumber: 4, chapterName: 'Expressions Using Letter-Numbers',     difficulty: 'medium', estimatedMinutes: 55,  pdfS3Key: 'NCERT/Class_7/Mathematics/ch_04_expressions_using_letter-numbers.pdf',    concepts: ['Variables','Algebraic expressions','Like and unlike terms','Simple equations'],                                                        keyFacts: ['A variable represents an unknown quantity','Like terms have the same variable raised to the same power'] },
  { chapterNumber: 5, chapterName: 'Parallel and Intersecting Lines',      difficulty: 'easy',   estimatedMinutes: 40,  pdfS3Key: 'NCERT/Class_7/Mathematics/ch_05_parallel_and_intersecting_lines.pdf',     concepts: ['Parallel lines','Intersecting lines','Perpendicular lines','Angles formed by a transversal'],                                          keyFacts: ['Parallel lines never meet and are equidistant throughout their length','When a transversal cuts two parallel lines, alternate interior angles are equal'] },
  { chapterNumber: 6, chapterName: 'Number Play',                          difficulty: 'easy',   estimatedMinutes: 40,  pdfS3Key: 'NCERT/Class_7/Mathematics/ch_06_number_play.pdf',                         concepts: ['Divisibility rules','Factors and multiples','Prime and composite numbers','LCM and HCF'],                                              keyFacts: ['A prime number has exactly two factors: 1 and itself','LCM × HCF = Product of two numbers'] },
  { chapterNumber: 7, chapterName: 'A Tale of Three Intersecting Lines',   difficulty: 'medium', estimatedMinutes: 50,  pdfS3Key: 'NCERT/Class_7/Mathematics/ch_07_a_tale_of_three_intersecting_lines.pdf',  concepts: ['Triangle','Types of triangles','Angle sum property','Exterior angle property'],                                                       keyFacts: ['The sum of all interior angles of a triangle is 180°','An exterior angle of a triangle equals the sum of the two non-adjacent interior angles'] },
  { chapterNumber: 8, chapterName: 'Working with Fractions',               difficulty: 'medium', estimatedMinutes: 55,  pdfS3Key: 'NCERT/Class_7/Mathematics/ch_08_working_with_fractions.pdf',               concepts: ['Types of fractions','Equivalent fractions','Addition and subtraction of fractions','Multiplication of fractions'],                     keyFacts: ['To add fractions with different denominators, find the LCM first','To multiply fractions, multiply numerators together and denominators together'] },
];

// ── Science ──────────────────────────────────────────────────────────────────

const science = [
  { chapterNumber: 1,  chapterName: 'The Ever-Evolving World of Science',          difficulty: 'easy',   estimatedMinutes: 60,  pdfS3Key: 'NCERT/Class_7/Science/ch_01_the_ever-evolving_world_of_science.pdf',          concepts: ['Scientific method','Observation','Hypothesis','Experiment'],                                              keyFacts: ['Science is based on systematic observation','Hypothesis must be testable'] },
  { chapterNumber: 2,  chapterName: 'Exploring Substances: Acidic, Basic and Neutral', difficulty: 'medium', estimatedMinutes: 75, pdfS3Key: 'NCERT/Class_7/Science/ch_02_exploring_substances_acidic_basic_and_neutral.pdf', concepts: ['Acids','Bases','Neutralisation','pH scale','Indicators'],                                                 keyFacts: ['Acids turn blue litmus red','Bases turn red litmus blue','pH < 7 is acidic'] },
  { chapterNumber: 3,  chapterName: 'Electricity: Circuits and Their Components',  difficulty: 'medium', estimatedMinutes: 90,  pdfS3Key: 'NCERT/Class_7/Science/ch_03_electricity_circuits_and_their_components.pdf',  concepts: ['Electric circuit','Conductors','Insulators','Series circuit','Parallel circuit'],                         keyFacts: ['Current flows from positive to negative terminal','Metals are good conductors'] },
  { chapterNumber: 4,  chapterName: 'The World of Metals and Non-Metals',          difficulty: 'easy',   estimatedMinutes: 60,  pdfS3Key: 'NCERT/Class_7/Science/ch_04_the_world_of_metals_and_non-metals.pdf',          concepts: ['Properties of metals','Properties of non-metals','Reactivity series'],                                   keyFacts: ['Metals are malleable and ductile','Non-metals are brittle'] },
  { chapterNumber: 5,  chapterName: 'Changes Around Us: Physical and Chemical',    difficulty: 'easy',   estimatedMinutes: 60,  pdfS3Key: 'NCERT/Class_7/Science/ch_05_changes_around_us_physical_and_chemical.pdf',    concepts: ['Physical change','Chemical change','Reversible change','Irreversible change'],                            keyFacts: ['Burning is a chemical change','Melting ice is a physical change'] },
  { chapterNumber: 6,  chapterName: 'Adolescence: A Stage of Growth and Change',   difficulty: 'easy',   estimatedMinutes: 75,  pdfS3Key: 'NCERT/Class_7/Science/ch_06_adolescence_a_stage_of_growth_and_change.pdf',   concepts: ['Puberty','Hormones','Secondary sexual characters','Reproductive health'],                                 keyFacts: ['Adolescence starts around age 10–12','Hormones control puberty changes'] },
  { chapterNumber: 7,  chapterName: 'Heat Transfer in Nature',                     difficulty: 'medium', estimatedMinutes: 90,  pdfS3Key: 'NCERT/Class_7/Science/ch_07_heat_transfer_in_nature.pdf',                     concepts: ['Conduction','Convection','Radiation','Thermal equilibrium'],                                              keyFacts: ['Heat flows from hot to cold body','Radiation does not need a medium'] },
  { chapterNumber: 8,  chapterName: 'Measurement of Time and Motion',              difficulty: 'easy',   estimatedMinutes: 60,  pdfS3Key: 'NCERT/Class_7/Science/ch_08_measurement_of_time_and_motion.pdf',              concepts: ['Speed','Distance','Time','Uniform motion','Non-uniform motion'],                                          keyFacts: ['Speed = Distance / Time','SI unit of speed is m/s'] },
  { chapterNumber: 9,  chapterName: 'Life Processes in Animals',                   difficulty: 'medium', estimatedMinutes: 90,  pdfS3Key: 'NCERT/Class_7/Science/ch_09_life_processes_in_animals.pdf',                   concepts: ['Nutrition','Respiration','Transportation','Excretion'],                                                   keyFacts: ['Digestion starts in the mouth','Lungs exchange oxygen and carbon dioxide'] },
  { chapterNumber: 10, chapterName: 'Life Processes in Plants',                    difficulty: 'medium', estimatedMinutes: 90,  pdfS3Key: 'NCERT/Class_7/Science/ch_10_life_processes_in_plants.pdf',                    concepts: ['Photosynthesis','Transpiration','Respiration in plants','Transport in plants'],                           keyFacts: ['Chlorophyll absorbs sunlight','Stomata control gas exchange in leaves'] },
  { chapterNumber: 11, chapterName: 'Light: Shadows and Reflections',              difficulty: 'medium', estimatedMinutes: 75,  pdfS3Key: 'NCERT/Class_7/Science/ch_11_light_shadows_and_reflections.pdf',              concepts: ['Rectilinear propagation of light','Shadow formation','Reflection','Laws of reflection'],                  keyFacts: ['Light travels in a straight line','Angle of incidence equals angle of reflection'] },
  { chapterNumber: 12, chapterName: 'Earth, Moon and the Sun',                     difficulty: 'hard',   estimatedMinutes: 120, pdfS3Key: 'NCERT/Class_7/Science/ch_12_earth_moon_and_the_sun.pdf',                     concepts: ['Revolution','Rotation','Phases of moon','Solar and lunar eclipse','Tides'],                               keyFacts: ['Earth takes 365.25 days to revolve around the Sun','Moon takes ~29.5 days to complete one lunar cycle'] },
];

// ── Social Science ────────────────────────────────────────────────────────────

const socialScience = [
  { chapterNumber: 1,  chapterName: 'Geographical Diversity of India',                       difficulty: 'easy',   estimatedMinutes: 50, pdfS3Key: 'NCERT/Class_7/SocialScience/ch_01_geographical_diversity_of_india.pdf',                       concepts: ['Physical features of India','Mountains and plains','Coastal regions','Island territories'],       keyFacts: ['India has the Himalayas in the north and the Indian Ocean in the south','The Deccan Plateau is one of the oldest landmasses in the world'] },
  { chapterNumber: 2,  chapterName: 'Understanding the Weather',                             difficulty: 'easy',   estimatedMinutes: 40, pdfS3Key: 'NCERT/Class_7/SocialScience/ch_02_understanding_the_weather.pdf',                             concepts: ['Weather vs climate','Temperature','Humidity','Rainfall measurement'],                             keyFacts: ['Weather changes daily; climate is averaged over 30+ years','A rain gauge is used to measure rainfall'] },
  { chapterNumber: 3,  chapterName: 'Climates of India',                                     difficulty: 'medium', estimatedMinutes: 45, pdfS3Key: 'NCERT/Class_7/SocialScience/ch_03_climates_of_india.pdf',                                     concepts: ['Monsoon','Seasons in India','Factors affecting climate','Regional climate variations'],            keyFacts: ['India has four main seasons: winter, summer, monsoon, and retreating monsoon','The Western Ghats receive heavy rainfall due to orographic effect'] },
  { chapterNumber: 4,  chapterName: 'New Beginnings: Cities and States',                     difficulty: 'medium', estimatedMinutes: 50, pdfS3Key: 'NCERT/Class_7/SocialScience/ch_04_new_beginnings_cities_and_states.pdf',                     concepts: ['Mahajanapadas','Early cities','Trade and commerce','Social structure'],                           keyFacts: ['There were 16 Mahajanapadas in ancient India around 600 BCE','Magadha emerged as the most powerful Mahajanapada'] },
  { chapterNumber: 5,  chapterName: 'The Rise of Empires',                                   difficulty: 'medium', estimatedMinutes: 55, pdfS3Key: 'NCERT/Class_7/SocialScience/ch_05_the_rise_of_empires.pdf',                                   concepts: ['Maurya Empire','Ashoka','Administrative system','Spread of Buddhism'],                            keyFacts: ['Chandragupta Maurya founded the Maurya Empire around 321 BCE','Ashoka renounced violence after the Kalinga war and promoted Buddhism'] },
  { chapterNumber: 6,  chapterName: 'The Age of Reorganisation',                             difficulty: 'medium', estimatedMinutes: 50, pdfS3Key: 'NCERT/Class_7/SocialScience/ch_06_the_age_of_reorganisation.pdf',                             concepts: ['Post-Mauryan kingdoms','Kushanas','Satavahanas','Trade routes'],                                  keyFacts: ['The Kushana king Kanishka was a great patron of Buddhism','Satavahanas were important traders who connected the Deccan to the coast'] },
  { chapterNumber: 7,  chapterName: 'The Gupta Era: An Age of Tireless Creativity',          difficulty: 'medium', estimatedMinutes: 55, pdfS3Key: 'NCERT/Class_7/SocialScience/ch_07_the_gupta_era_an_age_of_tireless_creativity.pdf',          concepts: ['Gupta dynasty','Golden Age of India','Art and literature','Mathematics and astronomy'],           keyFacts: ['Aryabhata, the mathematician-astronomer, lived during the Gupta period','Kalidasa, author of Shakuntala, flourished under Gupta patronage'] },
  { chapterNumber: 8,  chapterName: 'How the Land Becomes Sacred',                           difficulty: 'easy',   estimatedMinutes: 45, pdfS3Key: 'NCERT/Class_7/SocialScience/ch_08_how_the_land_becomes_sacred.pdf',                           concepts: ['Pilgrimage sites','Temples and shrines','Sacred rivers','Religious geography'],                   keyFacts: ['Rivers like the Ganga are considered sacred in Hinduism','Pilgrimage is an important religious practice in many Indian religions'] },
  { chapterNumber: 9,  chapterName: 'From the Rulers to the Ruled: Types of Governments',   difficulty: 'medium', estimatedMinutes: 50, pdfS3Key: 'NCERT/Class_7/SocialScience/ch_09_from_the_rulers_to_the_ruled_types_of_governments.pdf',   concepts: ['Democracy','Monarchy','Republic','Forms of government'],                                         keyFacts: ['In a democracy, power comes from the people through elections','India is a democratic republic — both the head of state and parliament are elected'] },
  { chapterNumber: 10, chapterName: 'The Constitution of India: An Introduction',            difficulty: 'hard',   estimatedMinutes: 55, pdfS3Key: 'NCERT/Class_7/SocialScience/ch_10_the_constitution_of_india_an_introduction.pdf',            concepts: ['Constitution','Fundamental rights','Directive principles','Preamble'],                           keyFacts: ['The Indian Constitution came into effect on 26 January 1950','Part III of the Constitution lists six Fundamental Rights'] },
  { chapterNumber: 11, chapterName: 'From Barter to Money',                                  difficulty: 'easy',   estimatedMinutes: 40, pdfS3Key: 'NCERT/Class_7/SocialScience/ch_11_from_barter_to_money.pdf',                                  concepts: ['Barter system','Currency','Evolution of money','Functions of money'],                             keyFacts: ['The barter system required a double coincidence of wants','Money acts as a universally accepted medium of exchange'] },
  { chapterNumber: 12, chapterName: 'Understanding Markets',                                 difficulty: 'medium', estimatedMinutes: 45, pdfS3Key: 'NCERT/Class_7/SocialScience/ch_12_understanding_markets.pdf',                                 concepts: ['Types of markets','Supply and demand','Price determination','Consumer rights'],                   keyFacts: ['In a competitive market, prices are determined by supply and demand','Consumer rights include the right to information, choice, and redressal'] },
];

// ── Upsert ────────────────────────────────────────────────────────────────────

async function upsertAll(subject, chapters) {
  for (const ch of chapters) {
    const where = { class_board_subject_chapterNumber: { class: 7, board: 'CBSE', subject, chapterNumber: ch.chapterNumber } };
    const data = {
      class: 7, board: 'CBSE', subject,
      chapterNumber: ch.chapterNumber,
      chapterName: ch.chapterName,
      difficulty: ch.difficulty,
      estimatedMinutes: ch.estimatedMinutes,
      pdfS3Key: ch.pdfS3Key,
      concepts: ch.concepts,
      keyFacts: ch.keyFacts,
      textbookQuestions: [],
    };
    await prisma.chapterContent.upsert({ where, create: data, update: { pdfS3Key: ch.pdfS3Key } });
    console.log(`  ✔  ${subject} ch${String(ch.chapterNumber).padStart(2,'0')} — ${ch.chapterName}`);
  }
}

async function main() {
  console.log('\n── Mathematics ──');
  await upsertAll('Mathematics', maths);

  console.log('\n── Science ──');
  await upsertAll('Science', science);

  console.log('\n── Social Science ──');
  await upsertAll('Social Science', socialScience);

  const total = maths.length + science.length + socialScience.length;
  console.log(`\nDone. ${total} ChapterContent rows upserted.`);
  await prisma.$disconnect();
}

main().catch(err => { console.error(err); prisma.$disconnect(); process.exit(1); });
