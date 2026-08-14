import { NextResponse } from "next/server";
import {
  scheduleDBOW,
  validateSchedulerInput,
  type SchedulerInput,
} from "@/lib/dbow-scheduler";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SchedulerInput;

    // Rule 4: Required Information Check — validate before generating.
    const errors = validateSchedulerInput(body);
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const result = scheduleDBOW(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("DBOW schedule error:", error);
    return NextResponse.json(
      { error: "Failed to generate DBOW schedule" },
      { status: 500 }
    );
  }
}