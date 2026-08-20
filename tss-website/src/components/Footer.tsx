import React from "react";
import packageJson from "../../package.json";

export function Footer() {

    return (
        <footer className="py-6 px-4 border-t border-[var(--border-color)] mt-6 w-full">
            <div className="w-full mx-auto flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">

                <div className="order-2 sm:order-1">
                    <a
                    href="/terms"
                    className="text-zinc-600 text-sm font-medium tracking-wide hover:text-general transition-colors duration-200"
                    >
                    Terms of Use
                </a>
            </div>

            <div className="hidden sm:block w-px h-3.5 bg-white/10 order-2" />

            <div className="text-center order-1 sm:order-3">
                <p className="text-xs text-zinc-600 font-medium">
                    © Two Steps Studio 2026 — Create. Build. Inspire.
                </p>
                <p className="text-[10px] text-zinc-600 font-medium mt-0.5 tracking-widest uppercase">
                    v{packageJson.version}
                </p>
            </div>

            <div className="hidden sm:block w-px h-3.5 bg-white/10 order-4" />

            <div className="order-3 sm:order-5">
                <a
                href="/privacy"
                className="text-zinc-600 text-sm font-medium tracking-wide hover:text-general transition-colors duration-200"
                >
                Privacy Policy
            </a>
        </div>
</div>
</footer>
);
}