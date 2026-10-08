"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { SegmentedTabsList, SegmentedTabsTrigger } from '@/components/admin/segmented-control';
import { cn } from "@/lib/utils"

function Tabs({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" data-orientation={orientation} className={cn("group/tabs flex gap-2 data-horizontal:flex-col", className)} {...props} />;
}

function TabsList(props: TabsPrimitive.List.Props) {
  return <SegmentedTabsList {...props} />;
}

function TabsTrigger(props: TabsPrimitive.Tab.Props) {
  return <SegmentedTabsTrigger {...props} />;
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel data-slot="tabs-content" className={cn("flex-1 text-sm outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
