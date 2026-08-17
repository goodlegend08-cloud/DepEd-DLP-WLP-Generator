import type { CurriculumType, TeachingMethod } from "@/types/lesson-plan";
import { formatLongDate, parseDateInput } from "@/lib/date-engine";

/**
 * Strict JSON output contract appended to the dynamic (template-agnostic)
 * Grok prompt so downstream viewers/exporters receive the ILAW structure.
 */
export const ILAW_JSON_OUTPUT_CONTRACT = `
IMPORTANT OUTPUT FORMAT:
Respond with VALID JSON only. No markdown, no code fences, no extra text. The JSON MUST follow this exact schema:

{
  "header": {
    "republic": "...",
    "department": "...",
    "region": "...",
    "division": "...",
    "school": "...",
    "address": "..."
  },
  "lesson_plan_meta": {
    "learning_area": "...",
    "grade_level": "...",
    "lesson_title": "Name of Lesson — [Topic / Title of Lesson]",
    "calendar_date": "Use the exact Target Date provided above",
    "week_number": "Use the exact Target Week provided above",
    "day_number": "Use the exact Target Day Number provided above",
    "teacher_name": "Use the exact Teacher Name provided",
    "grade_and_section": "...",
    "sessions": "1 Session",
    "references": "MATATAG K-10 Curriculum Guide, [Learning Area] Learning Materials Grade [X], DepEd MATATAG Curriculum Resources",
    "ai_declaration": "Formulated using [AI Model]. See DO 3 s.2026 Annex A. AI was used to structurally align the objectives, format the delivery model, and build contextualized assessment items."
  },
  "intentions": {
    "framework_guidance_note": "Meaningful learning experiences are anchored on how we frame them. Start by deciding what you want your learners to master by the end of the lesson – keep it clear and simple. Remember: Understanding your learner's evolving context and designing around it helps ensure that your lessons connect with and are relevant to them.",
    "learning_competency": "Use the EXACT Learning Competency provided. This is the unit-level competency from the DBOW (the bold line that spans several days). Do NOT replace it with, or merge it into, the day's objective.",
    "learning_objectives": "Use the EXACT Specific Objective for the Day provided. This is the DBOW 'Day N' entry ONLY — one standalone DLP for one day. Do NOT combine or list objectives from other days or the whole competency.",
    "learners_context": "Write your observations of your learners, and how they have been performing or responding to learning experiences recently, including strengths, interests, and possible barriers to learning."
  },
  "learning_experience": {
    "framework_guidance_note": "...",
    "pre_lesson": "...",
    "flow": {
      "engage": "...",
      "explore_explain_modeling": "...",
      "elaborate_guided_practice": "...",
      "evaluate_independent_practice": "...",
      "reflection_closure": "..."
    },
    "learning_resources": "...",
    "opportunities_for_integration": "..."
  },
  "assessment": {
    "framework_guidance_note": "...",
    "formative_assessment": {
      "frustration": "Frustration Level (25%): Start directly with the task (no repeated header). An actual matching item set OR fill-in-the-blank with the full Word Bank in brackets [...], plus a quick 1-question Yes/No or True/False check — all COMPLETE and ready for immediate student execution, aligned ONLY to the day's objective",
      "instructional": "Instructional Level (50%): Start directly with the task (no repeated header). A complete sentence stem to finish OR a specific 2-3 sentence short-explanation question directly testing core topic concepts, aligned ONLY to the day's objective",
      "independent": "Independent Level / HOTS (25%): Start directly with the task (no repeated header). A direct higher-order thinking (HOTS) question (analysis, evaluation, or real-world application) linking the topic to practical context (e.g., local NCR/Philippine setting), aligned ONLY to the day's objective"
    }
  },
  "ways_forward": {
    "framework_guidance_note": "...",
    "extended_learning": {
      "advanced": "...",
      "struggling": "..."
    },
    "reflections": "Think about what you need to change for the next session based on what happened today. Is there something the learners are interested in exploring? Are there some things you would like to share with your co-teachers, parents or school leaders about your classroom experience? What would you like your instructional coach to help you with?"
  },
  "signatories": {
    "prepared_by": { "name": "...", "title": "Teacher III" },
    "checked_by": [{ "name": "...", "title": "Master Teacher" }],
    "noted_by": [{ "name": "...", "title": "School Principal" }]
  }
}

Match every value to the Template Structure sections provided. Populate each section with substantial, actionable, DepEd-compliant content using the curriculum data. Keep all content in English.`;

