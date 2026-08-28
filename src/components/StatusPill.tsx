import { CaseStatus } from "@prisma/client";
import { CASE_STATUS_LABEL } from "@/lib/labels";

const CLASS: Record<CaseStatus, string> = {
  DRAFT: "pill-status-draft",
  OPEN: "pill-status-open",
  CLOSED: "pill-status-closed",
  RESULTS_PUBLISHED: "pill-status-published",
  CANCELLED: "pill-status-cancelled",
};

export function StatusPill({ status }: { status: CaseStatus }) {
  return <span className={`pill ${CLASS[status]}`}>{CASE_STATUS_LABEL[status]}</span>;
}
