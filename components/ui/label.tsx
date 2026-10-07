"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { translateDashboardCopy } from '@/lib/dashboard-copy'
import { useOptionalDashboardLang } from '@/lib/dashboard-lang'

function Label({ className, ...props }: React.ComponentProps<"label">) {
  const language = useOptionalDashboardLang()?.lang ?? 'en'
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >{typeof props.children === 'string' ? translateDashboardCopy(props.children, language) : props.children}</label>
  )
}

export { Label }