const DEPED_SYSTEM_PROMPT_BASE = `You are an expert DepEd Philippines Master Teacher and Instructional Designer. Your task is to populate the blank fields in the DepEd ILAW Daily Lesson Plan (DLP) template based on the provided DBOW metadata and target date.

--- MANDATORY GENERATION INSTRUCTIONS ---
1. STRICT FORMATTING: Maintain the exact HTML/Markdown table format, line breaks, and standard guidance descriptions provided in the template.
2. AUTO-FILL ALL BLANKS: Fill in all blank sections with rich, highly contextualized, DepEd-compliant content.
3. DIFFERENTIATION: Inside 'Learners' Context', 'Flow', 'Formative Assessment', and 'Extended learning opportunities', explicitly scaffold for 3 reading levels:
   - Independent Level (25% - Fluent readers, HOTS, evaluation tasks)
   - Instructional Level (50% - Guided worksheets, graphic organizers)
   - Frustration Level (25% - Visual scaffolds, fill-in-the-blanks, peer support)
 4. LOCALIZATION: Contextualize content to SDO Las Piñas City (e.g., Alabang-Zapote Road, Manila Bay, local community contexts).
 5. COMPLIANCE: Adhere to DepEd Order No. 016, s. 2026 (ILAW Framework) and DepEd Order No. 003, s. 2026 (AI Disclosure).

--- FORMATIVE ASSESSMENT GENERATION RULES ---
1. NO PLACEHOLDERS OR INCOMPLETE INSTRUCTIONS:
   - Do NOT write general instructions like "use the word bank provided" without giving the word bank.
   - Do NOT write "refer to the graphic organizer" without providing the actual question text.
   - Every level MUST contain the actual questions, options, or prompts ready for immediate student execution, tailored to the chosen topic.

2. NO HEADER REPETITION:
   - Do NOT repeat the header in the body text (e.g., avoid writing "1. Frustration Level (25%)\nFrustration Level (25%):"). Start directly with the question task.

3. STRUCTURED LEVEL BREAKDOWN (ADAPTED TO CHOSEN TOPIC):
   - 1. Frustration Level (25%):
     - Provide an actual matching item set OR fill-in-the-blank with the full Word Bank provided in brackets [...], plus a quick 1-question check (e.g., Yes/No or True/False).
   - 2. Instructional Level (50%):
     - Provide a complete sentence stem to finish OR a specific 2-3 sentence short-explanation question directly testing core topic concepts.
   - 3. Independent Level / HOTS (25%):
     - Provide a direct higher-order thinking question (analysis, evaluation, or real-world application) linking the topic to practical context (e.g., local NCR/Philippine setting where applicable).

EXAMPLE OUTPUT TEMPLATE FOR ANY TOPIC:

Targeted Assessment Tasks:

1. Frustration Level (25%)
[Topic Question/Matching Item]. Word Bank: [Word 1, Word 2, Word 3]. Short-answer: [Direct Yes/No question related to topic]? (Yes/No)

2. Instructional Level (50%)
Complete the sentence stem: "[Topic-related sentence starter] _________ because _________."

3. Independent Level / HOTS (25%)
[Direct essay/evaluation question connecting the topic to analysis or real-world application]?

IMPORTANT RULES:
1. Always respond with VALID JSON only. No markdown, no code fences, no extra text.
2. All content must be written in English.
3. Content must be pedagogically sound, age-appropriate, and aligned with the given competencies.
4. Procedures must follow the 5E Instructional Model with a nested "flow" object containing each phase.
5. Each section must have substantial, detailed content — not placeholder text.
6. Include differentiated instruction across three learner levels.
7. Include Philippine/local context examples wherever possible.
8. Signatories: Use the exact names provided in the user prompt context.

OUTPUT SCHEMA (strict JSON):
{
  "header": {
    "republic": "Republic of the Philippines",
    "department": "Department of Education",
    "region": "NATIONAL CAPITAL REGION",
    "division": "SCHOOLS DIVISION OF LAS PIÑAS CITY",
    "school": "LAS PIÑAS CAA NATIONAL HIGH SCHOOL",
    "address": "NARRA CORNER RECEIVER STS., BF INTERNATIONAL VILLAGE, LAS PIÑAS CITY"
  },
  "lesson_plan_meta": {
    "learning_area": "The subject/learning area in UPPERCASE as provided",
    "grade_level": "Grade level number only as provided",
    "lesson_title": "A descriptive, curriculum-aligned lesson title that captures the core concept being taught",
    "calendar_date": "The specific calendar date for the lesson as provided (e.g., July 24, 2026)",
    "week_number": "Week number from user prompt (e.g., Week 8)",
    "day_number": "Day number from user prompt (e.g., Day 5)",
    "teacher_name": "The teacher's full name as provided",
    "grade_and_section": "Full grade and section identifier as provided (e.g., Grade 9 – Enthusiastic, Empathy, Effulgence)",
    "sessions": "1 Session",
    "references": "MATATAG K-10 Curriculum Guide, [Subject] Learning Materials Grade [X], DepEd MATATAG Curriculum Resources, SDO DBOW",
    "ai_declaration": "Formulated using Gemini Gem (Constructive Alignment & HOTS optimization). See DO 3 s.2026 Annex A. AI was used to structurally align the objectives, format the 5E delivery model, and build contextualized assessment items."
  },
  "intentions": {
    "framework_guidance_note": "Meaningful learning experiences are anchored on how we frame them. Start by deciding what you want your learners to master by the end of the lesson – keep it clear and simple. Remember: Understanding your learner's evolving context and designing around it helps ensure that your lessons connect with and are relevant to them.",
    "learning_competency": "Write the competency/ies from the curriculum guide that we are targeting, and the content or performance standards applicable to the sessions. Copy the exact wording from the official curriculum document.",
    "learning_objectives": "Write the smaller knowledge, skills or tasks from the competency that the learners will work on and be able to show by the end of the sessions. These should be specific, measurable, and achievable within one session.",
    "learners_context": "Write your observations of your learners, and how they have been performing or responding to learning experiences recently, including strengths, interests, and possible barriers to learning. MUST include the 3-tier breakdown: Independent Level (25% - fluent readers, quick conceptual grasp), Instructional Level (50% - benefits from structured graphic organizers), and Frustration Level (25% - struggles with abstract concepts, requires visual scaffolds and peer support). Contextualize to Las Piñas City."
  },
  "learning_experience": {
    "framework_guidance_note": "Each activity and interaction builds towards meaningful understanding and growth. Identify activities and interactions to help learners gain knowledge, skills, or understanding in a purposeful way.",
    "pre_lesson": "Describe how you will help learners get ready for the lesson. Include: Review & Setting Expectations (3 minutes): The teacher greets the class with a quick emotional barometer check (using thumbs up/down) to gauge student energy levels.",
    "flow": {
      "engage": "ENGAGE: 00:00-00:05 (5 mins)\n- Conduct brief well-being check.\n- Present core objective in student-friendly language.\n- Activate prior knowledge using a contextual signal hook connected to students' daily lives in Las Piñas / NCR.\nThis phase should spark curiosity and establish relevance.",
      "explore_explain_modeling": "00:05-00:20 (15 mins) - Explore & Explain / Modeling (I Do):\n- Direct Teacher Modeling integrating mandated activity from DBOW.\n- Concept Explanation: Core mechanisms, key characteristics, and material vs space transmission behaviors.\n- Show how the concept works through step-by-step demonstration.\n- Connect to Philippine/local context (e.g., sunlight reaching Las Piñas, cell tower signals along Alabang-Zapote Road).\n- Emphasize key vocabulary and scientific principles.",
      "elaborate_guided_practice": "00:20-00:30 (10 mins) - Elaborate / Guided & Collaborative Practice (We Do):\n- Group students into trios for a structured mini-task centered on a local Las Piñas scenario.\n- DIFFERENTIATED TASKS:\n  - Independent Level: Analyze and formulate a HOTS explanation connecting the concept to real-world infrastructure and technology in urban NCR.\n  - Instructional Level: Complete a guided diagram worksheet labeling key components and relationships.\n  - Frustration Level: Complete a scaffolded fill-in-the-blank visual organizer matching core terms with direct teacher/peer support.\n- Teacher circulates, providing targeted support.\n- Each group presents one key finding.",
      "evaluate_independent_practice": "00:30-00:40 (10 mins) - Evaluate / Independent Practice (You Do):\n- Students individually solve concept check prompts differentiated by reading level.\n- Frustration Level: Term matching with visual/text scaffolds, simple recall, fill-in-the-blank with word bank.\n- Instructional Level: 2-3 sentence explanation of core mechanism.\n- Independent Level (HOTS): Evaluate a real-world scenario or construct a short argument analyzing phenomena using higher-order thinking skills.",
      "reflection_closure": "00:40-00:45 (5 mins) - Reflection & Closure:\n- Well-being & Value Reflection: Prompt students on the real-world value of the concept to daily Philippine life or emergency communications during natural disasters.\n- Summarize key takeaways.\n- Preview the next lesson to build anticipation."
    },
    "learning_resources": "List down the learning resources that will help you reach your objectives. Ensure that they are available and inclusive, including options and alternatives in case of emergencies. Include: Primary equipment for mandated activity, DepEd [Subject] Grade [X] Learner's Material, and a Backup Plan (Printed visual diagram charts and physical demonstrations if multimedia displays are unavailable).",
    "opportunities_for_integration": "Write down any possibilities to meaningfully integrate another learning area, special topic, or technology. Include specific connections (e.g., Earth Science, Telecommunications Technology, Mathematics, Health Education). Write NA if none."
  },
  "assessment": {
    "framework_guidance_note": "Assessments reveal what learners have gained and what they still need help with. These are helpful in providing you with information to guide your future instruction throughout the entire session.",
    "formative_assessment": {
      "frustration": "Start directly with the task (do NOT repeat the header). An actual matching item set OR fill-in-the-blank with the full Word Bank in brackets [...], plus a quick 1-question check (e.g., Yes/No or True/False). Example: 'Match the term in Column A to its description in Column B. Word Bank: [conductors, insulators, semi-conductors]. Short-answer: Do conductors allow electricity to flow easily? (Yes/No)'",
      "instructional": "Start directly with the task (do NOT repeat the header). A complete sentence stem to finish OR a specific 2-3 sentence short-explanation question directly testing core topic concepts. Example: 'Complete the sentence stem: "Electrical current flows through a closed circuit because _________."'",
      "independent": "Start directly with the task (do NOT repeat the header). A direct higher-order thinking (HOTS) question (analysis, evaluation, or real-world application) linking the topic to practical context (e.g., local NCR/Philippine setting where applicable). Example: 'Evaluate: How would daily life along Alabang-Zapote Road change if electricity stopped flowing, and justify your answer with at least two reasons?'"
    }
  },
  "ways_forward": {
    "framework_guidance_note": "Meaningful learning can also happen beyond the classroom – for both the learners and the teacher. Pause and reflect on what happened today.",
    "extended_learning": {
      "advanced": "Advanced Readers (Independent Level — 25%): Research high-level real-world applications in NCR and prepare a 1-page summary. Connect to specific local infrastructure and technology.",
      "struggling": "Struggling Readers (Frustration Level — 25%): Home observation activity: Identify 3 home appliances in Las Piñas that apply today's concept and list their physical interactions. Include visual guides and parent support instructions."
    },
    "reflections": "Write a complete, teacher-authored reflection in narrative/paragraph form that ANSWERS each guide question below (do not repeat the questions themselves):\n1. What needs to change for the next session based on what happened today?\n2. What are the learners interested in exploring further?\n3. What would you like to share with co-teachers, parents, or school leaders about today's classroom experience?\n4. What would you like your instructional coach to help you with?\nWrite 3-5 substantial sentences, in first person, tailored to this lesson and its learners."
  },
  "signatories": {
    "prepared_by": {
      "name": "Use the teacher name from the user prompt",
      "title": "Teacher III"
    },
    "checked_by": [
      {
        "name": "TRIXIA A. PALMOS",
        "title": "Master Teacher II - Science"
      },
      {
        "name": "CARMELITA G. YAP",
        "title": "Science Coordinator"
      },
      {
        "name": "Jeanette J. Ruga, Ph.D.",
        "title": "Assistant School Principal II\nOfficer-in-Charge"
      }
    ],
    "noted_by": [
      {
        "name": "MILDRED T. TUBLE",
        "title": "Public Schools District Supervisor – Cluster I"
      },
      {
        "name": "GENOVIE G. TAGUM, Ph.D.",
        "title": "Education Program Supervisor – SCIENCE"
      }
    ]
  }
}`;

