export type CurriculumType = "K-12" | "MATATAG";

export type TeachingMethod = "5Es" | "DEAL" | "custom";

export type PlanType = "dlp" | "wlp";

/** Structured DBOW row sent from the client to the generate API. */
export interface DBOWEntryPayload {
  term: string;
  contentArea: string;
  weekRange: string;
  weekNumber: string;
  competency: string;
  day: string;
  dayNumber: string;
  objective: string;
  daysTaught: string;
  contentStandard: string;
  performanceStandard: string;
  suggestedActivity: string;
  date: string;
  specificDate?: string;
}

export interface LessonPlanInput {
  gradeLevel: string;
  learningArea: string;
  quarter: string;
  week: string;
  subjectDescription: string;
  curriculumType: CurriculumType;
  teachingMethod: TeachingMethod;
  teachingMethodCustom?: string;
  competencies?: string;
  coiTags?: string;
  planType: PlanType;
  teacherName?: string;
  schoolName?: string;
  section?: string;
  dayNumber?: string;
  calendarDate?: string;
  startDate?: string;
  signatories?: DLPSignatories;
  templateId?: string;
  dbowEntry?: DBOWEntryPayload | null;
  dbowEntries?: DBOWEntryPayload[];
  dbowRawText?: string;
  weekDates?: WeekDates;
}

/** Per-day calendar dates for a weekly lesson plan (Monday–Friday). */
export interface WeekDates {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
}

export interface DayPlan {
  day: string;
  date: string;
  activities: string;
}

export interface WeeklyLessonPlan {
  monday: DayPlan;
  tuesday: DayPlan;
  wednesday: DayPlan;
  thursday: DayPlan;
  friday: DayPlan;
  weeklyObjectives: string;
  weeklyCompetencies: string;
  weeklyContent: string;
  learningResources: string;
  remarks: string;
  reflection: string;
}

export interface LessonPlanProcedures {
  balik_aral: string;
  paghahabi: string;
  pagtatalakay: string;
  development: string;
  abstraction: string;
  application: string;
  evaluation: string;
}

export interface LessonPlanObjectives {
  content: string;
  objectives_content: string;
}

export interface LessonPlanContent {
  content: string;
}

export interface LessonPlanLearningResources {
  content: string;
}

export interface GeneratedLessonPlan {
  objectives: LessonPlanObjectives;
  content: LessonPlanContent;
  learning_resources: LessonPlanLearningResources;
  procedures: LessonPlanProcedures;
  remarks: string;
  reflection: string;
}

export interface DLPHeader {
  republic: string;
  department: string;
  region: string;
  division: string;
  school: string;
  address: string;
}

export interface DLPLessonPlanMeta {
  learning_area: string;
  grade_level: string;
  lesson_title: string;
  calendar_date: string;
  week_number: string;
  day_number: string;
  teacher_name: string;
  grade_and_section: string;
  sessions: string;
  references: string;
  ai_declaration: string;
}

export interface DLPIntentions {
  framework_guidance_note: string;
  learning_competency: string;
  learning_objectives: string;
  learners_context: string;
}

export interface DLPFlowPhases {
  engage: string;
  explore_explain_modeling: string;
  elaborate_guided_practice: string;
  evaluate_independent_practice: string;
  reflection_closure: string;
}

export interface DLPLearningExperience {
  framework_guidance_note: string;
  pre_lesson: string;
  flow?: DLPFlowPhases;
  engage?: string;
  explore_explain_modeling?: string;
  elaborate_guided_practice?: string;
  evaluate_independent_practice?: string;
  reflection_closure?: string;
  learning_resources: string;
  opportunities_for_integration: string;
}

/**
 * Uniform 5E "EVALUATE" Exit Ticket structure (whole-class, same for every
 * learner): 5 items + matching Answer Key. Legacy 3-tier differentiated
 * fields are kept optional for backward compatibility with saved plans.
 */
export interface DLPExitTicket {
  title?: string;
  format?: string;
  item_1?: string;
  item_2?: string;
  item_3?: string;
  item_4?: string;
  item_5?: string;
  answer_key_1?: string;
  answer_key_2?: string;
  answer_key_3?: string;
  answer_key_4?: string;
  answer_key_5?: string;
}

export interface DLPFormativeAssessment extends DLPExitTicket {
  frustration?: string;
  instructional?: string;
  independent?: string;
}

export interface DLPAssessment {
  framework_guidance_note: string;
  formative_assessment?: DLPFormativeAssessment;
  formative_assessment_frustration?: string;
  formative_assessment_instructional?: string;
  formative_assessment_independent?: string;
}

export interface DLPExtendedLearning {
  advanced: string;
  struggling: string;
  remediation_threshold?: string;
}

export interface DLPWaysForward {
  framework_guidance_note: string;
  extended_learning?: DLPExtendedLearning;
  extended_learning_advanced?: string;
  extended_learning_struggling?: string;
  reflections: string;
}

export interface DLPSignatory {
  name: string;
  title: string;
}

export interface DLPSignatories {
  prepared_by: DLPSignatory;
  checked_by: DLPSignatory[];
  noted_by: DLPSignatory[];
}

export interface GeneratedDLPPlan {
  header: DLPHeader;
  lesson_plan_meta: DLPLessonPlanMeta;
  intentions: DLPIntentions;
  learning_experience: DLPLearningExperience;
  assessment: DLPAssessment;
  ways_forward: DLPWaysForward;
  signatories: DLPSignatories;
}

export interface SavedLessonPlan {
  id: string;
  user_id: string;
  grade_level: string;
  learning_area: string;
  quarter: string;
  week: string;
  subject_description: string;
  curriculum_type: CurriculumType;
  teaching_method: string;
  teaching_method_custom: string | null;
  competencies: string;
  coi_tags: string | null;
  plan_type: PlanType;
  generated_content: GeneratedLessonPlan | GeneratedDLPPlan | WeeklyLessonPlan;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}
