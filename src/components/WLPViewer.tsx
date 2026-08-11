"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { WeeklyLessonPlan, LessonPlanInput } from "@/types/lesson-plan";

interface WLPViewerProps {
  plan: WeeklyLessonPlan;
  input?: LessonPlanInput;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
const DAY_LABELS: Record<string, string> = {
  monday: "MONDAY",
  tuesday: "TUESDAY",
  wednesday: "WEDNESDAY",
  thursday: "THURSDAY",
  friday: "FRIDAY",
};

export function WLPViewer({ plan, input }: WLPViewerProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center py-4 border-b-2 border-primary">
        <p className="text-xs text-muted-foreground">NATIONAL CAPITAL REGION</p>
        <p className="text-xs text-muted-foreground">SCHOOLS DIVISION OF LAS PIÑAS CITY</p>
        <p className="text-xs text-muted-foreground">S.Y. 2026-2027 | FIRST TERM</p>
        <h2 className="text-xl font-bold text-primary mt-2">WEEKLY LESSON PLAN (WLP)</h2>
        <p className="text-sm font-semibold uppercase">{input?.learningArea || "SCIENCE"}</p>
      </div>

      {/* Metadata */}
      {input && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary">Grade {input.gradeLevel}</Badge>
          <Badge variant="secondary">{input.learningArea}</Badge>
          <Badge variant="secondary">{input.quarter}</Badge>
          <Badge variant="secondary">{input.week}</Badge>
          <Badge variant="outline">{input.curriculumType}</Badge>
          <Badge variant="outline">{input.teachingMethod}</Badge>
        </div>
      )}

      {/* Weekly Objectives */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            WEEKLY OBJECTIVES & COMPETENCIES
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold mb-1 bg-blue-50 py-1 px-2 rounded">Weekly Competencies</h4>
            <p className="text-sm whitespace-pre-wrap">{plan.weeklyCompetencies}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-1 bg-blue-50 py-1 px-2 rounded">Weekly Objectives</h4>
            <p className="text-sm whitespace-pre-wrap">{plan.weeklyObjectives}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-1 bg-blue-50 py-1 px-2 rounded">Weekly Content Overview</h4>
            <p className="text-sm whitespace-pre-wrap">{plan.weeklyContent}</p>
          </div>
        </CardContent>
      </Card>

      {/* Daily Plans */}
      {DAYS.map((day) => {
        const dayPlan = plan[day];
        return (
          <Card key={day}>
            <CardHeader>
              <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
                {DAY_LABELS[day]} — {dayPlan.date}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap text-muted-foreground">
                {dayPlan.activities}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Learning Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            LEARNING RESOURCES
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{plan.learningResources}</p>
        </CardContent>
      </Card>

      {/* Remarks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            REMARKS & INTEGRATION
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{plan.remarks}</p>
        </CardContent>
      </Card>

      {/* Reflection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            TEACHER REFLECTION
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{plan.reflection}</p>
        </CardContent>
      </Card>

      {/* Signatories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            SIGNATORIES
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-1">Prepared by</h4>
            <p className="text-sm text-muted-foreground">___________________________________<br />[Teacher Name]<br />Teacher I</p>
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-1">Checked & Reviewed by</h4>
            <p className="text-sm text-muted-foreground">___________________________________<br />[Master Teacher Name]<br />Master Teacher</p>
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-1">Noted by</h4>
            <p className="text-sm text-muted-foreground">___________________________________<br />[Principal Name]<br />School Principal IV</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
