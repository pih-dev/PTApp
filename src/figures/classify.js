// ─── Movement → archetype ────────────────────────────────────────────────────
//
// 🔴 THE DECISION THAT MAKES 340 FIGURES POSSIBLE AT ALL. Nobody hand-draws 340
//    movements and keeps them looking like one library — and they should not,
//    because a Front Squat, a Box Squat, a Smith Machine Squat and a Sumo Squat
//    are ONE drawing with a different bar in it. So a movement is classified
//    into a PATTERN, the pattern owns the pose and the fault, and the movement
//    contributes its equipment and its own muscles from the bank.
//
//    That is also how a real illustrated exercise library is made, and it fixes
//    the review economics: Elie reviews ~40 patterns, not 340 entries.
//
// 🔴 THE RULES ARE ORDERED AND THE FIRST MATCH WINS, so the specific must come
//    before the general — "Single Leg Romanian Deadlift" has to be seen by the
//    hinge rule before the deadlift rule, and "Triceps Dip" before "Dip". A
//    misordered rule does not error; it silently draws the wrong movement.
//
// 🔴 100% COVERAGE IS A BUILD GATE (`sanity-figures.mjs`). An unclassified
//    movement is a sheet that shows nothing, and a library with holes in it
//    reads as broken rather than as progress (HANDOFF-figures §8).

// Names that no keyword rule should be trusted with — either the words point at
// the wrong pattern, or the movement is a one-off. Checked FIRST.
const OVERRIDES = {
  'Dumbbell Pullover': 'pullover',
  'Straight Arm Lat Pull-Down': 'pullover',
  'Nordic Hamstring Curl': 'knee-flexion',
  'Glute Ham Raise': 'knee-flexion',
  'Rack Pull': 'hinge',
  'Upright Row': 'upright-row',
  'Lateral Sled High Pull': 'upright-row',
  'Power Shrug': 'shrug',
  'Dumbbell Batwing': 'row',
  'Dumbbell Row': 'lateral-raise',        // bank has this under Shoulders — it is a raise, not a row
  'Reverse Chin-Up': 'vertical-pull',
  'Chest Stretch': 'fly',
  'TRX Chest': 'push-up',
  'Push Ups Lock Off': 'push-up',
  'Trunk Stability Push-Up': 'push-up',
  'Single Leg Balance and Reach': 'hinge',
  'Landmine Hang Clean to Rotational Press': 'overhead-press',
  'Landmine Deadlift to Rotational Press': 'hinge',
  'Medicine Ball Crossover Step Throw': 'rotation',
  'Front Rotary Medicine Ball Press': 'chest-press',
  'Medicine Ball Rotary Punch Toss': 'chest-press',
  'Off-Bench Lateral Core Hold': 'side-bend',
  'Roman Chair Side Hold': 'side-bend',
  'Roman Chair Hold': 'back-extension',
  'Reverse Hyper Hold': 'back-extension',
  'Bodyweight Back Kick': 'hip-extension',
  'Cable Back Kick': 'hip-extension',
  'Machine Hip Extension': 'hip-extension',
  'Thread the Needle Exercise': 'rotation',
  'Sandbag Around the World': 'rotation',
  'Battling Ropes Rainbow': 'rotation',
  'Anti Rotation Landmine Rainbow': 'anti-rotation',
  'Anti Lateral Flexion Landmine Rainbow': 'side-bend',
  'Slide Board Simultaneous Abduction and Adduction': 'knee-tuck',
  'Slide Board Alternating Abduction and Adduction': 'knee-tuck',
  'Plank Pull Through': 'plank',
  'Bird Dog Crawl with Pull Through': 'bird-dog',
  'Dead Bug with Lateral Sled Pull': 'bird-dog',
  'Trx Reverse Plank Pull Through': 'reverse-plank',
  'High-Pulley Lateral Extension': 'lateral-raise',
  'Lower Traps Dip': 'dip',
  'Reverse-Grip Barbell Curl': 'curl',
  'Medicine Ball Rollout': 'rollout',
};

