import { AcknowledgeForm } from "@/components/AcknowledgeForm";
import { AgreementSections } from "@/components/AgreementSections";
import { AGREEMENT_SECTIONS, AGREEMENT_VERSION } from "@/lib/agreement";
import { isUsingPostgres } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const usingPostgres = isUsingPostgres();

  return (
    <main>
      <section className="hero" aria-label="SWH Basketball Club">
        <div className="hero-inner">
          <p className="brand">
            SWH
            <span className="brand-sub">Basketball Club</span>
          </p>
          <h1>Player agreement</h1>
          <p className="hero-lead">
            Read the club rules, then acknowledge them to confirm membership.
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary" href="#acknowledge">
              Acknowledge membership
            </a>
          </div>
        </div>
      </section>

      <section className="section agreement-section" id="agreement" aria-labelledby="agreement-heading">
        <div className="section-inner">
          <AgreementSections
            sections={AGREEMENT_SECTIONS}
            version={AGREEMENT_VERSION}
          />
        </div>
      </section>

      <section className="section form-section" id="acknowledge" aria-labelledby="ack-heading">
        <div className="section-inner">
          <div className="form-panel">
            <p className="section-kicker">Membership acknowledgement</p>
            <h2 id="ack-heading">Confirm you have read and agree</h2>
            <p>
              Submitting this form records your name, contact, role, and the
              agreement version you accepted
              {usingPostgres
                ? "."
                : " in a local sample store while DATABASE_URL is unset."}
            </p>
            <AcknowledgeForm agreementVersion={AGREEMENT_VERSION} />
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="section-inner">
          <p>SWH Basketball Club · Agreement v{AGREEMENT_VERSION}</p>
          <p>
            <a href="/admin">Acknowledgements list</a>
          </p>
        </div>
      </footer>
    </main>
  );
}
