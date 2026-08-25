"use client"

import { useLanguage } from "@/hooks/use-translation";

export default function TermsOfServicePage() {
    const { t } = useLanguage();
    return (
        <div className="mx-auto max-w-4xl px-6 py-12 text-left leading-relaxed">

            <h1 className="mb-4 text-center text-4xl font-bold text-general">
                {t.termsPage.title}
            </h1>

            <p className="mb-10 text-center text-gray-400">
                {t.termsPage.lastUpdated}
            </p>


            <section className="mb-8">
                <h2 className="mb-3 text-2xl font-semibold">
                    {t.termsPage.s1Title}
                </h2>

                <p>
                    {t.termsPage.s1P1}
                </p>

                <p className="mt-3">
                    {t.termsPage.s1P2}
                </p>
            </section>


            <section className="mb-8">
                <h2 className="mb-3 text-2xl font-semibold">
                    {t.termsPage.s2Title}
                </h2>

                <p>
                    {t.termsPage.s2P1}
                </p>

                <p className="mt-3">
                    {t.termsPage.s2P2}
                </p>

                <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>{t.termsPage.s2Item1}</li>
                    <li>{t.termsPage.s2Item2}</li>
                    <li>{t.termsPage.s2Item3}</li>
                    <li>{t.termsPage.s2Item4}</li>
                    <li>{t.termsPage.s2Item5}</li>
                </ul>
            </section>


            <section className="mb-8">
                <h2 className="mb-3 text-2xl font-semibold">
                    {t.termsPage.s3Title}
                </h2>

                <p>
                    {t.termsPage.s3P1}
                </p>

                <p className="mt-3">
                    {t.termsPage.s3P2}
                </p>

                <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>{t.termsPage.s3Item1}</li>
                    <li>{t.termsPage.s3Item2}</li>
                    <li>{t.termsPage.s3Item3}</li>
                </ul>

                <p className="mt-3">
                    {t.termsPage.s3P3}
                </p>
            </section>


            <section className="mb-8">
                <h2 className="mb-3 text-2xl font-semibold">
                    {t.termsPage.s4Title}
                </h2>

                <p>
                    {t.termsPage.s4P1}
                </p>

                <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>{t.termsPage.s4Item1}</li>
                    <li>{t.termsPage.s4Item2}</li>
                    <li>{t.termsPage.s4Item3}</li>
                    <li>{t.termsPage.s4Item4}</li>
                    <li>{t.termsPage.s4Item5}</li>
                    <li>{t.termsPage.s4Item6}</li>
                    <li>{t.termsPage.s4Item7}</li>
                </ul>

                <p className="mt-3">
                    {t.termsPage.s4P2}
                </p>

                <p className="mt-3">
                    {t.termsPage.s4P3}
                </p>
            </section>


            <section className="mb-8">
                <h2 className="mb-3 text-2xl font-semibold">
                    {t.termsPage.s5Title}
                </h2>

                <p>
                    {t.termsPage.s5P1}
                </p>

                <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>{t.termsPage.s5Item1}</li>
                    <li>{t.termsPage.s5Item2}</li>
                    <li>{t.termsPage.s5Item3}</li>
                    <li>{t.termsPage.s5Item4}</li>
                </ul>

                <p className="mt-3">
                    {t.termsPage.s5P2}
                </p>
            </section>


            <section className="mb-8">
                <h2 className="mb-3 text-2xl font-semibold">
                    {t.termsPage.s6Title}
                </h2>

                <p>
                    {t.termsPage.s6P1}
                </p>

                <p className="mt-3">
                    {t.termsPage.s6P2}
                </p>
            </section>


            <section className="mb-8">
                <h2 className="mb-3 text-2xl font-semibold">
                    {t.termsPage.s7Title}
                </h2>

                <p>
                    {t.termsPage.s7P1}
                </p>

                <p className="mt-3">
                    {t.termsPage.s7P2}
                </p>
            </section>


            <section className="mb-8">
                <h2 className="mb-3 text-2xl font-semibold">
                    {t.termsPage.s8Title}
                </h2>

                <p>
                    {t.termsPage.s8P1}
                </p>

                <ul className="mt-3 list-disc space-y-2 pl-6">
                    <li>{t.termsPage.s8Item1}</li>
                    <li>{t.termsPage.s8Item2}</li>
                    <li>{t.termsPage.s8Item3}</li>
                    <li>{t.termsPage.s8Item4}</li>
                </ul>
            </section>


            <section className="mb-8">
                <h2 className="mb-3 text-2xl font-semibold">
                    {t.termsPage.s9Title}
                </h2>

                <p>
                    {t.termsPage.s9P1}
                </p>

                <p className="mt-3">
                    {t.termsPage.s9P2}
                </p>
            </section>


            <section>
                <h2 className="mb-3 text-2xl font-semibold">
                    {t.termsPage.s10Title}
                </h2>

                <p>
                    {t.termsPage.s10P1}
                </p>

                <p className="mt-3">
                    {t.termsPage.s10WebsiteLabel}
                    <br />
                    <a
                        href="https://two-steps-studio.xyz"
                        className="text-general hover:underline"
                    >
                        https://two-steps-studio.xyz
                    </a>
                </p>

                <p className="mt-5 font-semibold">
                    {t.termsPage.s10Brand}
                </p>
            </section>
        </div>
    )
}