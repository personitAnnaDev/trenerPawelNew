import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a08032] focus-visible:ring-offset-2 focus-visible:border-[#a08032] focus-visible:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-zinc-700 hover:border-zinc-600 transition-colors resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