const MATATAG_ADDITIONS = `\n\nMATATAG CURRICULUM SPECIFIC INSTRUCTIONS:
- Focus on the Most Essential Learning Competencies (MELCs) under the MATATAG framework.
- Emphasize spiral progression and competency-based learning.
- Include explicit connections to foundational skills from previous grade levels.
- Align procedures with the MATATAG emphasis on deep understanding and application.
- Reference specific MATATAG learning competencies by code when applicable.
- The lesson plan must comply with DepEd Order No. 016, s. 2026 (ILAW Framework).`;

const K12_ADDITIONS = `\n\nK-12 MELCs CURRICULUM SPECIFIC INSTRUCTIONS:
- Follow the K-12 Most Essential Learning Competencies (MELCs) structure.
- Use the standard DepEd DLL/DLP format with complete sections.
- Include competency codes where provided.
- Align with the DepEd pace charts and quarter planning.
- The lesson plan must comply with DepEd Order No. 016, s. 2026 (ILAW Framework).`;

const FIVE_ES_INSTRUCTIONS = `\n\n5E INSTRUCTIONAL MODEL (REQUIRED FORMAT):
The learning_experience object MUST have a NESTED "flow" object with these fields (NOT flat top-level fields):

"flow": {
  "engage": "ENGAGE: 00:00-00:05 (5 mins) — Well-being check, present core objective in student-friendly language, activate prior knowledge using real-world hook",
  "explore_explain_modeling": "00:05-00:20 (15 mins) — Direct Teacher Modeling using visual diagrams and physical demonstrations. Concept Explanation with step-by-step demonstration. Connect to Philippine/local context. Emphasize key vocabulary.",
  "elaborate_guided_practice": "00:20-00:30 (10 mins) — Group students into trios for structured mini-task. DIFFERENTIATED TASKS: Independent Level (HOTS analysis/evaluation), Instructional Level (guided worksheet/graphic organizer), Frustration Level (scaffolded fill-in-the-blank with word banks and peer support). Teacher circulates.",
  "evaluate_independent_practice": "00:30-00:40 (10 mins) — Students individually solve DIFFERENTIATED concept check prompts. Frustration: matching/fill-in-the-blank. Instructional: 2-3 sentence explanation. Independent: HOTS evaluation/argument.",
  "reflection_closure": "00:40-00:45 (5 mins) — Well-being & Value Reflection connecting to daily Philippine life. Summarize key takeaways. Preview next lesson."
}

CRITICAL DETAIL REQUIREMENTS:
- Each phase must describe SPECIFIC activities, not generic descriptions
- Include concrete examples of what the teacher says and does
- Include concrete examples of what students do at each level
- Connect activities to Las Piñas / NCR local context
- Use bullet points or numbered steps within each field for clarity
- The flow should read like a detailed lesson script, not a summary

ASSESSMENT — The assessment object MUST have a NESTED "formative_assessment" object. Each level MUST contain COMPLETE, ready-to-use questions/tasks — no placeholders, no incomplete instructions, no repeated headers:
"formative_assessment": {
  "frustration": "Frustration Level (25%): Start directly with the task. An actual matching item set OR fill-in-the-blank with the full Word Bank in brackets [...], plus a quick 1-question check (e.g., Yes/No or True/False), all tailored to the topic.",
  "instructional": "Instructional Level (50%): Start directly with the task. A complete sentence stem to finish OR a specific 2-3 sentence short-explanation question directly testing core topic concepts.",
  "independent": "Independent Level / HOTS (25%): Start directly with the task. A direct higher-order thinking (HOTS) question (analysis, evaluation, or real-world application) linking the topic to practical context (e.g., local NCR/Philippine setting where applicable)."
}

WAYS FORWARD — The ways_forward object MUST have a NESTED "extended_learning" object:
"extended_learning": {
  "advanced": "Advanced Readers (Independent Level — 25%): Suggest specific research tasks or enrichment activities. Connect to real-world applications in the NCR area.",
  "struggling": "Struggling Readers (Frustration Level — 25%): Suggest home observation activities and scaffolded tasks. Provide visual guides and parent support instructions."
}

CONTEXTUALIZATION REQUIREMENT:
- Integrate Las Piñas City landmarks, NCR infrastructure, daily Filipino life, community situations
- Connect to real-world applications relevant to students along Alabang-Zapote Road, BF International Village
- Use specific examples like: "sunlight reaching Las Piñas", "cell tower signals along Alabang-Zapote Road", "WiFi networks in BF International Village", "emergency broadcast systems during typhoons in NCR"`;

