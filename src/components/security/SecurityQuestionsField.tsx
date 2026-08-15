"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Minus, Plus } from "lucide-react";
import { MIN_SECURITY_QUESTIONS, SECURITY_QUESTIONS } from "@/lib/security-questions";

export interface SecurityQuestionRow {
  question: string;
  answer: string;
}

interface SecurityQuestionsFieldProps {
  value: SecurityQuestionRow[];
  onChange: (rows: SecurityQuestionRow[]) => void;
  exclude?: string[];
  disabled?: boolean;
}

/**
 * Reusable field for selecting and answering security questions.
 * Enforces a minimum of MIN_SECURITY_QUESTIONS rows and disallows duplicate
 * questions within the current set (plus any passed via `exclude`).
 */
export function SecurityQuestionsField({
  value,
  onChange,
  exclude = [],
  disabled = false,
}: SecurityQuestionsFieldProps) {
  const chosen = new Set([...value.map((r) => r.question), ...exclude]);

  const updateRow = (index: number, patch: Partial<SecurityQuestionRow>) => {
    const next = value.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  };

  const addRow = () => {
    onChange([...value, { question: "", answer: "" }]);
  };

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {value.map((row, index) => (
        <div key={index} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <Label>Security Question {index + 1}</Label>
            {value.length > MIN_SECURITY_QUESTIONS && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => removeRow(index)}
              >
                <Minus className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Select
            value={row.question}
            onValueChange={(val) => {
              if (val) updateRow(index, { question: val });
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a security question" />
            </SelectTrigger>
            <SelectContent>
              {SECURITY_QUESTIONS.map((q) => (
                <SelectItem key={q} value={q} disabled={chosen.has(q) && row.question !== q}>
                  {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="space-y-1">
            <Label htmlFor={`answer-${index}`}>Answer</Label>
            <Input
              id={`answer-${index}`}
              type="text"
              autoComplete="off"
              placeholder="Your answer"
              value={row.answer}
              disabled={disabled}
              onChange={(e) => updateRow(index, { answer: e.target.value })}
            />
          </div>
        </div>
      ))}

      {value.length < SECURITY_QUESTIONS.length && (
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addRow}>
          <Plus className="mr-2 h-4 w-4" />
          Add another question
        </Button>
      )}
    </div>
  );
}