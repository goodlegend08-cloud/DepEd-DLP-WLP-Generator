import { cn } from "@/lib/utils";

type LoaderProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function Loader({ size = "md", className }: LoaderProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("loader", size === "sm" && "loader--sm", size === "lg" && "loader--lg", className)}
    />
  );
}