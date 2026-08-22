// ─── The figure text: what the fault is, and what it does ────────────────────
//
// PIERRE'S RULING, 2026-08-22: include it. "You can check the potential clinical
// injury documented for those specific moves. Those are known moves… we should
// build this library. Of course, later on I go through them."
//
// 🔴 REWRITTEN 2026-08-22 AFTER AN ADVERSARIAL REVIEW, and the rewrite is the
//    important part. The first version named a diagnosis per movement — ACL,
//    labrum, disc, meniscus, impingement — and attached an evidence grade to
//    each ("the classic", "the long-established mechanism", "a documented
//    cause"). Eight different strength-of-evidence phrasings across seven
//    entries, none of them checkable, and several of them wrong: the Leg Press
//    line had meniscal loading BACKWARDS (it peaks in deep flexion under
//    compression, not at terminal extension), and two entries leaned on the
//    subacromial-impingement model that shoulder medicine has largely moved on
//    from.
//
// 🔴 SO THE RULE IS NOW: SAY WHAT THE POSITION DOES, NOT WHAT IT CAUSES.
//    Mechanics are observable and uncontested — where the load goes, which
//    tissue is at the end of its range, what stops doing the work. Causation is
//    a claim about a population, it needs a citation this file cannot carry,
//    and a member who reads a named structure that can tear will map his own
//    aches onto it. No diagnosis, no named pathology, and no "documented",
//    "classic" or "known" doing the work of a source.
//
// The rest of the guardrails (HANDOFF-figures §5) are unchanged:
//    · MOVEMENT-LEVEL. Never a claim about a CLIENT, never a prescription,
//      never a treatment.
//    · ONE SENTENCE. Nobody reads a paragraph between sets.
//    · REVIEWABLE AND VERSIONED. `reviewed: false` until Elie has read the
//      entry, and the panel SAYS SO on screen — a flag nothing surfaces is a
//      safety process that exists only in a code comment.
//    · ARABIC FROM THE START, and the Arabic may not be STRONGER than the
//      English. The first version translated "mechanism" as "سبب" (cause),
//      quietly upgrading every hedge for half the audience.
//
// TRANSLITERATION (Elie, standing): where a literal Arabic translation would not
// be understood on the gym floor, use the English term in Arabic letters — and
// match the spelling already shipped in `exerciseNamesAr.js`, never invent a
// second one here. "back" is ظهر throughout; ضهر is a typo. "foot" is إجر, not
// رجل, which reads Egyptian.
//
// 🔴 THIS IS DATA, NOT UI COPY — it does NOT go through `t()`. `t()` returns the
//    KEY on a miss, which would print "flawBackSquat" to a member mid-set. Read
//    it through `figureText()` below, which returns null on a miss so the caller
//    can leave the section out.

export const FIGURE_TEXT_VERSION = 2;

