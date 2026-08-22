// ─── The figure text: what the fault is, and what it does ────────────────────
//
// 🔴 KEYED BY PATTERN, NOT BY MOVEMENT. A rounded back is a rounded back on a
//    Sumo Deadlift, a Rack Pull and a Dumbbell Romanian Deadlift — writing it
//    out 16 times would be 16 places to correct it and 16 chances to disagree
//    with itself. It also fixes the review economics that make this shippable:
//    Elie reads ~44 patterns, not 340 entries.
//
// PIERRE'S RULING, 2026-08-22: include the injury text. "Those are known
// moves… we should build this library. Of course, later on I go through them."
//
// 🔴 SAY WHAT THE POSITION DOES, NOT WHAT IT CAUSES. Mechanics are observable
//    and uncontested — where the load goes, which tissue is at the end of its
//    range, what stops doing the work. Causation is a claim about a population,
//    it needs a citation this file cannot carry, and a member who reads the name
//    of a structure that can tear will map his own aches onto it. No diagnosis,
//    no named pathology, and no "documented" / "classic" / "known" doing the
//    work of a source. `sanity-figures.mjs` FAILS THE BUILD on either.
//
//    That rule was written the hard way: the first version named a diagnosis per
//    movement and one of them (the leg press, on the meniscus) was backwards.
//
// The other guardrails (HANDOFF-figures §5) are unchanged:
//    · MOVEMENT-LEVEL. Never about a CLIENT, never a prescription or treatment.
//    · ONE SENTENCE. Nobody reads a paragraph between sets.
//    · `reviewed: false` until Elie has read it, AND THE PANEL SAYS SO — a flag
//      nothing renders is a safety process that exists only in a comment.
//    · The ARABIC MAY NOT BE STRONGER THAN THE ENGLISH. The first version
//      translated "mechanism" as سبب (cause) and upgraded every hedge for half
//      the audience.
//
// TRANSLITERATION (Elie, standing): where a literal Arabic translation would not
// be understood on the gym floor, use the English term in Arabic letters, and
// match the spelling already shipped in `exerciseNamesAr.js`. "back" is ظهر,
// "foot" is إجر.

export const FIGURE_TEXT_VERSION = 3;

