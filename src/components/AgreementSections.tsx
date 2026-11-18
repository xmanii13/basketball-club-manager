import type { AgreementSection } from "@/lib/agreement";

export function AgreementSections({
  sections,
  version,
}: {
  sections: AgreementSection[];
  version: string;
}) {
  return (
    <div className="agreement-stack">
      <header className="agreement-head">
        <p className="section-kicker">Club–player agreement</p>
        <h2>Rules that keep the court fair</h2>
        <p className="section-lead">
          Clear expectations for conduct, attendance, respect, safety, and
          membership. Version {version}.
        </p>
      </header>
      <ol className="agreement-list">
        {sections.map((section, index) => (
          <li
            key={section.id}
            className="agreement-item"
            style={{ animationDelay: `${0.08 * index}s` }}
          >
            <h3>
              <span className="rule-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              {section.title}
            </h3>
            <ul>
              {section.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
