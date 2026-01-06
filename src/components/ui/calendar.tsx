"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/Button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-primary",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-7 w-7 bg-glass-interactive border border-accent-primary/30 p-0 text-primary hover:bg-accent-primary hover:text-inverse transition-colors rounded-md inline-flex items-center justify-center"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-secondary rounded-md w-9 font-normal text-[0.8rem] text-center",
        row: "flex w-full mt-2",
        cell: "text-center text-sm p-0 relative h-9 w-9 hover:bg-accent-primary/10 rounded-md transition-colors",
        day: "h-9 w-9 p-0 font-normal text-primary hover:bg-accent-primary/20 hover:text-accent-primary transition-colors rounded-md inline-flex items-center justify-center",
        day_selected: "bg-accent-primary text-inverse hover:bg-accent-primary hover:text-inverse",
        day_today: "bg-accent-primary/20 text-accent-primary font-semibold",
        day_outside: "text-muted opacity-50",
        day_disabled: "text-muted opacity-50",
        day_range_middle: "aria-selected:bg-accent-primary/20 aria-selected:text-primary",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }