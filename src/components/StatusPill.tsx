import { CaseStatus } from "@prisma/client";
import { CASE_STATUS_LABEL } from "@/lib/labels";

const CLASS: Record<CaseStatus, string> = {
  DRAFT: "badge-status-draft",
  OPEN: "badge-status-open",
  CLOSED: "badge-status-closed",
  RESULTS_PUBLISHED: "badge-status-published",
  CANCELLED: "badge-status-cancelled",
};

export function StatusPill({ status }: { status: CaseStatus }) {
  return <span className={`badge rounded-pill fw-medium ${CLASS[status]}`}>{CASE_STATUS_LABEL[status]}</span>;
}