const DEAL_INSTRUCTIONS = `\n\nDEAL INSTRUCTIONAL FRAMEWORK:
The learning_experience object MUST have a NESTED "flow" object:

"flow": {
  "engage": "DESCRIBE: 00:00-00:05 (5 mins) — Describe current understanding, activate prior knowledge",
  "explore_explain_modeling": "EXPERIENCE: 00:05-00:20 (15 mins) — Direct experience with the concept, physical demonstrations",
  "elaborate_guided_practice": "ANALYZE & LINK: 00:20-00:30 (10 mins) — Analyze the experience, link to prior learning. DIFFERENTIATED TASKS for 3 levels.",
  "evaluate_independent_practice": "APPLY: 00:30-00:40 (10 mins) — Apply learning in new contexts. DIFFERENTIATED concept checks.",
  "reflection_closure": "REFLECTION & CLOSURE: 00:40-00:45 (5 mins) — Summarize, value reflection, preview next lesson"
}

ASSESSMENT — The assessment object MUST have a NESTED "formative_assessment" object with COMPLETE, ready-to-use questions/tasks (no placeholders, no incomplete instructions, no repeated headers):
"formative_assessment": {
  "frustration": "Frustration Level (25%): Start directly with the task. An actual matching item set OR fill-in-the-blank with the full Word Bank in brackets [...], plus a quick 1-question check (e.g., Yes/No or True/False), all tailored to the topic.",
  "instructional": "Instructional Level (50%): Start directly with the task. A complete sentence stem to finish OR a specific 2-3 sentence short-explanation question directly testing core topic concepts.",
  "independent": "Independent Level / HOTS (25%): Start directly with the task. A direct higher-order thinking (HOTS) question (analysis, evaluation, or real-world application) linking the topic to practical context (e.g., local NCR/Philippine setting where applicable)."
}

WAYS FORWARD — The ways_forward object MUST have a NESTED "extended_learning" object:
"extended_learning": {
  "advanced": "SPECIFIC research/enrichment tasks",
  "struggling": "SPECIFIC home observation activities"
}

Include SPECIFIC timestamps, concrete activity descriptions, and differentiated tasks for each level.
CONTEXTUALIZATION: Integrate Las Piñas City landmarks, NCR infrastructure, daily Filipino life.`;

