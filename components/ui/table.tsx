"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Table({ className, layout, ...props }: React.ComponentProps<"table"> & { layout?: "list" | "campaigns" | "places" }) {
  const container = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!layout) return
    const update = () => {
      const element = container.current
      if (!element) return
      const header = element.querySelector("thead")
      const bounds = element.getBoundingClientRect()
      const shift = Math.max(0, Math.min(-bounds.top, bounds.height - (header?.getBoundingClientRect().height ?? 0)))
      element.style.setProperty("--table-header-shift", `${shift}px`)
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update) }
  }, [layout])
  return (
    <div
      data-slot="table-container"
      ref={container}
      data-list-table={layout}
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("sticky top-0 z-10 bg-card [&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "h-14 border-b transition-colors hover:bg-muted/50 focus-within:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, column, ...props }: React.ComponentProps<"th"> & { column?: "status" | "actions" }) {
  return (
    <th
      data-slot="table-head"
      data-column={column}
      className={cn(
        "h-11 px-[18px] text-start align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pe-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, column, ...props }: React.ComponentProps<"td"> & { column?: "status" | "actions" }) {
  return (
    <td
      data-slot="table-cell"
      data-column={column}
      className={cn(
        column === "actions" && "align-top pt-3",
        "px-[18px] py-1 align-middle whitespace-nowrap [&:has([role=checkbox])]:pe-0 [&:has([data-slot=button])]:text-end [&:has([data-slot=button])>div]:justify-end",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
