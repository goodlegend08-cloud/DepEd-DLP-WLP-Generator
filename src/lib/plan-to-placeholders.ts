import { stripTicketLabel } from "@/lib/utils";
import type { GeneratedDLPPlan, DLPFlowPhases, DLPFormativeAssessment, DLPExtendedLearning } from "@/types/lesson-plan";

// ============================================================
// MAP GENERATED DLP PLAN → TEMPLATE PLACEHOLDER VALUES
// ============================================================

const DEFAULT_CHECKED = [
  "TRIXIA A. PALMOS",
  "CARMELITA G. YAP",
  "Jeanette J. Ruga, Ph.D.",
];
const DEFAULT_NOTED = ["MILDRED T. TUBLE", "GENOVIE G. TAGUM, Ph.D."];

function resolveFlow(flow?: DLPFlowPhases, flat?: {
  engage?: string;
  explore_explain_modeling?: string;
  elaborate_guided_practice?: string;
  evaluate_independent_practice?: string;
  reflection_closure?: string;
}): DLPFlowPhases {
  if (flow) return flow;
  return {
    engage: flat?.engage || "",
    explore_explain_modeling: flat?.explore_explain_modeling || "",
    elaborate_guided_practice: flat?.elaborate_guided_practice || "",
    evaluate_independent_practice: flat?.evaluate_independent_practice || "",
    reflection_closure: flat?.reflection_closure || "",
  };
}

function resolveFormativeAssessment(fa?: DLPFormativeAssessment, flat?: {
  formative_assessment_frustration?: string;
  formative_assessment_instructional?: string;
  formative_assessment_independent?: string;
}): DLPFormativeAssessment {
  if (fa) return fa;
  return {
    frustration: flat?.formative_assessment_frustration || "",
    instructional: flat?.formative_assessment_instructional || "",
    independent: flat?.formative_assessment_independent || "",
  };
}

function resolveExtendedLearning(el?: DLPExtendedLearning, flat?: {
  extended_learning_advanced?: string;
  extended_learning_struggling?: string;
}): DLPExtendedLearning {
  if (el) return el;
  return {
    advanced: flat?.extended_learning_advanced || "",
    struggling: flat?.extended_learning_struggling || "",
  };
}

/**
 * Convert a GeneratedDLPPlan into a flat key-value map for template placeholders.
 * The keys match the {{PLACEHOLDER}} names used in the .docx template.
 */
export function planToPlaceholderValues(plan: GeneratedDLPPlan): Record<string, string> {
  const { lesson_plan_meta, intentions, learning_experience, assessment, ways_forward, signatories } = plan;
  const flow = resolveFlow(learning_experience.flow, learning_experience);
  const formative = resolveFormativeAssessment(assessment.formative_assessment, assessment);
  const extended = resolveExtendedLearning(ways_forward.extended_learning, ways_forward);

  const preparedBy = signatories?.prepared_by?.name || lesson_plan_meta.teacher_name || "JOSE ROMMEL L. GARCIA";
  const checkedBy =
    signatories?.checked_by?.length ? signatories.checked_by.map((s) => s.name) : DEFAULT_CHECKED;
  const notedBy =
    signatories?.noted_by?.length ? signatories.noted_by.map((s) => s.name) : DEFAULT_NOTED;

  return {
    CALENDAR_DATE: lesson_plan_meta.calendar_date || "",
    // Strip the redundant "Week"/"Day" prefix so templates with a baked-in
    // "Week: {{WEEK_NUMBER}}" label render "Week: 9" instead of "Week: Week 9".
    WEEK_NUMBER: (lesson_plan_meta.week_number || "").replace(/^week\s*/i, ""),
    DAY_NUMBER: (lesson_plan_meta.day_number || "").replace(/^day\s*/i, ""),
    TEACHER_NAME: lesson_plan_meta.teacher_name || "",
    GRADE_AND_SECTION: lesson_plan_meta.grade_and_section || "",
    LEARNING_AREA: lesson_plan_meta.learning_area || "",
    GRADE_LEVEL: lesson_plan_meta.grade_level || "",
    LESSON_TITLE: lesson_plan_meta.lesson_title || "",
    SESSIONS: lesson_plan_meta.sessions || "",
    LEARNING_COMPETENCY: intentions.learning_competency || "",
    DAY_OBJECTIVE: intentions.learning_objectives || "",
    LEARNERS_CONTEXT: intentions.learners_context || "",
    SUGGESTED_ACTIVITY: learning_experience.learning_resources?.substring(0, 200) || "",
    REFERENCES: lesson_plan_meta.references || "",
    AI_DECLARATION: lesson_plan_meta.ai_declaration || "",
    PRE_LESSON: learning_experience.pre_lesson || "",
    FLOW_ENGAGE: flow.engage || "",
    FLOW_EXPLORE_EXPLAIN: flow.explore_explain_modeling || "",
    FLOW_ELABORATE: flow.elaborate_guided_practice || "",
    FLOW_EVALUATE: flow.evaluate_independent_practice || "",
    FLOW_REFLECTION: flow.reflection_closure || "",
    LEARNING_RESOURCES: learning_experience.learning_resources || "",
    OPPORTUNITIES_INTEGRATION: learning_experience.opportunities_for_integration || "",
    FORMATIVE_FRUSTRATION: formative.frustration || "",
    FORMATIVE_INSTRUCTIONAL: formative.instructional || "",
    FORMATIVE_INDEPENDENT: formative.independent || "",
    FORMATIVE_TITLE: formative.title || "EVALUATE (5 mins) — Formative Assessment",
    FORMATIVE_FORMAT: formative.format || "Individual Written 5-Item Exit Ticket",
    FORMATIVE_ITEM_1: stripTicketLabel(formative.item_1 || "", "item"),
    FORMATIVE_ITEM_2: stripTicketLabel(formative.item_2 || "", "item"),
    FORMATIVE_ITEM_3: stripTicketLabel(formative.item_3 || "", "item"),
    FORMATIVE_ITEM_4: stripTicketLabel(formative.item_4 || "", "item"),
    FORMATIVE_ITEM_5: stripTicketLabel(formative.item_5 || "", "item"),
    FORMATIVE_ANSWER_1: stripTicketLabel(formative.answer_key_1 || "", "answer"),
    FORMATIVE_ANSWER_2: stripTicketLabel(formative.answer_key_2 || "", "answer"),
    FORMATIVE_ANSWER_3: stripTicketLabel(formative.answer_key_3 || "", "answer"),
    FORMATIVE_ANSWER_4: stripTicketLabel(formative.answer_key_4 || "", "answer"),
    FORMATIVE_ANSWER_5: stripTicketLabel(formative.answer_key_5 || "", "answer"),
    EXTENDED_ADVANCED: extended.advanced || "",
    EXTENDED_STRUGGLING: extended.struggling || "",
    REMEDIATION_THRESHOLD: extended.remediation_threshold || "",
    REFLECTIONS: ways_forward.reflections || "",
    PREPARED_BY: preparedBy.toUpperCase(),
    CHECKED_BY_1: checkedBy[0]?.toUpperCase() || "",
    CHECKED_BY_2: checkedBy[1]?.toUpperCase() || "",
    CHECKED_BY_3: checkedBy[2]?.toUpperCase() || "",
    NOTED_BY_1: notedBy[0]?.toUpperCase() || "",
    NOTED_BY_2: notedBy[1]?.toUpperCase() || "",
  };
}