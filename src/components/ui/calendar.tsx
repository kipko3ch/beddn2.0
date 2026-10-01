"use client"

import * as React from "react"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-transparent p-1 [--cell-radius:999px] [--cell-size:2.25rem] sm:[--cell-size:2.5rem]",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        formatWeekdayName: (date) =>
          ["S", "M", "T", "W", "T", "F", "S"][date.getDay()],
        ...formatters,
      }}
      classNames={{
        root: cn("w-full max-w-full", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-6 md:flex-row md:gap-10 justify-center",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-3", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0.5 flex w-full items-center justify-between px-1 z-10 pointer-events-none",
          defaultClassNames.nav
        ),
        button_previous: cn(
          "size-8 rounded-full border border-neutral-200 bg-white hover:bg-neutral-100 flex items-center justify-center p-0 select-none pointer-events-auto shadow-xs text-neutral-800 transition-colors disabled:opacity-30",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          "size-8 rounded-full border border-neutral-200 bg-white hover:bg-neutral-100 flex items-center justify-center p-0 select-none pointer-events-auto shadow-xs text-neutral-800 transition-colors disabled:opacity-30",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-8 w-full items-center justify-center px-8",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-8 w-full items-center justify-center gap-1.5 text-sm font-semibold",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-(--cell-radius)",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute inset-0 bg-popover opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "font-bold text-sm sm:text-base text-[#181113] select-none text-center",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("grid grid-cols-7 mb-1", defaultClassNames.weekdays),
        weekday: cn(
          "flex h-8 items-center justify-center text-center text-xs font-semibold text-neutral-400 select-none",
          defaultClassNames.weekday
        ),
        week: cn("grid w-full grid-cols-7 my-0.5", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-xs text-muted-foreground select-none",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full p-0 text-center select-none",
          defaultClassNames.day
        ),
        range_start: cn(
          "relative isolate z-0 bg-transparent after:absolute after:inset-y-0 after:right-0 after:w-1/2 after:bg-neutral-100 after:-z-10",
          defaultClassNames.range_start
        ),
        range_middle: cn("bg-neutral-100 rounded-none", defaultClassNames.range_middle),
        range_end: cn(
          "relative isolate z-0 bg-transparent after:absolute after:inset-y-0 after:left-0 after:w-1/2 after:bg-neutral-100 after:-z-10",
          defaultClassNames.range_end
        ),
        today: cn(
          "font-bold text-neutral-900",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground/30 opacity-40 aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground line-through opacity-35 pointer-events-none",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4 text-neutral-700", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon className={cn("size-4 text-neutral-700", className)} {...props} />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4 text-neutral-700", className)} {...props} />
          )
        },
        DayButton: ({ ...props }) => (
          <CalendarDayButton locale={locale} {...props} />
        ),
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const isSelected = modifiers.selected
  const isStart = modifiers.range_start
  const isEnd = modifiers.range_end
  const isMiddle = modifiers.range_middle
  const isSingle = isSelected && !isStart && !isEnd && !isMiddle
  const isDisabled = modifiers.disabled

  return (
    <Button
      variant="ghost"
      size="icon"
      ref={ref}
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={isSingle}
      data-range-start={isStart}
      data-range-end={isEnd}
      data-range-middle={isMiddle}
      className={cn(
        "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) items-center justify-center border-0 leading-none font-semibold text-xs sm:text-sm rounded-full transition-all duration-150",
        // Normal interactive day
        "text-[#222222] hover:bg-neutral-100 hover:text-black",
        // Single selection or endpoint: solid dark circle (Airbnb style)
        (isSingle || isStart || isEnd) && "bg-[#222222] text-white hover:bg-black font-bold rounded-full shadow-xs",
        // Middle range day: neutral background, no rounded edge
        isMiddle && "bg-neutral-100 text-[#222222] hover:bg-neutral-200 rounded-none font-medium",
        // Disabled past days: line-through and muted
        isDisabled && "line-through text-neutral-300 opacity-40 pointer-events-none hover:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
