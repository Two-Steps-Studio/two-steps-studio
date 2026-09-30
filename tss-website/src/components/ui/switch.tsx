"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-[var(--color-general)] data-[state=unchecked]:bg-zinc-200 dark:data-[state=unchecked]:bg-zinc-700 inline-flex h-[1.15rem] min-h-0 w-8 min-w-0 p-0 shrink-0 items-center rounded-full border border-transparent shadow-inner transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-white shadow-xl pointer-events-none block h-4 w-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-px"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
