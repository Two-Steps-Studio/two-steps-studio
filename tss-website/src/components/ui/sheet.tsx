"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from "framer-motion"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type SheetContextValue = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Threads open state, and a single onOpenChange funnel every close path
// goes through (X button, Escape, overlay click, or a drag-to-dismiss past
// threshold), down to SheetContent - it drives its own AnimatePresence
// instead of relying on Radix's CSS-only animate-in/out, which is what let
// this slide in/out with a fixed-duration eased tween that couldn't be
// grabbed and reversed mid-flight, and had no drag-to-dismiss at all.
const SheetContext = React.createContext<SheetContextValue | null>(null)

function useSheetContext() {
  const ctx = React.useContext(SheetContext)
  if (!ctx) throw new Error("Sheet.* components must be used within <Sheet>")
  return ctx
}

function Sheet({
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Root>) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : internalOpen

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange]
  )

  return (
    <SheetContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <SheetPrimitive.Root
        data-slot="sheet"
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </SheetContext.Provider>
  )
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

// side -> which axis it drags on, which sign along that axis counts as
// "dismissing" (moving further offscreen), and the one dragConstraints
// bound that resists the opposite (already-fully-open) direction. Leaving
// the dismiss-direction bound unset is what gives it free 1:1 movement that
// way while framer-motion still auto-springs back into the resisted bound
// on release if the drag didn't clear the threshold below.
const SIDE_CONFIG = {
  right: { axis: "x", sign: 1, constraints: { left: 0 } },
  left: { axis: "x", sign: -1, constraints: { right: 0 } },
  bottom: { axis: "y", sign: 1, constraints: { top: 0 } },
  top: { axis: "y", sign: -1, constraints: { bottom: 0 } },
} as const

const DISMISS_OFFSET = 100 // px
const DISMISS_VELOCITY = 500 // px/s

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
}) {
  const { open, onOpenChange } = useSheetContext()
  const shouldReduceMotion = useReducedMotion()
  const { axis, sign, constraints } = SIDE_CONFIG[side]

  const offscreen = axis === "x" ? { x: `${sign * 100}%` } : { y: `${sign * 100}%` }
  const resting = axis === "x" ? { x: 0 } : { y: 0 }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const offset = axis === "x" ? info.offset.x : info.offset.y
    const velocity = axis === "x" ? info.velocity.x : info.velocity.y
    const pastThreshold =
      sign > 0
        ? offset > DISMISS_OFFSET || velocity > DISMISS_VELOCITY
        : offset < -DISMISS_OFFSET || velocity < -DISMISS_VELOCITY
    if (pastThreshold) onOpenChange(false)
    // Otherwise: framer-motion springs it back within dragConstraints on
    // its own, from wherever it currently sits.
  }

  return (
    <SheetPortal>
      <SheetOverlay />
      {/* forceMount hands mount/unmount control to this AnimatePresence
          instead of Radix's own internal presence, so the exit animation
          (or a drag release) actually gets to play before removal. */}
      <AnimatePresence>
        {open && (
          <SheetPrimitive.Content data-slot="sheet-content" forceMount asChild {...props}>
            <motion.div
              drag={shouldReduceMotion ? false : axis}
              dragConstraints={constraints}
              dragElastic={0.5}
              dragMomentum={false}
              onDragEnd={handleDragEnd}
              initial={shouldReduceMotion ? { opacity: 0 } : offscreen}
              animate={shouldReduceMotion ? { opacity: 1 } : resting}
              exit={shouldReduceMotion ? { opacity: 0 } : offscreen}
              transition={
                shouldReduceMotion
                  ? { duration: 0.15, ease: "linear" }
                  : { type: "spring", bounce: 0, duration: 0.4 }
              }
              className={cn(
                // bg-background/80 + backdrop-blur matches the app's own
                // .glass material (globals.css), already used for nav chrome.
                "bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 fixed z-50 flex flex-col gap-4 shadow-lg touch-none",
                side === "right" && "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
                side === "left" && "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
                side === "top" && "inset-x-0 top-0 h-auto border-b",
                side === "bottom" && "inset-x-0 bottom-0 h-auto border-t",
                className
              )}
            >
              {children}
              <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
                <XIcon className="size-4" />
                <span className="sr-only">Close</span>
              </SheetPrimitive.Close>
            </motion.div>
          </SheetPrimitive.Content>
        )}
      </AnimatePresence>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
