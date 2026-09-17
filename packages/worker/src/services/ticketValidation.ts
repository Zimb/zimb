/**
 * Zod schemas for request validation.
 * Skill reference: .github/skills/cloudflare-workers-modern/SKILL.md (Hono context)
 */
import { z } from 'zod';

export const UrgencySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const ChannelSchema = z.enum(['web', 'vscode']);

export const LanguageSchema = z.enum([
  'TypeScript',
  'JavaScript',
  'Node.js',
  'Python',
  'Go',
  'Rust',
  'Java',
  'Kotlin',
  'Ruby',
  'PHP',
  'C#',
  'C++',
  'C',
  'Other',
]);

export const CreateTicketSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000),
  bounty: z
    .number()
    .int('Bounty must be in cents (integer)')
    .min(1000, 'Bounty minimum is 10 € (1000 cents)')
    .max(50000, 'Bounty maximum is 500 € (50000 cents) — contact us for larger'),
  urgency: UrgencySchema,
  languages: z.array(LanguageSchema).min(1, 'At least one language is required').max(8),
  repoUrl: z.string().url('repoUrl must be a valid URL').regex(/github\.com/, 'repoUrl must be a GitHub URL'),
  channel: ChannelSchema,
});

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;

/**
 * Validates the path param :id (must be T-XXXX format).
 */
export const TicketIdParamSchema = z
  .string()
  .regex(/^T-\d{4,6}$/, 'Ticket ID must match T-XXXX format');

/**
 * Custom error class for client-facing validation errors (→ 400 response).
 */
export class ValidationError extends Error {
  constructor(public readonly issues: z.ZodIssue[]) {
    super(`Validation failed: ${issues.map((i) => i.message).join('; ')}`);
    this.name = 'ValidationError';
  }
}

/**
 * Parses + validates input or throws a ValidationError.
 */
export function parseOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ValidationError(result.error.issues);
  return result.data;
}