const T = {
  squat: {
    flaw: { en: 'The knees travel inward as you drive out of the bottom, instead of tracking over the toes.',
      ar: 'الركبتين بيميلوا لجوّا وقت ما بتطلع من تحت، بدل ما يضلّوا فوق أصابع إجرك.' },
    injury: { en: 'A knee that sits inside the foot takes part of the load sideways across the joint instead of straight down through it, and the ligament on the inner side is what holds that.',
      ar: 'الركبة لمّا تكون جوّا عن الإجر، جزء من الوزن بيمرق عالجنب عبر المفصل بدل ما ينزل مستقيم، والرباط الداخلي هو يلّي بيمسك هالشدّ.' },
    cue: { en: 'Push the knees out over the toes on the way up.',
      ar: 'افتح ركبك لبرّا فوق أصابع إجرك وقت الطلوع.' },
  },
  'squat-machine': {
    flaw: { en: 'At the bottom the pelvis tucks under and the lower back comes away from the pad.',
      ar: 'بآخر النزلة الحوض بيلتفّ لتحت وأسفل الظهر بيبعد عن المسند.' },
    injury: { en: 'Once the pelvis tucks, the machine is loading a spine that is bending rather than a hip that is folding.',
      ar: 'لمّا يلتفّ الحوض، الجهاز بيصير يحمّل ظهر عم ينثني بدل ورك عم ينطوي.' },
    cue: { en: 'Stop the descent at the depth where your back is still flat on the pad.',
      ar: 'وقّف النزول عند العمق يلّي ظهرك لسا لاصق فيه بالمسند.' },
  },
  lunge: {
    flaw: { en: 'The front knee runs forward past the foot and the heel lifts off the floor.',
      ar: 'ركبة الرجل القدّامية بتروح لقدّام أبعد من الإجر والكعب بيرتفع عن الأرض.' },
    injury: { en: 'With the heel up, the whole rep is balanced on the front of the knee instead of shared with the hip.',
      ar: 'والكعب مرفوع، كل الحركة بتصير محمولة على قدّام الركبة بدل ما تتوزّع مع الورك.' },
    cue: { en: 'Keep the front heel down and the shin close to vertical.',
      ar: 'خلّي كعب الإجر القدّامية عالأرض والساق قريبة من العمودي.' },
  },
  hinge: {
    flaw: { en: 'The lower back rounds as the bar passes the knee, so the spine changes shape under load instead of holding it.',
      ar: 'أسفل الظهر بيتقوّس لبرّا وقت ما البار بيمرق عند الركبة، فالعمود الفقري بيغيّر شكلو تحت الوزن بدل ما يضلّ ثابت.' },
    injury: { en: 'When the back rounds, the work moves off the hips and onto the spine, and the load ends up carried by a back that is bending rather than by the muscles meant to be holding it still.',
      ar: 'لمّا الظهر يتقوّس، الشغل بينتقل من الورك عالعمود الفقري، فالوزن بيحملو ظهر عم ينثني بدل العضلات يلّي المفروض تثبّتو.' },
    cue: { en: 'Set the back before the bar moves, and keep that shape all the way up.',
      ar: 'ثبّت ظهرك قبل ما يتحرّك البار، وضلّ محافظ على نفس الوضعية لفوق.' },
  },
  'hip-bridge': {
    flaw: { en: 'The last part of the lift comes from arching the lower back rather than from squeezing the hips.',
      ar: 'آخر جزء من الرفعة بيجي من تقوّس أسفل الظهر مش من عصر المؤخرة.' },
    injury: { en: 'Arching past the top takes the load off the glutes and stacks it into the lower back at the end of its range.',
      ar: 'التقوّس بعد آخر نقطة بيشيل الوزن عن المؤخرة وبيكدّسو بأسفل الظهر بآخر مداه.' },
    cue: { en: 'Finish with the ribs down and the hips squeezed, not with the back arched.',
      ar: 'خلّص والقفص الصدري نازل والمؤخرة معصورة، مش والظهر متقوّس.' },
  },
  'knee-extension': {
    flaw: { en: 'The knee is snapped hard into full lockout at the top of every rep.',
      ar: 'الركبة بتنقفل بقوّة لآخرها بأعلى نقطة بكل عدّة.' },
    injury: { en: 'Snapping into lockout hands the load from the quadriceps to a joint sitting at the very end of its range.',
      ar: 'القفل بقوّة بينقل الوزن من عضلة الفخذ لمفصل واصل لآخر مداه.' },
    cue: { en: 'Stop just short of straight and hold the top for a beat.',
      ar: 'وقّف قبل ما تفرد إجرك كلياً وثبّت لحظة بالأعلى.' },
  },
  'knee-flexion': {
    flaw: { en: 'The hips lift off the pad so the whole body helps the heel come up.',
      ar: 'الورك بيرتفع عن المسند حتى كل الجسم يساعد الكعب يطلع.' },
    injury: { en: 'Once the hips lift, the hamstring stops being the thing shortening and the lower back takes the difference.',
      ar: 'لمّا يرتفع الورك، عضلة الهامسترينغ بتبطّل هي يلّي عم تشتغل وأسفل الظهر بياخد الفرق.' },
    cue: { en: 'Keep the hips pinned to the pad and move only the lower leg.',
      ar: 'خلّي وركك ثابت عالمسند وحرّك بس أسفل الإجر.' },
  },
  'calf-raise': {
    flaw: { en: 'The rep is bounced through a short range with the knee bending to help.',
      ar: 'العدّة بتنطّ بمدى قصير والركبة بتنثني حتى تساعد.' },
    injury: { en: 'A bounced, bent-knee rep loads the ankle on the way down instead of the calf on the way up.',
      ar: 'العدّة النطّيطة والركبة منثنية بتحمّل الكاحل وقت النزول بدل السمانة وقت الطلوع.' },
    cue: { en: 'Straight knee, all the way up, and control the way down.',
      ar: 'ركبة مفرودة، اطلع لآخرك، وتحكّم بالنزول.' },
  },
  'hip-abduction': {
    flaw: { en: 'The trunk leans away so the body throws the leg out instead of the hip lifting it.',
      ar: 'الجسم بيميل لجهة تانية حتى يرمي الإجر لبرّا بدل ما الورك يرفعها.' },
    injury: { en: 'Leaning turns a hip exercise into a side-bend, and the lower back does the range the hip did not.',
      ar: 'الميلان بيحوّل تمرين الورك لانحناء جانبي، وأسفل الظهر بياخد المدى يلّي ما أخدو الورك.' },
    cue: { en: 'Keep the trunk still and take the leg only as far as the hip can send it.',
      ar: 'ثبّت جسمك وودّي الإجر بس لحدّ ما بيقدر الورك يوصّلها.' },
  },
  'hip-adduction': {
    flaw: { en: 'The trunk leans into the movement instead of the inner thigh doing the work.',
      ar: 'الجسم بيميل مع الحركة بدل ما يشتغل داخل الفخذ.' },
    injury: { en: 'Leaning across shortens the range the adductors actually work through and hands the rest to the lower back.',
      ar: 'الميلان بيقصّر المدى يلّي بتشتغل فيه عضلات داخل الفخذ وبيعطي الباقي لأسفل الظهر.' },
    cue: { en: 'Sit tall and bring the leg in without following it with your body.',
      ar: 'اقعد مستقيم وقرّب إجرك بدون ما يتبعها جسمك.' },
  },
  'back-extension': {
    flaw: { en: 'The rep is driven past straight into an arch at the top.',
      ar: 'العدّة بتكمّل بعد الاستقامة لتقوّس بأعلى نقطة.' },
    injury: { en: 'Past straight there is no muscle range left, so the top of the movement is held by the joints of the lower back.',
      ar: 'بعد الاستقامة ما بيضلّ مدى للعضلة، فأعلى الحركة بتمسكو مفاصل أسفل الظهر.' },
    cue: { en: 'Stop when your body is a straight line — that is the top of the rep.',
      ar: 'وقّف لمّا يصير جسمك خط مستقيم — هيدي آخر العدّة.' },
  },
  'hip-extension': {
    flaw: { en: 'The leg only goes higher because the lower back has arched to send it.',
      ar: 'الإجر بتطلع أعلى بس لأنّ أسفل الظهر تقوّس حتى يبعتها.' },
    injury: { en: 'The extra height is coming from the spine, not the hip, so the glute stops working exactly where you wanted it to.',
      ar: 'الارتفاع الزيادة جايي من العمود الفقري مش من الورك، فالمؤخرة بتبطّل تشتغل بالضبط وين بدّك ياها.' },
    cue: { en: 'Keep the ribs down and stop when the hip runs out of range.',
      ar: 'خلّي القفص الصدري نازل ووقّف لمّا يخلص مدى الورك.' },
  },
  'leg-press': {
    flaw: { en: 'The knees are snapped hard into full lockout at the top of every rep.',
      ar: 'الركبة بتنقفل بقوّة لآخرها بأعلى نقطة بكل عدّة.' },
    injury: { en: 'Snapping into lockout hands the load from the quadriceps to a joint sitting at the very end of its range, so the muscle stops absorbing the sled and the leg takes the stop instead.',
      ar: 'لمّا تقفل ركبتك بقوّة، الوزن بينتقل من عضلة الفخذ لمفصل واصل لآخر مداه، فالعضلة بتبطّل تمتصّ الوزن وبتصير الإجر هي يلّي بتوقّفو.' },
    cue: { en: 'Stop just short of straight and keep the tension on the quads.',
      ar: 'وقّف قبل ما تفرد إجرك كلياً وخلّي الشدّ على عضلة الفخذ.' },
  },

  'bench-press': {
    flaw: { en: 'The arch is pushed past control and the hips come off the bench, so the lower back holds the position instead of the upper back and the legs.',
      ar: 'التقوّس لفوق بيزيد عن حدّو والورك بيطلع عن البنش، فأسفل الظهر بيصير هو يلّي ماسك الوضعية بدل أعلى الظهر والرجلين.' },
    injury: { en: 'With the hips off the bench the lower back is holding an arched position on its own while a loaded bar sits over the chest, and the base the press is supposed to push against is gone.',
      ar: 'والورك مرفوع عن البنش، أسفل الظهر بيصير ماسك التقوّس لحالو والبار محمّل فوق الصدر، وبتروح القاعدة يلّي المفروض تدفع منها.' },
    cue: { en: 'Keep the glutes on the bench and lift the chest with the upper back, not the lower.',
      ar: 'خلّي مؤخرتك على البنش وارفع صدرك من أعلى ظهرك، مش من أسفلو.' },
    extra: { en: 'The elbows have flared out square to the body. Bring them to about 45° from the ribs — square elbows put the shoulder at its widest angle exactly when the bar is heaviest.',
      ar: 'الكوعين مفتوحين عمودي على الجسم. رجّعهن لحدود ٤٥ درجة عن جنبك — الكوع المفتوح بيحطّ الكتف بأوسع زاوية بالضبط لمّا يكون البار أتقل شي.' },
  },
  'chest-press': {
    flaw: { en: 'The elbows ride up above the line of the shoulders at the bottom of the press.',
      ar: 'الكوعين بيطلعوا فوق خط الكتف وقت بترجع الوزن لآخر نقطة.' },
    injury: { en: 'With the elbow above the shoulder, the joint is near the end of its range at the moment the load is heaviest, and the front of the shoulder is what takes it.',
      ar: 'لمّا الكوع يكون أعلى من الكتف، المفصل بيكون قريب من آخر مداه بنفس اللحظة يلّي الوزن فيها أتقل شي، وقدّام الكتف هو يلّي بيتحمّلو.' },
    cue: { en: 'Keep the elbows just below shoulder height through the whole rep.',
      ar: 'خلّي كوعك شوي تحت خط الكتف طول الحركة.' },
  },
  'push-up': {
    flaw: { en: 'The hips drop and the body sags between the shoulders and the feet.',
      ar: 'الورك بينزل والجسم بيهبط بين الكتفين والإجرين.' },
    injury: { en: 'A sagging middle means the trunk has stopped holding the line, so the lower back is carrying the body instead of the abs.',
      ar: 'هبوط الوسط معناتو الجذع بطّل ماسك الخط، فأسفل الظهر عم يحمل الجسم بدل عضلات البطن.' },
    cue: { en: 'Squeeze the glutes and the abs so you move as one piece.',
      ar: 'اعصر مؤخرتك وبطنك حتى تتحرّك قطعة وحدة.' },
  },
  dip: {
    flaw: { en: 'The rep is dropped too deep and the shoulder finishes below the elbow.',
      ar: 'النزلة بتصير عميقة كتير والكتف بيخلص أوطى من الكوع.' },
    injury: { en: 'Below the elbow the shoulder is at the far end of its range carrying your whole bodyweight, and the front of the joint is where that lands.',
      ar: 'تحت الكوع، الكتف بيكون بآخر مداه وحامل كل وزن جسمك، وقدّام المفصل هو يلّي بياخد هالشدّ.' },
    cue: { en: 'Stop when the upper arm is level with the floor.',
      ar: 'وقّف لمّا يصير أعلى الذراع موازي للأرض.' },
  },
  fly: {
    flaw: { en: 'The arms open too far with the elbows locked straight.',
      ar: 'الإيدين بيفتحوا كتير والكوع مفرود لآخرو.' },
    injury: { en: 'A straight arm makes the weight leverage longest exactly where the shoulder has least range left.',
      ar: 'الإيد المفرودة بتخلّي ذراع الوزن أطول شي بالضبط وين الكتف ما ضلّ عندو مدى.' },
    cue: { en: 'Keep a soft bend in the elbows and stop when you feel the chest, not the joint.',
      ar: 'خلّي كوعك منثني شوي ووقّف لمّا تحسّ بالصدر، مش بالمفصل.' },
  },
  'overhead-press': {
    flaw: { en: 'The lifter leans back under the bar and presses with the lower back.',
      ar: 'الشخص بيرجع لورا تحت البار وبيدفع من أسفل الظهر.' },
    injury: { en: 'Leaning back turns a vertical press into an incline press, and the arch holding you there is the lower back at the end of its range.',
      ar: 'الرجوع لورا بيحوّل الدفع العمودي لدفع مايل، والتقوّس يلّي ماسكك هو أسفل الظهر بآخر مداه.' },
    cue: { en: 'Squeeze the glutes, keep the ribs down, and press straight up past your face.',
      ar: 'اعصر مؤخرتك، خلّي القفص الصدري نازل، وادفع مستقيم لفوق حدا وجهك.' },
  },
  'triceps-pushdown': {
    flaw: { en: 'The elbows travel forward and the body leans into the weight.',
      ar: 'الكوعين بيروحوا لقدّام والجسم بيميل على الوزن.' },
    injury: { en: 'Once the elbow moves, the shoulder and the trunk are doing the rep and the triceps are along for the ride.',
      ar: 'لمّا يتحرّك الكوع، الكتف والجذع بيصيروا هنّي يعملوا العدّة والترايسبس بس ماشي معهن.' },
    cue: { en: 'Pin the elbows at your sides and move only the forearms.',
      ar: 'ثبّت كوعك على جنبك وحرّك بس السواعد.' },
  },
  'triceps-overhead': {
    flaw: { en: 'The ribs flare and the lower back arches to get the elbows overhead.',
      ar: 'القفص الصدري بيفتح وأسفل الظهر بيتقوّس حتى يطلّع الكوعين فوق الراس.' },
    injury: { en: 'The range the shoulder cannot give is taken out of the lower back instead.',
      ar: 'المدى يلّي ما بيقدر يعطيه الكتف بينشدّ من أسفل الظهر بدلو.' },
    cue: { en: 'Brace the middle and only take the elbows as far back as the ribs allow.',
      ar: 'شدّ وسطك ورجّع كوعك بس لحدّ ما بيسمح القفص الصدري.' },
  },
  shrug: {
    flaw: { en: 'The elbows bend and the shrug turns into a half-row.',
      ar: 'الكوعين بينثنوا والهزّة بتصير نص تجديف.' },
    injury: { en: 'Bending the elbow means the arms are lifting the weight, so the traps never get the range the movement exists for.',
      ar: 'ثني الكوع معناتو الإيدين عم يرفعوا الوزن، فالترابيس عمرها ما بتاخد المدى يلّي انعمل التمرين لأجلو.' },
    cue: { en: 'Straight arms, shoulders straight up, and let them all the way back down.',
      ar: 'إيدين مفرودين، الكتفين لفوق مستقيم، وخلّيهن ينزلوا لآخرهن.' },
  },
  'external-rotation': {
    flaw: { en: 'The elbow drifts off the ribs and the shoulder swings instead of rotating.',
      ar: 'الكوع بيبعد عن جنب الجسم والكتف بيتأرجح بدل ما يلفّ.' },
    injury: { en: 'With the elbow away from the body the small muscles this drill trains stop being the ones working.',
      ar: 'والكوع بعيد عن الجسم، العضلات الصغيرة يلّي بيدرّبها هالتمرين بتبطّل هي يلّي عم تشتغل.' },
    cue: { en: 'Keep a towel between elbow and ribs and rotate only the forearm.',
      ar: 'خلّي فوطة بين الكوع وجنبك ولفّ بس الساعد.' },
  },
  'front-raise': {
    flaw: { en: 'The weight is swung up with a backward lean instead of lifted.',
      ar: 'الوزن بينرمى لفوق مع رجوع لورا بدل ما ينرفع.' },
    injury: { en: 'The swing means the shoulder never has to produce the range, and the lower back absorbs the stop at the top.',
      ar: 'المرجحة معناتها الكتف ما بيضطر يعمل المدى، وأسفل الظهر بيمتصّ الوقفة بالأعلى.' },
    cue: { en: 'Stand still and raise to shoulder height under control.',
      ar: 'وقّف ثابت وارفع لخط الكتف بتحكّم.' },
  },
  'lateral-raise': {
    flaw: { en: 'The arms go well above shoulder height and the shoulders ride up with them.',
      ar: 'الإيدين بيطلعوا كتير فوق خط الكتف والكتفين بيطلعوا معهن.' },
    injury: { en: 'Above the shoulder line the side of the shoulder has nothing left to give, so the joint finishes the range instead of the muscle.',
      ar: 'فوق خط الكتف، جنب الكتف ما بيضلّ عندو شي يعطيه، فالمفصل بيكمّل المدى بدل العضلة.' },
    cue: { en: 'Stop at shoulder height and keep the shoulders down away from your ears.',
      ar: 'وقّف عند خط الكتف وخلّي كتفيك نازلين بعيد عن ودانك.' },
  },

  'vertical-pull': {
    flaw: { en: 'The elbows flare wide and the body swings, so the pull is thrown rather than driven from the back.',
      ar: 'الكوعين بيفتحوا لبرّا والجسم بيتمرجح، فبتصير ترمي حالك بدل ما تسحب من ظهرك.' },
    injury: { en: 'A wide, swung pull loads the front of the shoulder at the end of its range, at the point in the rep where the back muscles have stopped doing the holding.',
      ar: 'السحب العريض مع المرجحة بيحمّل قدّام الكتف بآخر مداه، بنفس اللحظة يلّي عضلات الظهر بتكون وقّفت تمسك فيها.' },
    cue: { en: 'Keep the elbows under the hands and pull the chest to the bar without swinging.',
      ar: 'خلّي كوعك تحت إيدك واسحب صدرك للبار بدون ما تتمرجح.' },
  },
  row: {
    flaw: { en: 'The back rounds and the rep is jerked upward with the whole trunk.',
      ar: 'الظهر بيتقوّس والعدّة بتنشدّ لفوق بكل الجذع.' },
    injury: { en: 'Jerking from a rounded position means the spine is moving under the load instead of holding still while the arms pull.',
      ar: 'الشدّ من وضعية متقوّسة معناتو العمود الفقري عم يتحرّك تحت الوزن بدل ما يضلّ ثابت والإيدين تسحب.' },
    cue: { en: 'Set the back, then pull to the ribs with the elbows, not with the trunk.',
      ar: 'ثبّت ظهرك، وبعدين اسحب لعند الأضلاع بالكوعين، مش بالجذع.' },
  },
  'upright-row': {
    flaw: { en: 'The bar is pulled all the way up to the collarbone with the elbows above the shoulders.',
      ar: 'البار بينسحب لفوق لحدّ الترقوة والكوعين فوق الكتفين.' },
    injury: { en: 'That top position puts the shoulder at its most turned-in and most raised at the same time, which is where it has least room.',
      ar: 'هالوضعية بالأعلى بتخلّي الكتف بأقصى لفّة لجوّا وبأعلى ارتفاع بنفس الوقت، وهون بيكون عندو أقلّ مجال.' },
    cue: { en: 'Stop when the elbows reach shoulder height, and go a little wider on the grip.',
      ar: 'وقّف لمّا يوصلوا الكوعين لخط الكتف، ووسّع مسكتك شوي.' },
  },
  pullover: {
    flaw: { en: 'The ribs flare and the back lifts off the bench to reach further behind.',
      ar: 'القفص الصدري بيفتح والظهر بيرتفع عن البنش حتى توصل أبعد لورا.' },
    injury: { en: 'The extra reach is coming from the lower back opening up, not from the shoulder, and the weight is directly overhead when it happens.',
      ar: 'الوصول الزيادة جايي من انفتاح أسفل الظهر مش من الكتف، والوزن بيكون فوق الراس مباشرة وقتها.' },
    cue: { en: 'Keep the ribs down and stop where the shoulders stop.',
      ar: 'خلّي القفص الصدري نازل ووقّف وين بيوقفوا الكتفين.' },
  },
  curl: {
    flaw: { en: 'The lower back arches and the body swings back to throw the bar up, with the elbows drifting forward off the ribs.',
      ar: 'أسفل الظهر بيتقوّس لورا والجسم بيرجع لورا حتى يرمي البار لفوق، والكوعين بيروحوا لقدّام وبيبعدوا عن جنبك.' },
    injury: { en: 'Heaving the bar moves the work off the biceps and onto the lower back, which ends up swinging a load it is not in a position to hold.',
      ar: 'رمي البار بينقل الشغل من عضلة البايسبس لأسفل الظهر، فبيصير يرجّح وزن مش موجود بوضعية تمسكو.' },
    cue: { en: 'Pin the elbows to your ribs and let only the forearms move.',
      ar: 'ثبّت كوعك على جنبك وخلّي الساعد بس هو يلّي يتحرّك.' },
  },
  'wrist-curl': {
    flaw: { en: 'The whole arm moves, so the wrist never travels through its own range.',
      ar: 'كل الإيد عم تتحرّك، فالمعصم عمرو ما بياخد مداه.' },
    injury: { en: 'If the forearm is moving, the wrist is being carried rather than worked, and the elbow takes the load instead.',
      ar: 'إذا الساعد عم يتحرّك، المعصم عم ينحمل مش عم يشتغل، والكوع بياخد الوزن بدلو.' },
    cue: { en: 'Rest the forearm on your thigh and move only the hand.',
      ar: 'حطّ ساعدك على فخذك وحرّك بس إيدك.' },
  },
  carry: {
    flaw: { en: 'The body leans away from the load instead of bracing against it.',
      ar: 'الجسم بيميل بعيد عن الوزن بدل ما يشدّ ضدّو.' },
    injury: { en: 'Leaning hands the job to the lower back on one side, which is the exact thing a loaded carry is meant to train you not to do.',
      ar: 'الميلان بيعطي الشغلة لأسفل الظهر من جهة وحدة، وهيدا بالضبط الشي يلّي المشي بالوزن بيدرّبك ما تعملو.' },
    cue: { en: 'Stand tall, ribs down, and walk without tipping.',
      ar: 'وقّف مستقيم، القفص الصدري نازل، وامشي بدون ما تميل.' },
  },

  plank: {
    flaw: { en: 'The hips drop and the middle sags toward the floor.',
      ar: 'الورك بينزل والوسط بيهبط عالأرض.' },
    injury: { en: 'A sagging plank is no longer held by the abs — the lower back is holding the body up at the end of its range.',
      ar: 'البلانك الهابط ما عاد ماسكو عضلات البطن — أسفل الظهر هو يلّي ماسك الجسم بآخر مداه.' },
    cue: { en: 'Squeeze the glutes and tuck the ribs so you make one straight line.',
      ar: 'اعصر مؤخرتك واسحب أضلاعك لتحت حتى تصير خط مستقيم.' },
  },
  'side-plank': {
    flaw: { en: 'The bottom hip sinks toward the floor.',
      ar: 'الورك السفلي بيغوص عالأرض.' },
    injury: { en: 'Once the hip drops, the side of the trunk has stopped holding and the weight rests on the shoulder and the lower back.',
      ar: 'لمّا ينزل الورك، جنب الجذع بيبطّل ماسك والوزن بيرتاح عالكتف وأسفل الظهر.' },
    cue: { en: 'Push the floor away and lift the bottom hip until you are one line.',
      ar: 'ادفع الأرض وارفع الورك السفلي لحدّ ما تصير خط واحد.' },
  },
  'reverse-plank': {
    flaw: { en: 'The hips sink and the shoulders take the whole load.',
      ar: 'الورك بيغوص والكتفين بياخدوا كل الوزن.' },
    injury: { en: 'With the hips down the glutes are doing nothing, and the position is being held at the front of the shoulders.',
      ar: 'والورك نازل، المؤخرة ما عم تعمل شي، والوضعية عم تنمسك من قدّام الكتفين.' },
    cue: { en: 'Drive the hips up until your body is a straight line, and keep them there.',
      ar: 'ادفع وركك لفوق لحدّ ما يصير جسمك خط مستقيم، وخلّيه هيك.' },
  },
  crunch: {
    flaw: { en: 'The head is pulled forward with the hands and the trunk is hauled up by the hips.',
      ar: 'الراس بينسحب لقدّام بالإيدين والجذع بينشدّ لفوق من الورك.' },
    injury: { en: 'Pulling on the head moves the range into the neck, and hauling from the hips means the abs never shortened at all.',
      ar: 'شدّ الراس بينقل المدى للرقبة، والشدّ من الورك معناتو عضلات البطن عمرها ما قصّرت.' },
    cue: { en: 'Hands beside the head, not behind it, and curl the ribs toward the hips.',
      ar: 'إيديك حدا راسك مش وراه، ولفّ أضلاعك باتجاه وركك.' },
  },
  'leg-raise': {
    flaw: { en: 'The legs are lowered past the point where the lower back stays flat, and it peels off the floor.',
      ar: 'الإجرين بينزلوا أبعد من النقطة يلّي أسفل الظهر بيضلّ فيها مسطّح، فبيرتفع عن الأرض.' },
    injury: { en: 'Once the back lifts, the abs have let go and the weight of both legs is hanging off the lower spine.',
      ar: 'لمّا يرتفع الظهر، عضلات البطن بتكون تركت، ووزن الإجرين التنتين معلّق بأسفل العمود الفقري.' },
    cue: { en: 'Only go as low as you can keep your back pressed to the floor.',
      ar: 'انزل بس لحدّ ما بتقدر تخلّي ظهرك ملزوق بالأرض.' },
  },
  'knee-tuck': {
    flaw: { en: 'The hips pike up toward the ceiling and the trunk stops holding the line.',
      ar: 'الورك بيطلع لفوق والجذع بيبطّل ماسك الخط.' },
    injury: { en: 'A piked hip means the movement is now happening at the hip joint, and the abs are only along for the ride.',
      ar: 'ارتفاع الورك معناتو الحركة صارت بمفصل الورك، وعضلات البطن بس ماشية معها.' },
    cue: { en: 'Keep the hips level with the shoulders and bring the knees in with the abs.',
      ar: 'خلّي وركك بمستوى كتفيك وقرّب ركبك بعضلات بطنك.' },
  },
  rollout: {
    flaw: { en: 'The reach goes past what the trunk can hold and the hips drop as the back sags.',
      ar: 'المدّ بيزيد عن قدرة الجذع، فبينزل الورك والظهر بيهبط.' },
    injury: { en: 'The moment the back sags, the abs have released and the lower back is holding your whole bodyweight at full stretch.',
      ar: 'بنفس اللحظة يلّي بيهبط فيها الظهر، عضلات البطن بتكون تركت وأسفل الظهر ماسك كل وزن جسمك وهو ممدود لآخرو.' },
    cue: { en: 'Roll out only as far as you can keep the ribs tucked, and no further.',
      ar: 'مدّ بس لحدّ ما بتقدر تخلّي أضلاعك مسحوبة لتحت، ولا خطوة زيادة.' },
  },
  'anti-rotation': {
    flaw: { en: 'The trunk turns toward the load — which is the one thing the drill exists to stop.',
      ar: 'الجذع بيلتفّ باتجاه الوزن — وهيدا بالضبط الشي يلّي التمرين موجود حتى يمنعو.' },
    injury: { en: 'If the trunk turns, the load is being resisted by the lower back rotating rather than by the middle staying still.',
      ar: 'إذا التفّ الجذع، الوزن عم يتقاوم بلفّة من أسفل الظهر بدل ما يضلّ الوسط ثابت.' },
    cue: { en: 'Press straight out and keep your chest square to the front.',
      ar: 'ادفع مستقيم لقدّام وخلّي صدرك مواجه لقدّام.' },
  },
  rotation: {
    flaw: { en: 'The turn comes from the lower back while the feet and hips stay planted.',
      ar: 'اللفّة بتجي من أسفل الظهر والإجرين والورك ثابتين.' },
    injury: { en: 'The lower back has very little rotation available, so a turn taken there is a turn taken at the end of its range under load.',
      ar: 'أسفل الظهر عندو لفّة قليلة كتير، فأي لفّة منّو بتكون بآخر مداه وتحت وزن.' },
    cue: { en: 'Let the back foot pivot and turn from the hips, not the waist.',
      ar: 'خلّي إجرك الخلفية تلفّ ولفّ من وركك، مش من وسطك.' },
  },
  'side-bend': {
    flaw: { en: 'The bend goes further than the trunk is controlling, and the body leans back as well as sideways.',
      ar: 'الانحناء بيزيد عن يلّي الجذع ماسكو، والجسم بيميل لورا مع الجنب.' },
    injury: { en: 'Leaning back turns a side bend into a twist under load, and both ranges land on the same part of the lower back.',
      ar: 'الميلان لورا بيحوّل الانحناء الجانبي للفّة تحت وزن، والمديين التنين بينزلوا على نفس الجزء من أسفل الظهر.' },
    cue: { en: 'Bend straight to the side, ribs down, and come back to tall.',
      ar: 'انحني مستقيم عالجنب، أضلاعك نازلة، وارجع مستقيم.' },
  },
  'bird-dog': {
    flaw: { en: 'The back sags and the hip opens so the leg can go higher.',
      ar: 'الظهر بيهبط والورك بينفتح حتى الإجر تطلع أعلى.' },
    injury: { en: 'Height above the trunk line is coming from the lower back arching, and the point of the drill is that it should not move at all.',
      ar: 'الارتفاع فوق خط الجذع جايي من تقوّس أسفل الظهر، وفكرة التمرين إنّو ما يتحرّك أبداً.' },
    cue: { en: 'Reach long rather than high, and keep the back flat enough to balance a glass on.',
      ar: 'مدّ لبعيد مش لفوق، وخلّي ظهرك مسطّح لدرجة تقدر تحطّ عليه كاسة.' },
  },
  sled: {
    flaw: { en: 'The back rounds and the drive comes from the trunk instead of the legs.',
      ar: 'الظهر بيتقوّس والدفع بيجي من الجذع بدل الرجلين.' },
    injury: { en: 'A rounded back under a hard push means the legs have stopped supplying the force and the spine is transmitting it.',
      ar: 'ظهر متقوّس تحت دفع قوي معناتو الرجلين بطّلوا يعطوا قوّة والعمود الفقري صار هو يلّي ينقلها.' },
    cue: { en: 'Set a flat back at an angle and drive with the legs.',
      ar: 'ثبّت ظهرك مسطّح بزاوية وادفع بالرجلين.' },
  },
};

// Every entry starts life unreviewed. The panel prints that until Elie has been
// through it — see the header.
export function figureText(name, lang, archetype) {
  const e = T[archetype];
  if (!e) return null;
  const L = lang === 'ar' ? 'ar' : 'en';
  return {
    flaw: e.flaw[L], injury: e.injury[L], cue: e.cue[L],
    extra: e.extra ? e.extra[L] : null,
    reviewed: false,
  };
}

export const FIGURE_TEXT_PATTERNS = Object.keys(T);
