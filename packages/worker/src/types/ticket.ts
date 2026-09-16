/**
 * Ticket domain types — mirror Airtable schema (see SPECIFICATIONS.md §A)
 */

export type TicketStatus =
  | 'open'
  | 'claimed'
  | 'in_progress'
  | 'delivered'
  | 'validated'
  | 'auto_validated'
  | 'disputed'
  | 'refunded'
  | 'expired';

export type Urgency = 'low' | 'medium' | 'high' | 'critical';

export type Language =
  | 'TypeScript'
  | 'JavaScript'
  | 'Python'
  | 'Go'
  | 'Rust'
  | 'Java'
  | 'Kotlin'
  | 'Ruby'
  | 'PHP'
  | 'C#'
  | 'C++'
  | 'C'
  | 'Other';

export type Channel = 'web' | 'vscode';

export interface Ticket {
  id: string; // T-XXXX
  title: string;
  description: string;
  bounty: number; // EUR cents
  urgency: Urgency;
  languages: Language[];
  repoUrl: string; // https://github.com/zimb-app/zimb-XXXX
  status: TicketStatus;
  channel: Channel;
  createdAt: string; // ISO 8601
  createdBy: string; // userId (client)
  claimedBy?: string; // userId (senior)
  deliveredAt?: string;
  validatedAt?: string;
  autoValidatedAt?: string;
  disputeOpenedAt?: string;
  slaDisputeDeadline?: string; // ISO 8601
  assignedReviewerId?: string;
  stripePaymentIntentId?: string;
  airtableRecordId?: string;
}

export interface Claim {
  ticketId: string;
  seniorId: string;
  claimedAt: string; // ISO 8601
  expiresAt: string; // claimedAt + 45 min
  status: 'active' | 'expired' | 'completed';
}
