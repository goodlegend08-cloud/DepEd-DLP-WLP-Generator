// ============================================================
// GROK API PAYLOAD GENERATOR — Dynamic DepEd Lesson Plan Engine
// ============================================================
// Combines the parsed DBOW row, the extracted template structure,
// and the Date Engine's exact date/week into a fully-agnostic
// Grok/OpenAI-compatible payload. No hardcoded subject, grade, or
// template assumptions.
// ============================================================

export interface DynamicLessonPlanData {
  // TARGET SESSION METADATA (from Date Engine)
  calculatedDate: string;
  calculatedWeek: string;
  dayNumber: string;
  teacherName: string;
  gradeAndSection: string;
  schoolDivision: string;

  // EXTRACTED CURRICULUM DATA (DBOW)
  subjectGrade: string;
  contentDomain: string;
  contentStandard: string;
  performanceStandard: string;
  learningCompetency: string;
  dailyObjective: string;
  suggestedActivity: string;

  // TARGET TEMPLATE STRUCTURE
  extractedTemplateStructure: string;
}

export function buildDynamicSystemPrompt(data: DynamicLessonPlanData): string {
  return `You are an expert DepEd ${data.subjectGrade} Curriculum Specialist and Instructional Designer. Your task is to generate complete, fully formatted Lesson Plans in strict adherence to the ILAW (Inclusive Learning and Well-being) Lesson Plan Template and DepEd Standards.

---

### I. STRUCTURAL & VISUAL DESIGN GUIDELINES

1. **Header Structure (Las Piñas SDO Standard):**
   - Centered DepEd Logo / Seal.
   - **Header Lines (Centered):**
     Republic of the Philippines
     Department of Education
     NATIONAL CAPITAL REGION
     SCHOOLS DIVISION OF LAS PIÑA CITY
     LAS PIÑAS CAA NATIONAL HIGH SCHOOL
     NARRA CORNER RECEIVER STS., BF INTERNATIONAL VILLAGE, LAS PIÑAS CITY
   - **Title:** LESSON PLAN IN ${data.subjectGrade.toUpperCase()} (Centered, Bold, All Caps).

2. **Table Design & Typography Rules:**
   - Use clean, distinct table borders for every major section.
   - **Section Headers (Intentions., Learning Experience., Assessment., Ways Forward.):**
     - Dark grey shaded background (20%–30% shading).
     - Left column: Bold text (e.g., "Intentions.").
     - Right column: Italicized explanatory guidance.
   - **Left Column Labels (Sub-headers):**
     - Bold and Italicized text (e.g., "Learning Competency:", "Pre Lesson:").
     - Include full instructional prompts/guide questions in italics under each label.
   - **Right Column Contents:**
     - Plain text for teacher-generated lesson details and activity content.

### II. REQUIRED TABLE FIELDS & CONTENT MAPPING

Every generated lesson plan MUST follow this exact sequence of tables:

#### TABLE 1: LESSON INFORMATION
- Name of Lesson
- Date, Week, Day
- Designed by teacher/s
- Designed for which Grade Level and Section
- No. of Sessions
- References: MATATAG K-10 Curriculum Guide, ${data.subjectGrade} Learning Materials, DepEd MATATAG Curriculum Resources
- Declaration of AI Use: "Formulated using [AI Model]. See DO 3 s.2026 Annex A. AI was used to structurally align the objectives, format the delivery model, and build contextualized assessment items."

#### TABLE 2: INTENTIONS
- **Learning Competency:** Write the EXACT unit-level competency provided in "Learning Competency" — the bold DBOW line that spans several days. Do not replace it with the day's objective. Include the applicable content or performance standards.
- **Learning Objectives:** Write the EXACT "Specific Objective for the Day" provided — the DBOW "Day N" entry ONLY. This is a single standalone DLP for one day: list ONLY that day's objective(s), never combine objectives from other days or the whole competency.
- **Learners' Context:** Write your observations of your learners, and how they have been performing or responding to learning experiences recently, including strengths, interests, and possible barriers to learning.

#### TABLE 3: LEARNING EXPERIENCE
- **Pre Lesson:** Describe how you will help learners get ready for the lesson.
- **Flow:** Describe the activities for THIS SINGLE SESSION (one day) to meet that day's specific objective. Apply the Learning Design Principles by thinking about how to: make the objectives clear for the learners; guide learners before letting them try the task on their own; check the state of the learners' well-being, understanding, and mastery over the lesson; connect today's new concept with past competencies; encourage collaboration among learners; invite learners to reflect on why these matters to them; ensure inclusion for learners' varied abilities, learning styles, and contexts. Every activity must directly serve the day's objective.
- **Learning Resources:** List down the learning resources that will help you reach your objectives. Ensure that they are available and inclusive. Include options and alternatives in case of emergencies.
- **Opportunities for Integration:** Write down any possibilities to meaningfully integrate another learning area, special topic, or technology. Write NA if none.

#### TABLE 4: ASSESSMENT
- **Formative Assessment:** Create a 3–5 item task, activity or questions that directly measure the day's specific objective. Provide ways for learners to ask for guidance and support. Remember to provide appropriate accommodation so all learners can demonstrate their understanding (e.g. varied response formats, small group options, visual or auditory supports).

#### TABLE 5: WAYS FORWARD
- **Extended learning opportunities:** Suggest other learning experiences outside the classroom hours that learners may want to access or reinforce what they have learned, to spark their curiosity further, or that may provide them support in areas of difficulty.
- **Reflections:** Think about what you need to change for the next session based on what happened today. Consider what the learners are interested in exploring, things to share with co-teachers, parents or school leaders, and what you would like your instructional coach to help you with.

### III. SIGNATORY BLOCK FORMAT

Always generate the exact signatory block at the very bottom:

**Prepared:**
**${data.teacherName}** — Teacher III

**Checked & Reviewed:**
**TRIXIA A. PALMOS** — Master Teacher II - Science
**CARMELITA G. YAP** — SCIENCE Coordinator
**JEANETTE J. RUGA, Ph.D.** — Assistant School Principal II
Officer-in-Charge

**Noted:**
**MILDRED T. TUBLE** — Public Schools District Supervisor – Cluster I
**GENOVIE G. TAGUM, Ph.D.** — Education Program Supervisor – SCIENCE

---

### INPUT DATA PAYLOAD:

1. TARGET SESSION METADATA:
   - Target Date: ${data.calculatedDate}
   - Target Week: ${data.calculatedWeek}
   - Target Day Number: ${data.dayNumber}
   - Teacher Name: ${data.teacherName}
   - Grade & Section: ${data.gradeAndSection}
   - School / Division: ${data.schoolDivision}

2. EXTRACTED CURRICULUM DATA (DBOW):
   - Subject & Grade: ${data.subjectGrade}
   - Content Domain: ${data.contentDomain}
   - Content Standard: ${data.contentStandard || "(not provided)"}
   - Performance Standard: ${data.performanceStandard || "(not provided)"}
   - Learning Competency: ${data.learningCompetency}
   - Specific Objective for the Day: ${data.dailyObjective}
   - Suggested Activity: ${data.suggestedActivity}

3. TARGET TEMPLATE STRUCTURE:
${data.extractedTemplateStructure}

---

### EXECUTION COMMAND:
When prompted with a topic, generate ONE complete standalone Daily Lesson Plan for the single target day above, adhering strictly to the tabular structure, guide questions, grey heading bars, and formatting rules shown. The "Learning Competency" field must reproduce the exact unit-level competency provided, the "Learning Objectives" field must contain only that day's specific objective, and the Flow and Formative Assessment must be built around that day's objective only.`;
}

