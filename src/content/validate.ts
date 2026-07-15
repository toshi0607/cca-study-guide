import { z } from 'zod';
import { cards } from './cards';
import { domains } from './domains';
import { sources } from './sources';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const localizedStringSchema = z.object({
  ja: z.string().trim().min(1),
  en: z.string().trim().min(1),
}).strict();
const localizedStringArraySchema = z.object({
  ja: z.array(z.string().trim().min(1)).min(1),
  en: z.array(z.string().trim().min(1)).min(1),
}).strict();
const sourceSchema = z.object({ id: z.string().min(1), title: z.string().min(1), publisher: z.enum(['Anthropic', 'MCP Project']), url: z.string().url(), official: z.literal(true), verifiedAt: date });
const objectiveSchema = z.object({ id: z.string().min(1), title: localizedStringSchema, summary: localizedStringSchema, mustKnow: localizedStringArraySchema, sourceIds: z.array(z.string().min(1)).min(1), verifiedAt: date });
const domainSchema = z.object({ id: z.string().min(1), number: z.number().int().min(1).max(5), title: localizedStringSchema, weight: z.number().positive(), summary: localizedStringSchema, objectives: z.array(objectiveSchema).min(1) });
const cardSchema = z.object({ id: z.string().min(1), revision: z.number().int().positive(), domainId: z.string(), objectiveIds: z.array(z.string()).min(1), kind: z.enum(['recall', 'contrast', 'scenario']), prompt: localizedStringSchema, answer: localizedStringSchema, explanation: localizedStringSchema, pitfall: localizedStringSchema, sourceIds: z.array(z.string()).min(1), verifiedAt: date });
export const genericSourceIds = new Set(['exam-guide', 'cert', 'announcement', 'code-index', 'platform-index']);

const unique = (values: string[], label: string, errors: string[]) => {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length) errors.push(`${label} has duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);
};

export function validateContent() {
  const errors: string[] = [];
  const sourceResult = z.array(sourceSchema).safeParse(sources);
  const domainResult = z.array(domainSchema).safeParse(domains);
  const cardResult = z.array(cardSchema).safeParse(cards);
  if (!sourceResult.success) errors.push(sourceResult.error.message);
  if (!domainResult.success) errors.push(domainResult.error.message);
  if (!cardResult.success) errors.push(cardResult.error.message);

  unique(sources.map((x) => x.id), 'sources', errors);
  unique(domains.map((x) => x.id), 'domains', errors);
  unique(domains.flatMap((d) => d.objectives.map((x) => x.id)), 'objectives', errors);
  unique(cards.map((x) => x.id), 'cards', errors);

  if (domains.reduce((sum, domain) => sum + domain.weight, 0) !== 100) errors.push('domain weights must total 100');
  if (domains.length !== 5) errors.push('exactly five domains are required');
  if (domains.flatMap((d) => d.objectives).length !== 30) errors.push('exactly 30 objectives are required');

  const sourceIds = new Set(sources.map((x) => x.id));
  const domainIds = new Set(domains.map((x) => x.id));
  const objectiveIds = new Set(domains.flatMap((d) => d.objectives.map((x) => x.id)));
  for (const item of [...domains.flatMap((d) => d.objectives), ...cards]) {
    for (const sourceId of item.sourceIds) if (!sourceIds.has(sourceId)) errors.push(`${item.id}: orphan source ${sourceId}`);
    if (!item.sourceIds.some((sourceId) => !genericSourceIds.has(sourceId))) errors.push(`${item.id}: missing claim-specific source`);
  }
  for (const item of cards) {
    if (!domainIds.has(item.domainId)) errors.push(`${item.id}: orphan domain ${item.domainId}`);
    for (const objectiveId of item.objectiveIds) if (!objectiveIds.has(objectiveId)) errors.push(`${item.id}: orphan objective ${objectiveId}`);
  }

  const allowedHosts = new Set(['anthropic-partners.skilljar.com', 'www.anthropic.com', 'platform.claude.com', 'code.claude.com', 'modelcontextprotocol.io', 'everpath-course-content.s3-accelerate.amazonaws.com']);
  for (const source of sources) if (!allowedHosts.has(new URL(source.url).hostname)) errors.push(`${source.id}: unofficial host`);

  if (errors.length) throw new Error(`Content validation failed:\n${errors.join('\n')}`);
  return { sourceCount: sources.length, domainCount: domains.length, objectiveCount: objectiveIds.size, cardCount: cards.length };
}

export const contentStats = validateContent();
