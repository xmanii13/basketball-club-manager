import { createHash } from "node:crypto";

/**
 * Edit club rules here. Bump AGREEMENT_VERSION whenever the substance of the
 * rules changes so new acknowledgements record what was agreed to.
 */
export const AGREEMENT_VERSION = "2026.1";

export type AgreementSection = {
  id: string;
  title: string;
  body: string[];
};

export const AGREEMENT_SECTIONS: AgreementSection[] = [
  {
    id: "conduct",
    title: "Conduct on and off the court",
    body: [
      "Represent SWH Basketball Club with integrity at practices, games, travel, and online.",
      "Follow coach and staff instructions during team activities. Disputes are raised privately after the session, not during play.",
      "Alcohol, tobacco, vaping, and illegal substances are not allowed at club events.",
    ],
  },
  {
    id: "attendance",
    title: "Attendance and commitment",
    body: [
      "Arrive on time, ready to train, in appropriate kit for the session.",
      "Notify a coach or team manager as early as possible if you will miss practice or a game.",
      "Repeated unexplained absences may affect playing time and continued membership.",
    ],
  },
  {
    id: "respect",
    title: "Respect for people",
    body: [
      "Treat teammates, opponents, officials, coaches, parents, and facility staff with respect.",
      "Harassment, bullying, discrimination, and abusive language have no place in the club.",
      "Celebrate effort and improvement. Do not mock mistakes — yours or anyone else's.",
    ],
  },
  {
    id: "safety",
    title: "Safety and wellbeing",
    body: [
      "Report injuries, illness, or safety concerns to coaching staff promptly.",
      "Do not play through serious injury without clearance from a coach or medical professional.",
      "Help keep courts, locker rooms, and shared spaces clean and free of hazards.",
    ],
  },
  {
    id: "membership",
    title: "Membership expectations",
    body: [
      "Membership is a privilege. Acknowledging this agreement is required to join or remain on a team roster.",
      "Parents and guardians of minors share responsibility for supporting these expectations.",
      "The club may update this agreement. Continued participation after a new version is published requires a fresh acknowledgement when asked.",
      "Serious or repeated breaches may result in suspension or removal from the club.",
    ],
  },
];

export function agreementPlainText(): string {
  return [
    `SWH Basketball Club — Player Agreement`,
    `Version ${AGREEMENT_VERSION}`,
    "",
    ...AGREEMENT_SECTIONS.flatMap((section) => [
      section.title,
      ...section.body.map((line) => `- ${line}`),
      "",
    ]),
  ].join("\n");
}

export function agreementHash(): string {
  return createHash("sha256").update(agreementPlainText(), "utf8").digest("hex");
}

export function getAgreementMeta() {
  return {
    version: AGREEMENT_VERSION,
    hash: agreementHash(),
    sections: AGREEMENT_SECTIONS,
  };
}
