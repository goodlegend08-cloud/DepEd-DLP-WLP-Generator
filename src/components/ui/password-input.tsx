import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function PasswordInput({
  className,
  inputClassName,
  leadingIcon,
  ...props
}: React.ComponentProps<"input"> & {
  leadingIcon?: React.ReactNode;
  inputClassName?: string;
}) {
  const [show, setShow] = React.useState(false)

  return (
    <div className={cn("relative", className)}>
      {leadingIcon && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-muted-foreground">
          {leadingIcon}
        </span>
      )}
      <Input
        type={show ? "text" : "password"}
        className={cn("pr-9", leadingIcon && "pl-10", inputClassName)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

export { PasswordInput }