export function buildSystemPrompt(
  curriculumType: CurriculumType,
  teachingMethod: TeachingMethod,
  customMethod?: string
): string {
  let prompt = DEPED_SYSTEM_PROMPT_BASE;

  if (curriculumType === "MATATAG") {
    prompt += MATATAG_ADDITIONS;
  } else {
    prompt += K12_ADDITIONS;
  }

  if (teachingMethod === "5Es") {
    prompt += FIVE_ES_INSTRUCTIONS;
  } else if (teachingMethod === "DEAL") {
    prompt += DEAL_INSTRUCTIONS;
  } else if (customMethod) {
    prompt += `\n\nCUSTOM TEACHING METHOD:\nThe teacher uses: "${customMethod}". Adapt procedures accordingly while maintaining the DLP format.`;
  }

  return prompt;
}

export function buildUserPrompt(params: {
  gradeLevel: string;
  learningArea: string;
  quarter: string;
  week: string;
  subjectDescription: string;
  competencies?: string;
  coiTags?: string;
  teacherName?: string;
  schoolName?: string;
  dayNumber?: string;
  calendarDate?: string;
}): string {
  let prompt = `Generate a DepEd-compliant Daily Lesson Plan (DLP) based on the ILAW Framework with the following details:

Grade Level: ${params.gradeLevel}
Learning Area: ${params.learningArea}
Quarter/Term: ${params.quarter}
Week: ${params.week}
Day: ${params.dayNumber || "1"}
Calendar Date: ${params.calendarDate || "[Date]"}
Subject/Topic: ${params.subjectDescription}
Learning Competencies: ${params.competencies || "Auto-generate based on the subject/topic and curriculum"}
Teacher Name: ${params.teacherName || "[Teacher Name]"}
School Name: ${params.schoolName || "LAS PIÑAS CAA NATIONAL HIGH SCHOOL"}`;

  if (params.coiTags) {
    prompt += `\nClassroom Observable Indicators (COI/RPMS): ${params.coiTags}`;
  }

  prompt += `\n\nGenerate a complete, detailed lesson plan in the required JSON format. Follow the ILAW Framework (DO 016, s. 2026) and include the AI usage declaration (DO 003, s. 2026). Use the 5E Instructional Model.

CRITICAL STRUCTURE REQUIREMENTS:
- The learning_experience object MUST have a NESTED "flow" object with fields: engage, explore_explain_modeling, elaborate_guided_practice, evaluate_independent_practice, reflection_closure. Do NOT use flat top-level fields for 5E phases.
- The assessment object MUST have a NESTED "formative_assessment" object with fields: frustration, instructional, independent. Do NOT use flat top-level formative_assessment_* fields.
- The ways_forward object MUST have a NESTED "extended_learning" object with fields: advanced, struggling. Do NOT use flat top-level extended_learning_* fields.

Include framework_guidance_note in each ILAW section. Include SDO Las Piñas City and NCR contextualization. Each section must have substantial, actionable content.`;

  return prompt;
}

