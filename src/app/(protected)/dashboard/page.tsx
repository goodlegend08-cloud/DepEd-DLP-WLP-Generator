"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, ChevronLeft, ChevronRight, Search, Filter, X } from "lucide-react";
import type { SavedLessonPlan } from "@/types/lesson-plan";

interface HistoryResponse {
  plans: SavedLessonPlan[];
  total: number;
  page: number;
  limit: number;
  filterOptions: {
    gradeLevels: string[];
    learningAreas: string[];
    quarters: string[];
    weeks: string[];
  };
}

export default function DashboardPage() {
  const { t } = useI18n();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 12;

  // Filter states
  const [gradeFilter, setGradeFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [quarterFilter, setQuarterFilter] = useState("");
  const [weekFilter, setWeekFilter] = useState("");
  const [planTypeFilter, setPlanTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPlans = useCallback(async (pageNum: number, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(limit),
      });
      if (gradeFilter) params.set("gradeLevel", gradeFilter);
      if (areaFilter) params.set("learningArea", areaFilter);
      if (quarterFilter) params.set("quarter", quarterFilter);
      if (weekFilter) params.set("week", weekFilter);
      if (planTypeFilter) params.set("planType", planTypeFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/plan/history?${params.toString()}`, { signal });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently fail (includes AbortError on cleanup)
    } finally {
      setLoading(false);
    }
  }, [gradeFilter, areaFilter, quarterFilter, weekFilter, planTypeFilter, searchQuery]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPlans(page, controller.signal);
    return () => controller.abort();
  }, [page, fetchPlans]);

  const handleFilterChange = () => {
    setPage(1);
    fetchPlans(1);
  };

  const clearFilters = () => {
    setGradeFilter("");
    setAreaFilter("");
    setQuarterFilter("");
    setWeekFilter("");
    setPlanTypeFilter("");
    setSearchQuery("");
    setPage(1);
  };

  const hasActiveFilters = gradeFilter || areaFilter || quarterFilter || weekFilter || planTypeFilter || searchQuery;
  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
        <Link href="/generate">
          <Button>{t("generate")}</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Lesson Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.plans.filter((p) => p.plan_type === "dlp").length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weekly Lesson Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.plans.filter((p) => p.plan_type === "wlp").length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.plans.filter((p) => {
                const date = new Date(p.created_at);
                const now = new Date();
                const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays <= 7;
              }).length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto h-7 text-xs">
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
            {/* Search */}
            <div className="space-y-1">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search competencies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFilterChange()}
                  className="pl-8 h-9"
                />
              </div>
            </div>

            {/* Grade Level */}
            <FilterSelect
              label="Grade Level"
              value={gradeFilter}
              onValueChange={setGradeFilter}
              placeholder="All Grades"
              options={(data?.filterOptions.gradeLevels ?? []).map((g) => ({ value: g, label: g }))}
            />

            {/* Learning Area */}
            <FilterSelect
              label="Learning Area"
              value={areaFilter}
              onValueChange={setAreaFilter}
              placeholder="All Areas"
              options={(data?.filterOptions.learningAreas ?? []).map((a) => ({ value: a, label: a }))}
            />

            {/* Quarter */}
            <FilterSelect
              label="Quarter"
              value={quarterFilter}
              onValueChange={setQuarterFilter}
              placeholder="All Quarters"
              options={(data?.filterOptions.quarters ?? []).map((q) => ({ value: q, label: q }))}
            />

            {/* Week */}
            <FilterSelect
              label="Week"
              value={weekFilter}
              onValueChange={setWeekFilter}
              placeholder="All Weeks"
              options={(data?.filterOptions.weeks ?? []).map((w) => ({ value: w, label: w }))}
            />

            {/* Plan Type */}
            <FilterSelect
              label="Plan Type"
              value={planTypeFilter}
              onValueChange={setPlanTypeFilter}
              placeholder="All Types"
              options={[
                { value: "dlp", label: "DLP (Daily)" },
                { value: "wlp", label: "WLP (Weekly)" },
              ]}
            />
          </div>

          <Button onClick={handleFilterChange} className="mt-3 h-9" size="sm">
            Apply Filters
          </Button>
        </CardContent>
      </Card>

      {/* Plans List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {hasActiveFilters ? "Filtered Plans" : t("recentPlans")}
        </h2>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-8 w-20 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !data || data.plans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noPlans")}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t("createFirst")}</p>
              <Link href="/generate" className="mt-4">
                <Button>{t("generate")}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: SavedLessonPlan }) {
  const { t } = useI18n();
  const date = new Date(plan.created_at).toLocaleDateString();
  const isWLP = plan.plan_type === "wlp";

  return (
    <Link href={`/plan/${plan.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base line-clamp-1">
              {plan.learning_area} — {plan.grade_level}
            </CardTitle>
            <Badge variant={isWLP ? "default" : "secondary"} className="text-xs shrink-0 ml-2">
              {isWLP ? "WLP" : "DLP"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{date}</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {plan.subject_description || plan.competencies}
          </p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">{plan.quarter}</Badge>
            <Badge variant="secondary" className="text-xs">{plan.week}</Badge>
            <Badge variant="outline" className="text-xs">{plan.curriculum_type}</Badge>
          </div>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start">
            {t("viewPlan")} →
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select
        value={value === "" ? "all" : value}
        onValueChange={(v) => onValueChange(v === "all" ? "" : (v ?? ""))}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{placeholder}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