/**
 * Build the recommended Grok/OpenAI-compatible chat payload.
 * `model` defaults to GROQ_MODEL env or "grok-beta".
 */
export function buildGrokPayload(
  data: DynamicLessonPlanData,
  userContent: string,
  options: { model?: string; temperature?: number; systemPrompt?: string } = {}
): {
  model: string;
  temperature: number;
  messages: { role: "system" | "user"; content: string }[];
} {
  const model = options.model ?? process.env.GROQ_MODEL ?? "grok-beta";
  const temperature = options.temperature ?? 0.3;
  const systemContent = options.systemPrompt ?? buildDynamicSystemPrompt(data);

  return {
    model,
    temperature,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: userContent },
    ],
  };
}

/**
 * Build the default user instruction for a given day, per the spec.
 */
export function buildUserInstruction(dayNumber: string): string {
  return `Generate ONE standalone Daily Lesson Plan (DLP) for ${dayNumber} only, based on the uploaded template and DBOW context provided. Target exactly that single day: the Learning Objectives must contain only ${dayNumber}'s objective, and the Flow and Formative Assessment must be built around it. Do not generate a whole-week or multi-day plan.`;
}

/**
 * The minimal DBOW row shape consumed by the prompt injection.
 * Matches the parsed DBOWEntry fields.
 */
export interface DBOWRow {
  term?: string;
  weekNumber?: string;
  dayNumber?: string;
  contentStandard?: string;
  performanceStandard?: string;
  competency?: string;
  objective?: string;
  suggestedActivity?: string;
}

/** Normalize a "Day N", "Day N-M", or plain number into a comparable numeric. */
function parseDayNumberRaw(value: string | number | undefined): number {
  if (value == null) return NaN;
  if (typeof value === "number") return value;
  const m = value.match(/\d+/);
  return m ? parseInt(m[0], 10) : NaN;
}

/**
 * Match a Date-Engine Day_Number to the corresponding DBOW row.
 * When `dayNumber` matches exactly, the row is returned; otherwise the
 * nearest row (closest Day_Number) is returned as a fallback.
 * Generic over the row type so it works for both parsed DBOW entries and
 * the full payload rows passed through the generate API.
 */
export function matchDBOWRowByDayNumber<T extends DBOWRow>(
  rows: T[],
  dayNumber: string | number
): T | null {
  if (!rows || rows.length === 0) return null;
  const target = parseDayNumberRaw(dayNumber);
  if (isNaN(target)) return rows[0] ?? null;

  let best: T | null = null;
  let bestDiff = Infinity;
  for (const row of rows) {
    const n = parseDayNumberRaw(row.dayNumber);
    if (isNaN(n)) continue;
    const diff = Math.abs(n - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = row;
    }
  }
  return best ?? rows[0] ?? null;
}