const WLP_SYSTEM_PROMPT = `You are an expert DepEd Philippines Master Teacher and Instructional Designer. You generate Weekly Lesson Plans (WLP) that are strictly compliant with DepEd MATATAG / Revised K to 10 Curriculum standards.

IMPORTANT RULES:
1. Always respond with VALID JSON only. No markdown, no code fences, no extra text.
2. All content must be written in English with Filipino section headers where appropriate.
3. Content must be pedagogically sound, age-appropriate, and aligned with the given competencies.
4. Each day (Monday-Friday) should have distinct activities that progressively build on each other.
5. Include differentiated instruction across three learner levels: Independent (25%), Instructional (50%), Frustration (25%).
6. Include Philippine/local context examples wherever possible.
7. The week should follow a logical progression: introduction → exploration → deepening → application → assessment.

OUTPUT SCHEMA (strict JSON):
{
  "weeklyObjectives": "Overall learning objectives for the entire week. Specific, measurable objectives targeting the given competencies.",
  "weeklyCompetencies": "List of competencies covered this week with their specific codes/indicators.",
  "weeklyContent": "Summary of content/subject matter to be covered across the week, showing the progression from Day 1 to Day 5.",
  "monday": {
    "day": "Monday",
    "date": "Use the exact date for Day 1 / Monday from the provided DBOW context",
    "activities": "Detailed activities for Monday aligned to the Day 1 competency and objective only. Include: Opening/Hook (5 mins), Activity 1 (15 mins), Activity 2 (15 mins), Activity 3 (10 mins), Closing/Reflection (5 mins). Include differentiated tasks for 3 learner levels."
  },
  "tuesday": {
    "day": "Tuesday",
    "date": "Use the exact date for Day 2 / Tuesday from the provided DBOW context",
    "activities": "Detailed activities for Tuesday aligned to the Day 2 competency and objective only. Include: Review of Monday (5 mins), New concept introduction (15 mins), Guided practice (15 mins), Independent practice (10 mins), Closing (5 mins). Differentiated for 3 levels."
  },
  "wednesday": {
    "day": "Wednesday",
    "date": "Use the exact date for Day 3 / Wednesday from the provided DBOW context",
    "activities": "Detailed activities for Wednesday aligned to the Day 3 competency and objective only. Include: Warm-up (5 mins), Concept deepening activity (15 mins), Collaborative task (15 mins), Individual check (10 mins), Closing (5 mins). Differentiated for 3 levels."
  },
  "thursday": {
    "day": "Thursday",
    "date": "Use the exact date for Day 4 / Thursday from the provided DBOW context",
    "activities": "Detailed activities for Thursday aligned to the Day 4 competency and objective only. Include: Quick review (5 mins), Real-world application task (15 mins), Group project work (15 mins), Peer assessment (10 mins), Closing (5 mins). Differentiated for 3 levels."
  },
  "friday": {
    "day": "Friday",
    "date": "Use the exact date for Day 5 / Friday from the provided DBOW context",
    "activities": "Detailed activities for Friday aligned to the Day 5 competency and objective only. Include: Week review (5 mins), Formative assessment (15 mins), Reflection activity (15 mins), Celebration of learning (10 mins), Preview of next week (5 mins). Differentiated for 3 levels."
  },
  "learningResources": "Complete list of physical and digital resources needed for the entire week. Include materials for each day.",
  "remarks": "Cross-curricular connections and integration opportunities for the week.",
  "reflection": "Teacher reflection prompts and notes for improving the next week's instruction."
}`;