// Ordered keyword rules. `re` is tested against the movement name.
// KEEP THE COMMENTS: the order is the logic, and a future edit that moves a
// rule up or down changes what a hundred movements draw.
const RULES = [
  // ── core: the specific shapes first, because "plank", "press" and "raise"
  //    appear inside dozens of core names that are not planks or presses ──
  [/pallof|anti[- ]rotation/i, 'anti-rotation'],
  // BEFORE the rotation rule: "Shoulder External Rotation with Cable" contains
  // the word "rotation" and is not a trunk rotation at all.
  [/external rotation/i, 'external-rotation'],
  [/wood chop|cable lift|russian twist|\btwist\b|rotational slam|twisting|twister|rotary|rotational|\brotation\b|hip roll|tornado/i, 'rotation'],
  [/side bend|lateral flexion/i, 'side-bend'],
  [/side (elbow |straight-arm )?plank|lateral rolling plank/i, 'side-plank'],
  [/reverse plank/i, 'reverse-plank'],
  [/roll ?out|fallout/i, 'rollout'],
  [/windshield|leg lower|leg raise|leg circle|knee circle/i, 'leg-raise'],
  [/knee tuck|\bpike\b|body saw|mountain climber|army crawl|knee drive/i, 'knee-tuck'],
  [/bird dog|dead bug/i, 'bird-dog'],
  [/\bplank\b|stir the pot/i, 'plank'],
  [/crunch|sit-?up/i, 'crunch'],
  [/\bcarry\b|farmers walk|kettlebell walk/i, 'carry'],
  [/\bsled\b/i, 'sled'],

  // ── hips and glutes ──
  [/bridge|hip thrust|hip thruster/i, 'hip-bridge'],
  [/hyperextension|back extension|torso extension/i, 'back-extension'],
  [/clamshell|abduction|band walk/i, 'hip-abduction'],
  [/adduction/i, 'hip-adduction'],

  // ── knee and ankle ──
  [/leg extension/i, 'knee-extension'],
  [/leg curl/i, 'knee-flexion'],
  [/calf raise|toe raise/i, 'calf-raise'],
  [/leg press/i, 'leg-press'],
  [/hack squat|smith machine squat/i, 'squat-machine'],
  [/lunge|split squat|step-?up/i, 'lunge'],
  // The hinge family. Before `squat`, because "Landmine Deadlift…" and
  // "Single Leg Romanian Deadlift" both contain other pattern words.
  [/deadlift|good morning|romanian/i, 'hinge'],
  [/squat/i, 'squat'],

  // ── pressing ──
  [/bench press|barbell press|dumbbell press|dumbbell chest press/i, 'bench-press'],
  [/push-?up/i, 'push-up'],
  [/\bdip\b/i, 'dip'],
  [/\bfly\b|pec-deck fly|crossover/i, 'fly'],
  [/overhead press|shoulder press|behind the neck press|arnold|push press|landmine press|offset barbell press/i, 'overhead-press'],
  [/chest press|horizontal press/i, 'chest-press'],
  [/pushdown|kickback/i, 'triceps-pushdown'],
  [/triceps extension|overhead dumbbell triceps/i, 'triceps-overhead'],

  // ── shoulders and upper back ──
  [/shrug/i, 'shrug'],
  [/front raise|front dumbell raise/i, 'front-raise'],
  [/lateral raise|\bw raise\b|\by raise\b|pull apart|horizontal abduction|retraction|protraction|rear delt/i, 'lateral-raise'],

  // ── pulling ──
  [/pull-?up|chin-?up|pull-?down/i, 'vertical-pull'],
  [/\brow\b/i, 'row'],
  [/wrist curl/i, 'wrist-curl'],
  [/curl/i, 'curl'],

  // ── whatever is left that is clearly a press or a raise ──
  [/press/i, 'chest-press'],
  [/raise/i, 'lateral-raise'],
  [/throw|toss|punch/i, 'rotation'],
  [/hold/i, 'plank'],
];

export function archetypeFor(name) {
  if (OVERRIDES[name]) return OVERRIDES[name];
  for (const [re, id] of RULES) if (re.test(name)) return id;
  return null;
}

export const CLASSIFY_RULE_COUNT = RULES.length;
