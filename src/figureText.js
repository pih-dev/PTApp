// ─── The figure text: what the fault is, and what it costs ───────────────────
//
// PIERRE'S RULING, 2026-08-22: include it. "You can check the potential clinical
// injury documented for those specific moves. Those are known moves… we should
// build this library. Of course, later on I go through them."
//
// 🔴 THE GUARDRAILS THAT KEEP THIS HONEST (HANDOFF-figures §5), and they are
//    not optional:
//    · MOVEMENT-LEVEL AND ESTABLISHED. "Rounding under load loads the lumbar
//      discs" is the known mechanism of a known error. Never a claim about a
//      CLIENT, never a diagnosis, never a prescription, never a treatment.
//    · ONE SENTENCE. If a cue needs a paragraph the figure is not doing its job
//      and nobody reads it between sets anyway.
//    · REVIEWABLE AND VERSIONED. `reviewed: false` until Elie has read the
//      entry; a correction is a one-line edit here. This is exactly the workflow
//      that got the 340 Arabic names reviewed, and it is the reason this can
//      ship before a review cycle exists rather than waiting for one.
//    · ARABIC FROM THE START. A safety cue that exists only in English is a
//      safety cue half this gym does not get.
//
// TRANSLITERATION (Elie, standing): where a literal Arabic translation would not
// be understood on the gym floor, use the English term in Arabic letters.
//
// 🔴 THIS IS DATA, NOT UI COPY — it does NOT go through `t()`. `t()` returns the
//    KEY on a miss, which would print "flawBackSquat" to a member mid-set. Read
//    it through `figureText()` below, which returns null on a miss so the caller
//    can leave the section out.

export const FIGURE_TEXT_VERSION = 1;

const TEXT = {
  'Back Squat': {
    reviewed: false,
    flaw: {
      en: 'The knees travel inward as you drive out of the bottom, instead of tracking over the toes.',
      ar: 'الركبتين بتميل لجوّا وقت بتطلع من تحت، بدل ما تضلّ فوق أصابع الرجل.',
    },
    injury: {
      en: 'Knees caving under load is a known stress on the MCL and the kneecap, and it is the classic ACL-risk position.',
      ar: 'ميلان الركبة لجوّا تحت الوزن معروف إنّو بيحمّل الرباط الداخلي وصابونة الركبة، وهي وضعية معروفة بخطر الرباط الصليبي.',
    },
    cue: {
      en: 'Push the knees out over the toes on the way up.',
      ar: 'ادفع ركبتيك لبرّا فوق أصابع رجليك وقت الطلوع.',
    },
  },

  'Deadlift': {
    reviewed: false,
    flaw: {
      en: 'The lower back rounds as the bar passes the knee, so the spine flexes under load instead of holding its position.',
      ar: 'أسفل الظهر بيتقوّس لبرّا وقت ما البار بيمرق عند الركبة، فالعمود الفقري بينثني تحت الوزن بدل ما يضلّ ثابت.',
    },
    injury: {
      en: 'Loaded spinal flexion is the long-established mechanism behind lumbar disc injury in the deadlift.',
      ar: 'انثناء العمود الفقري تحت الحمل هو السبب المعروف من زمان لإصابات ديسك أسفل الظهر بالدِدليفت.',
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
      ar: 'الكوع بيطلع فوق خط الكتف عند آخر نقطة برجوع الحركة.',
    },
    injury: {
      en: 'Pressing with the elbow above shoulder height narrows the space the rotator-cuff tendon passes through, the documented mechanism of shoulder impingement.',
      ar: 'الدفع والكوع أعلى من الكتف بيضيّق المساحة يلّي بيمرق فيها وتر الروتيتور كاف، وهيدا السبب المعروف لانحشار الكتف.',
    },
    cue: {
      en: 'Keep the elbows just below shoulder height through the whole rep.',
      ar: 'خلّي كوعك تحت خط الكتف شوي طول الحركة.',
    },
  },

  'Pull-Up': {
    reviewed: false,
    flaw: {
      en: 'The elbows flare wide and the body swings, so the pull is thrown rather than driven from the back.',
      ar: 'الكوعين بيفتحوا لبرّا والجسم بيتأرجح، فبتصير ترمي حالك بدل ما تسحب من ضهرك.',
    },
    injury: {
      en: 'A wide, swung pull loads the front of the shoulder at the end of its range — a known contributor to rotator-cuff and labral irritation.',
      ar: 'السحب العريض مع التأرجح بيحمّل قدّام الكتف بآخر مداه، وهيدا معروف إنّو بيهيّج الروتيتور كاف والغضروف.',
    },
    cue: {
      en: 'Keep the elbows under the hands and pull the chest to the bar without swinging.',
      ar: 'خلّي كوعك تحت إيدك واسحب صدرك للبار بدون تأرجح.',
    },
  },

  'Barbell Curl': {
    reviewed: false,
    flaw: {
      en: 'The lower back arches and the body swings back to throw the bar up, with the elbows drifting forward off the ribs.',
      ar: 'أسفل الظهر بيتقوّس والجسم بيرجع لورا حتى يرمي البار لفوق، والكوعين بيتقدّموا عن جنب الجسم.',
    },
    injury: {
      en: 'Repeatedly heaving into lumbar extension under load is a known source of lower-back joint irritation.',
      ar: 'الرمي المتكرّر مع تقوّس أسفل الظهر تحت الوزن معروف إنّو بيهيّج مفاصل أسفل الضهر.',
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
      en: 'Locking out hard hands the load from the quadriceps to the joint itself, a documented cause of knee joint and meniscus stress on this machine.',
      ar: 'القفل القوي بينقل الوزن من عضلة الفخذ لمفصل الركبة نفسه، وهيدا سبب معروف لإجهاد المفصل والغضروف الهلالي على هالجهاز.',
    },
    cue: {
      en: 'Stop just short of straight and keep the tension on the quads.',
      ar: 'وقّف قبل ما تفرد رجلك كلياً وخلّي الشدّ على عضلة الفخذ.',
    },
  },
};

// Returns { flaw, injury, cue, reviewed } in the requested language, or null if
// this movement has no reviewed-or-unreviewed entry yet. NULL IS THE NORMAL
// CASE: 334 of the 340 movements have no text, and a screen must render fine
// without it (brief §7.14 — a movement with no figure is still listed).
export function figureText(name, lang) {
  const e = TEXT[name];
  if (!e) return null;
  const L = lang === 'ar' ? 'ar' : 'en';
  return { flaw: e.flaw[L], injury: e.injury[L], cue: e.cue[L], reviewed: e.reviewed };
}

export const FIGURE_TEXT_NAMES = Object.keys(TEXT);
