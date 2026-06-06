"use client";

import { FiBookOpen, FiExternalLink, FiFileText, FiFolder } from "react-icons/fi";
import Header from "../components/Header";
import { EmptyState, MetricCard, PageShell, SectionHeading } from "../components/ui";

const materialsData = [
  {
    name: "1st Semester",
    link1: "https://drive.google.com/drive/folders/1Wrmz_-qK9-qpbnELku8QFB_3Ua6VdYLk?usp=drive_link",
    link2: "",
    link3: "",
    link4: "https://drive.google.com/drive/folders/14merMtw-U9FDWM5NhN8hY_fIOY3ZgoZ6?usp=drive_link",
  },
  {
    name: "2nd Semester",
    link1:
      "https://drive.google.com/drive/folders/1Eq3m_ymMse3fWH-2pKjmGf1q6OvB5le9?usp=sharing",
    link2: "https://drive.google.com/drive/folders/1C5YsCkNVopfhjPu374-zUKvbDveiioZR?usp=drive_link",
    link3: "",
    link4: "https://drive.google.com/drive/folders/18BlACJWWO6oBCOcsyBhLRXSB8ApkfT2E?usp=drive_link",
  },
  {
    name: "3rd Semester",
    link1:
      "https://drive.google.com/drive/folders/1RPFdfDvlo2BdGq4IsH23OsemM_y-Ddvy?usp=drive_link",
    link2:
      "https://drive.google.com/drive/folders/1Zq-Z8ucc8FTgoFRLjW3uzBtAE1cCVS5P?usp=drive_link",
    link3:
      "https://drive.google.com/drive/folders/1z1g2yAhIZ-vv-dFY7qj0e95R6GBkBv4y?usp=drive_link",
    link4: "https://drive.google.com/drive/folders/17GYioALtmnbYB5PckqEuwII3j9huAUFL?usp=drive_link",
  },
  {
    name: "4th Semester",
    link1:
      "https://drive.google.com/drive/folders/1iualmULYKk3IML9UDpkIswLVz9F-Ayhp?usp=sharing",
    link2: "https://drive.google.com/drive/folders/1QNoQXhiMl86XdOlKYn-gOx1m2ajdOdPQ?usp=drive_link",
    link3: "",
    link4: "https://drive.google.com/drive/folders/1wJnykA-91i0jqPf_dMg4DqAxIIAVZtaT?usp=drive_link",
  },
  {
    name: "5th Semester",
    link1:
      "https://drive.google.com/drive/folders/1YLJ8LFfCUNG5wdt1PhxfckFRAvqsrlYi?usp=sharing",
    link2: "https://drive.google.com/drive/u/0/folders/1eceisVMlDO2mm4yars0G1vSOStIjAYAa",
    link3: "",
    link4: "https://drive.google.com/drive/folders/1iYgEH9g1V8aNm7zD8_lf1-UJtSB6Sf_n?usp=drive_link",
  },
  {
    name: "6th Semester",
    link1:
      "https://drive.google.com/drive/folders/1Q-AYc87OAUR-s04zWgCWOiNv3pAk5XXI?usp=sharing",
    link2: "https://drive.google.com/drive/folders/1rJ8RLXJYlRMCqr5TUx6L9T0nSXQrFrSx?usp=drive_link",
    link3: "",
    link4: "https://drive.google.com/drive/folders/1cFE2W6_fpK6b_CSEETAtsIydk4s0XwZx?usp=drive_link",
  },
  {
    name: "7th Semester",
    link1:
      "https://drive.google.com/drive/folders/1t3HbDizsoEp7HYgdEB8rY-TiYJOHxso6?usp=sharing",
    link2: "https://drive.google.com/drive/folders/1y4WhBlCsqD9QxU9Pr6zA0pPS1DV7wpTD?usp=sharing",
    link3: "",
    link4: "https://drive.google.com/drive/folders/1fxILqsTt5QM9UQzAClF1Mh5zzGIrkvsb?usp=drive_link",
  },
  {
    name: "8th Semester",
    link1: "",
    link2: "",
    link3: "",
    link4: "https://drive.google.com/drive/folders/1k3-PfpHdA8OO24ctzpYYQE0D8HmEXZVI?usp=drive_link",
  },
];

const linkLabels = ["Drive 1", "Drive 2", "Drive 3", "Previous Questions"];

/**
 * Study-material directory with semester cards and explicit resource links.
 */
export default function Semester() {
  const availableLinks = materialsData.reduce(
    (total, semester) =>
      total +
      [semester.link1, semester.link2, semester.link3, semester.link4].filter(Boolean).length,
    0
  );

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Resources"
            title="Study Materials"
            description="Semester-wise folders for notes, previous questions, and shared course resources."
          />
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<FiBookOpen className="h-5 w-5" aria-hidden="true" />}
            label="Semesters"
            value={materialsData.length}
            tone="violet"
          />
          <MetricCard
            icon={<FiFolder className="h-5 w-5" aria-hidden="true" />}
            label="Available folders"
            value={availableLinks}
            tone="green"
          />
          <MetricCard
            icon={<FiFileText className="h-5 w-5" aria-hidden="true" />}
            label="Resource type"
            value="Drive links"
            tone="amber"
          />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {materialsData.map((semester) => {
            const links = [semester.link1, semester.link2, semester.link3, semester.link4];
            const hasLinks = links.some(Boolean);

            return (
              <article key={semester.name} className="subtle-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="section-kicker">Semester</p>
                    <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                      {semester.name}
                    </h2>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                    <FiFolder aria-hidden="true" />
                  </span>
                </div>

                <div className="mt-5 grid gap-2">
                  {hasLinks ? (
                    links.map((link, index) =>
                      link ? (
                        <a
                          key={linkLabels[index]}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:text-violet-300"
                        >
                          {linkLabels[index]}
                          <FiExternalLink className="h-4 w-4" aria-hidden="true" />
                        </a>
                      ) : null
                    )
                  ) : (
                    <EmptyState
                      title="No links yet"
                      description="Materials for this semester are not available."
                    />
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </PageShell>
    </div>
  );
}
