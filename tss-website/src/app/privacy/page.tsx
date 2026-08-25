"use client";

import { useLanguage } from "@/hooks/use-translation";

export default function PrivacyPolicyPage() {
        const { t } = useLanguage();
        return (
            <div className="mx-auto max-w-4xl px-6 py-12 text-left leading-relaxed">

                    <h1 className="mb-4 text-center text-4xl font-bold text-general">
                            {t.privacyPage.title}
                    </h1>

                    <p className="mb-10 text-center text-gray-400">
                            {t.privacyPage.lastUpdated}
                    </p>


                    <section className="mb-8">
                            <h2 className="mb-3 text-2xl font-semibold">
                                    {t.privacyPage.s1Title}
                            </h2>

                            <p>
                                    {t.privacyPage.s1P1}
                            </p>

                            <p className="mt-3">
                                    {t.privacyPage.s1P2}
                            </p>

                            <p className="mt-3">
                                    {t.privacyPage.s1P3}
                            </p>
                    </section>


                    <section className="mb-8">
                            <h2 className="mb-3 text-2xl font-semibold">
                                    {t.privacyPage.s2Title}
                            </h2>

                            <p>
                                    {t.privacyPage.s2Intro}
                            </p>


                            <h3 className="mt-5 text-xl font-medium">
                                    {t.privacyPage.s2ProvidedTitle}
                            </h3>

                            <ul className="mt-3 list-disc space-y-2 pl-6">
                                    <li>{t.privacyPage.s2Provided1}</li>
                                    <li>{t.privacyPage.s2Provided2}</li>
                                    <li>{t.privacyPage.s2Provided3}</li>
                                    <li>{t.privacyPage.s2Provided4}</li>
                            </ul>


                            <h3 className="mt-5 text-xl font-medium">
                                    {t.privacyPage.s2AutoTitle}
                            </h3>

                            <ul className="mt-3 list-disc space-y-2 pl-6">
                                    <li>{t.privacyPage.s2Auto1}</li>
                                    <li>{t.privacyPage.s2Auto2}</li>
                                    <li>{t.privacyPage.s2Auto3}</li>
                                    <li>{t.privacyPage.s2Auto4}</li>
                                    <li>{t.privacyPage.s2Auto5}</li>
                            </ul>


                            <p className="mt-4">
                                    {t.privacyPage.s2Outro}
                            </p>
                    </section>


                    <section className="mb-8">
                            <h2 className="mb-3 text-2xl font-semibold">
                                    {t.privacyPage.s3Title}
                            </h2>

                            <p>
                                    {t.privacyPage.s3Intro}
                            </p>

                            <ul className="mt-3 list-disc space-y-2 pl-6">
                                    <li>{t.privacyPage.s3Item1}</li>
                                    <li>{t.privacyPage.s3Item2}</li>
                                    <li>{t.privacyPage.s3Item3}</li>
                                    <li>{t.privacyPage.s3Item4}</li>
                                    <li>{t.privacyPage.s3Item5}</li>
                                    <li>{t.privacyPage.s3Item6}</li>
                            </ul>
                    </section>


                    <section className="mb-8">
                            <h2 className="mb-3 text-2xl font-semibold">
                                    {t.privacyPage.s4Title}
                            </h2>

                            <p>
                                    {t.privacyPage.s4Intro}
                            </p>

                            <ul className="mt-3 list-disc space-y-2 pl-6">
                                    <li>{t.privacyPage.s4Item1}</li>
                                    <li>{t.privacyPage.s4Item2}</li>
                                    <li>{t.privacyPage.s4Item3}</li>
                                    <li>{t.privacyPage.s4Item4}</li>
                            </ul>

                            <p className="mt-4">
                                    {t.privacyPage.s4Outro}
                            </p>
                    </section>


                    <section className="mb-8">
                            <h2 className="mb-3 text-2xl font-semibold">
                                    {t.privacyPage.s5Title}
                            </h2>

                            <p>
                                    {t.privacyPage.s5P1}
                            </p>

                            <p className="mt-3">
                                    {t.privacyPage.s5P2}
                            </p>
                    </section>


                    <section className="mb-8">
                            <h2 className="mb-3 text-2xl font-semibold">
                                    {t.privacyPage.s6Title}
                            </h2>

                            <p>
                                    {t.privacyPage.s6P1}
                            </p>

                            <p className="mt-3">
                                    {t.privacyPage.s6P2}
                            </p>
                    </section>


                    <section className="mb-8">
                            <h2 className="mb-3 text-2xl font-semibold">
                                    {t.privacyPage.s7Title}
                            </h2>

                            <p>
                                    {t.privacyPage.s7Intro}
                            </p>

                            <ul className="mt-3 list-disc space-y-2 pl-6">
                                    <li>{t.privacyPage.s7Item1}</li>
                                    <li>{t.privacyPage.s7Item2}</li>
                                    <li>{t.privacyPage.s7Item3}</li>
                                    <li>{t.privacyPage.s7Item4}</li>
                            </ul>

                            <p className="mt-4">
                                    {t.privacyPage.s7Outro}
                            </p>
                    </section>


                    <section className="mb-8">
                            <h2 className="mb-3 text-2xl font-semibold">
                                    {t.privacyPage.s8Title}
                            </h2>

                            <p>
                                    {t.privacyPage.s8P1}
                            </p>

                            <p className="mt-3">
                                    {t.privacyPage.s8P2}
                            </p>
                    </section>


                    <section>
                            <h2 className="mb-3 text-2xl font-semibold">
                                    {t.privacyPage.s9Title}
                            </h2>

                            <p>
                                    {t.privacyPage.s9P1}
                            </p>

                            <p className="mt-4 font-semibold">
                                    {t.privacyPage.s9Brand}
                            </p>

                            <a
                                href="https://two-steps-studio.xyz"
                                className="text-general hover:underline"
                            >
                                    https://two-steps-studio.xyz
                            </a>
                    </section>
            </div>
        )
}