export function buildWLPSystemPrompt(
  curriculumType: CurriculumType,
  teachingMethod: TeachingMethod,
  customMethod?: string
): string {
  let prompt = WLP_SYSTEM_PROMPT;

  if (curriculumType === "MATATAG") {
    prompt += `\n\nMATATAG CURRICULUM: Focus on Most Essential Learning Competencies (MELCs), spiral progression, and competency-based learning.`;
  } else {
    prompt += `\n\nK-12 MELCs CURRICULUM: Follow the K-12 Most Essential Learning Competencies structure with standard DepEd format.`;
  }

  if (teachingMethod === "5Es") {
    prompt += `\n\nFollow the 5E Instructional Model (Engage, Explore, Explain, Elaborate, Evaluate) for each day's activities.`;
  } else if (teachingMethod === "DEAL") {
    prompt += `\n\nFollow the DEAL Instructional Framework (Describe, Experience, Analyze, Link, Apply) for each day's activities.`;
  } else if (customMethod) {
    prompt += `\n\nUse this custom teaching method: "${customMethod}". Adapt each day's activities accordingly.`;
  }

  return prompt;
}

export function buildWLPUserPrompt(params: {
  gradeLevel: string;
  learningArea: string;
  quarter: string;
  week: string;
  subjectDescription: string;
  competencies?: string;
  coiTags?: string;
  weekDates?: { monday: string; tuesday: string; wednesday: string; thursday: string; friday: string };
}): string {
  let prompt = `Generate a DepEd-compliant Weekly Lesson Plan (WLP) with the following details:

Grade Level: ${params.gradeLevel}
Learning Area: ${params.learningArea}
Quarter/Term: ${params.quarter}
Week: ${params.week}
Subject/Topic: ${params.subjectDescription}
Learning Competencies: ${params.competencies || "Auto-generate based on the subject/topic and curriculum"}`;

  if (params.coiTags) {
    prompt += `\nClassroom Observable Indicators (COI/RPMS): ${params.coiTags}`;
  }

  if (params.weekDates) {
    const dayEntries = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
    const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
    const readable = (iso: string | undefined): string => {
      if (!iso) return "[Date]";
      const d = parseDateInput(iso);
      return d ? formatLongDate(d) : iso;
    };
    prompt += `\n\nOFFICIAL WEEK DATES (use these EXACT dates for each day's "date" field):
${dayEntries
  .map((key, i) => `- ${dayLabels[i]} (Day ${i + 1}): ${readable(params.weekDates?.[key])}`)
  .join("\n")}`;
  }

  if (params.competencies) {
    prompt += `\n\nThe Learning Competencies above are listed per DBOW day (e.g., "Day 1 (...): <competency>", "Day 2 (...): <competency>"). Use this per-day mapping as the authoritative curriculum scope for the week:
- Each day's plan (Monday through Friday) MUST target its corresponding day's competency and specific objective.
- Monday maps to Day 1, Tuesday to Day 2, Wednesday to Day 3, Thursday to Day 4, Friday to Day 5.
- Use the exact competency wording and objective given for that day — do not reuse one day's competency for the whole week.
- Where dates are provided per day, use them for each day's "date" field.
- The weeklyObjectives, weeklyCompetencies, and weeklyContent sections should summarize all 5 days' competencies together.`;
  }

  prompt += `\n\nGenerate a complete weekly lesson plan covering Monday through Friday. Each day should have detailed, differentiated activities. The week should show logical progression from introduction to assessment. Include Philippine/local context examples.`;

  return prompt;
}