const TEXT = {
  'Back Squat': {
    reviewed: false,
    flaw: {
      en: 'The knees travel inward as you drive out of the bottom, instead of tracking over the toes.',
      ar: 'الركبتين بيميلوا لجوّا وقت ما بتطلع من تحت، بدل ما يضلّوا فوق أصابع إجرك.',
    },
    injury: {
      en: 'A knee that sits inside the foot takes part of the load sideways across the joint instead of straight down through it, and the ligament on the inner side is what holds that.',
      ar: 'الركبة لمّا تكون جوّا عن الإجر، جزء من الوزن بيمرق عالجنب عبر المفصل بدل ما ينزل مستقيم، والرباط الداخلي هو يلّي بيمسك هالشدّ.',
    },
    cue: {
      en: 'Push the knees out over the toes on the way up.',
      ar: 'افتح ركبك لبرّا فوق أصابع إجرك وقت الطلوع.',
    },
  },

  'Deadlift': {
    reviewed: false,
    flaw: {
      en: 'The lower back rounds as the bar passes the knee, so the spine changes shape under load instead of holding it.',
      ar: 'أسفل الظهر بيتقوّس لبرّا وقت ما البار بيمرق عند الركبة، فالعمود الفقري بيغيّر شكلو تحت الوزن بدل ما يضلّ ثابت.',
    },
    injury: {
      en: 'When the back rounds, the work moves off the hips and onto the spine, and the load ends up carried by a back that is bending rather than by the muscles meant to be holding it still.',
      ar: 'لمّا الظهر يتقوّس، الشغل بينتقل من الورك عالعمود الفقري، فالوزن بيحملو ظهر عم ينثني بدل العضلات يلّي المفروض تثبّتو.',
    },
    cue: {
      en: 'Set the back before the bar moves, and keep that shape all the way up.',
      ar: 'ثبّت ظهرك قبل ما يتحرّك البار، وضلّ محافظ على نفس الوضعية لفوق.',
    },
  },

  'Chest Press Machine': {
    reviewed: false,
    flaw: {
      en: 'The elbows ride up above the line of the shoulders at the bottom of the press.',
      ar: 'الكوعين بيطلعوا فوق خط الكتف وقت بترجع الوزن لآخر نقطة.',
    },
    injury: {
      en: 'With the elbow above the shoulder, the joint is near the end of its range at the moment the load is heaviest, and the front of the shoulder is what takes it.',
      ar: 'لمّا الكوع يكون أعلى من الكتف، المفصل بيكون قريب من آخر مداه بنفس اللحظة يلّي الوزن فيها أتقل شي، وقدّام الكتف هو يلّي بيتحمّلو.',
    },
    cue: {
      en: 'Keep the elbows just below shoulder height through the whole rep.',
      ar: 'خلّي كوعك شوي تحت خط الكتف طول الحركة.',
    },
  },

  'Flat Barbell Press': {
    reviewed: false,
    flaw: {
      en: 'The arch is pushed past control and the hips come off the bench, so the lower back holds the position instead of the upper back and the legs.',
      ar: 'التقوّس لفوق بيزيد عن حدّو والورك بيطلع عن البنش، فأسفل الظهر بيصير هو يلّي ماسك الوضعية بدل أعلى الظهر والرجلين.',
    },
    injury: {
      en: 'With the hips off the bench the lower back is holding an arched position on its own while a loaded bar sits over the chest, and the base the press is supposed to push against is gone.',
      ar: 'والورك مرفوع عن البنش، أسفل الظهر بيصير ماسك التقوّس لحالو والبار محمّل فوق الصدر، وبتروح القاعدة يلّي المفروض تدفع منها.',
    },
    cue: {
      en: 'Keep the glutes on the bench and lift the chest with the upper back, not the lower.',
      ar: 'خلّي مؤخرتك على البنش وارفع صدرك من أعلى ظهرك، مش من أسفلو.',
    },
    // The SECOND fault, in the second camera. It gets its own line because it
    // is a different error in a different plane — and the third figure would be
    // decoration without a sentence saying what it is for. It does NOT repeat
    // the "from above" heading it renders under.
    extra: {
      en: 'The elbows have flared out square to the body. Bring them to about 45° from the ribs — square elbows put the shoulder at its widest angle exactly when the bar is heaviest.',
      ar: 'الكوعين مفتوحين عمودي على الجسم. رجّعهن لحدود ٤٥ درجة عن جنبك — الكوع المفتوح بيحطّ الكتف بأوسع زاوية بالضبط لمّا يكون البار أتقل شي.',
    },
  },

  'Pull-Up': {
    reviewed: false,
    flaw: {
      en: 'The elbows flare wide and the body swings, so the pull is thrown rather than driven from the back.',
      ar: 'الكوعين بيفتحوا لبرّا والجسم بيتمرجح، فبتصير ترمي حالك بدل ما تسحب من ظهرك.',
    },
    injury: {
      en: 'A wide, swung pull loads the front of the shoulder at the end of its range, at the point in the rep where the back muscles have stopped doing the holding.',
      ar: 'السحب العريض مع المرجحة بيحمّل قدّام الكتف بآخر مداه، بنفس اللحظة يلّي عضلات الظهر بتكون وقّفت تمسك فيها.',
    },
    cue: {
      en: 'Keep the elbows under the hands and pull the chest to the bar without swinging.',
      ar: 'خلّي كوعك تحت إيدك واسحب صدرك للبار بدون ما تتمرجح.',
    },
  },

  'Barbell Curl': {
    reviewed: false,
    flaw: {
      en: 'The lower back arches and the body swings back to throw the bar up, with the elbows drifting forward off the ribs.',
      ar: 'أسفل الظهر بيتقوّس لورا والجسم بيرجع لورا حتى يرمي البار لفوق، والكوعين بيروحوا لقدّام وبيبعدوا عن جنبك.',
    },
    injury: {
      en: 'Heaving the bar moves the work off the biceps and onto the lower back, which ends up swinging a load it is not in a position to hold.',
      ar: 'رمي البار بينقل الشغل من عضلة البايسبس لأسفل الظهر، فبيصير يرجّح وزن مش موجود بوضعية تمسكو.',
    },
    cue: {
      en: 'Pin the elbows to your ribs and let only the forearms move.',
      ar: 'ثبّت كوعك على جنبك وخلّي الساعد بس هو يلّي يتحرّك.',
    },
  },

  'Leg Press': {
    reviewed: false,
    flaw: {
      en: 'The knees are snapped hard into full lockout at the top of every rep.',
      ar: 'الركبة بتنقفل بقوّة لآخرها بأعلى نقطة بكل عدّة.',
    },
    injury: {
      en: 'Snapping into lockout hands the load from the quadriceps to a joint sitting at the very end of its range, so the muscle stops absorbing the sled and the leg takes the stop instead.',
      ar: 'لمّا تقفل ركبتك بقوّة، الوزن بينتقل من عضلة الفخذ لمفصل واصل لآخر مداه، فالعضلة بتبطّل تمتصّ الوزن وبتصير الإجر هي يلّي بتوقّفو.',
    },
    cue: {
      en: 'Stop just short of straight and keep the tension on the quads.',
      ar: 'وقّف قبل ما تفرد إجرك كلياً وخلّي الشدّ على عضلة الفخذ.',
    },
  },
};

// Returns { flaw, injury, cue, extra, reviewed } in the requested language, or
// null if this movement has no entry yet. NULL IS THE NORMAL CASE: 333 of the
// 340 movements have no text, and a screen must render fine without it (brief
// §7.14 — a movement with no figure is still listed).
export function figureText(name, lang) {
  const e = TEXT[name];
  if (!e) return null;
  const L = lang === 'ar' ? 'ar' : 'en';
  return {
    flaw: e.flaw[L], injury: e.injury[L], cue: e.cue[L],
    extra: e.extra ? e.extra[L] : null,
    reviewed: e.reviewed,
  };
}

export const FIGURE_TEXT_NAMES = Object.keys(TEXT);
