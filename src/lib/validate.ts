export type Role = "player" | "parent-guardian";
export type ContactType = "email" | "phone";

export type AcknowledgementInput = {
  fullName: string;
  contact: string;
  contactType: ContactType;
  role: Role;
  jerseyOrAgeGroup?: string;
  agreed: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function parseAcknowledgementBody(
  body: unknown,
): { ok: true; data: AcknowledgementInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body." };
  }
  const raw = body as Record<string, unknown>;
  const fullName = clean(raw.fullName, 120);
  const contact = clean(raw.contact, 160);
  const contactType = clean(raw.contactType, 16) as ContactType;
  const role = clean(raw.role, 32) as Role;
  const jerseyOrAgeGroup = clean(raw.jerseyOrAgeGroup, 80) || undefined;
  const agreed = raw.agreed === true;

  if (fullName.length < 2) {
    return { ok: false, error: "Please enter your full name." };
  }
  if (contactType !== "email" && contactType !== "phone") {
    return { ok: false, error: "Choose email or phone as contact type." };
  }
  if (contactType === "email" && !EMAIL_RE.test(contact)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (contactType === "phone" && !PHONE_RE.test(contact)) {
    return { ok: false, error: "Enter a valid phone number." };
  }
  if (role !== "player" && role !== "parent-guardian") {
    return { ok: false, error: "Select player or parent/guardian." };
  }
  if (!agreed) {
    return {
      ok: false,
      error: "You must confirm you have read and agree to the agreement.",
    };
  }

  return {
    ok: true,
    data: {
      fullName,
      contact,
      contactType,
      role,
      jerseyOrAgeGroup,
      agreed,
    },
  };
}
