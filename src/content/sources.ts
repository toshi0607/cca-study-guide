import type { Source } from './types';

export const VERIFIED_AT = '2026-07-14';

export const sources: Source[] = [
  { id: 'cert', title: 'Claude Certified Architect – Foundations', publisher: 'Anthropic', url: 'https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification', official: true, verifiedAt: VERIFIED_AT },
  { id: 'exam-guide', title: 'Claude Certified Architect – Foundations Exam Guide v1.0 (CCAR-F)', publisher: 'Anthropic', url: 'https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf', official: true, verifiedAt: VERIFIED_AT },
  { id: 'announcement', title: 'Claude Partner Network announcement', publisher: 'Anthropic', url: 'https://www.anthropic.com/news/claude-partner-network', official: true, verifiedAt: VERIFIED_AT },
  { id: 'stop-reasons', title: 'Handling stop reasons', publisher: 'Anthropic', url: 'https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons', official: true, verifiedAt: VERIFIED_AT },
  { id: 'tool-use', title: 'How tool use works', publisher: 'Anthropic', url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works', official: true, verifiedAt: VERIFIED_AT },
  { id: 'structured', title: 'Structured outputs', publisher: 'Anthropic', url: 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs', official: true, verifiedAt: VERIFIED_AT },
  { id: 'hooks', title: 'Automate workflows with hooks', publisher: 'Anthropic', url: 'https://code.claude.com/docs/en/hooks-guide', official: true, verifiedAt: VERIFIED_AT },
  { id: 'code-features', title: 'Claude Code features overview', publisher: 'Anthropic', url: 'https://code.claude.com/docs/en/features-overview', official: true, verifiedAt: VERIFIED_AT },
  { id: 'sdk-features', title: 'Agent SDK: Claude Code features', publisher: 'Anthropic', url: 'https://code.claude.com/docs/en/agent-sdk/claude-code-features', official: true, verifiedAt: VERIFIED_AT },
  { id: 'subagents', title: 'Agent SDK: subagents', publisher: 'Anthropic', url: 'https://code.claude.com/docs/en/agent-sdk/subagents', official: true, verifiedAt: VERIFIED_AT },
  { id: 'skills', title: 'Agent SDK: skills', publisher: 'Anthropic', url: 'https://code.claude.com/docs/en/agent-sdk/skills', official: true, verifiedAt: VERIFIED_AT },
  { id: 'sessions', title: 'Agent SDK: work with sessions', publisher: 'Anthropic', url: 'https://code.claude.com/docs/en/agent-sdk/sessions', official: true, verifiedAt: VERIFIED_AT },
  { id: 'user-input', title: 'Agent SDK: handle approvals and user input', publisher: 'Anthropic', url: 'https://code.claude.com/docs/en/agent-sdk/user-input', official: true, verifiedAt: VERIFIED_AT },
  { id: 'code-mcp', title: 'Connect Claude Code to tools via MCP', publisher: 'Anthropic', url: 'https://code.claude.com/docs/en/mcp', official: true, verifiedAt: VERIFIED_AT },
  { id: 'code-memory', title: 'How Claude remembers your project', publisher: 'Anthropic', url: 'https://code.claude.com/docs/en/memory', official: true, verifiedAt: VERIFIED_AT },
  { id: 'code-how', title: 'How Claude Code works', publisher: 'Anthropic', url: 'https://code.claude.com/docs/en/how-claude-code-works', official: true, verifiedAt: VERIFIED_AT },
  { id: 'code-best-practices', title: 'Best practices for Claude Code', publisher: 'Anthropic', url: 'https://code.claude.com/docs/en/best-practices', official: true, verifiedAt: VERIFIED_AT },
  { id: 'headless', title: 'Run Claude Code programmatically', publisher: 'Anthropic', url: 'https://code.claude.com/docs/en/headless', official: true, verifiedAt: VERIFIED_AT },
  { id: 'large-codebases', title: 'Claude Code in large codebases', publisher: 'Anthropic', url: 'https://code.claude.com/docs/en/large-codebases', official: true, verifiedAt: VERIFIED_AT },
  { id: 'evals', title: 'Define success criteria and build evaluations', publisher: 'Anthropic', url: 'https://platform.claude.com/docs/en/test-and-evaluate/develop-tests', official: true, verifiedAt: VERIFIED_AT },
  { id: 'prompting-best', title: 'Prompting best practices', publisher: 'Anthropic', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices', official: true, verifiedAt: VERIFIED_AT },
  { id: 'batch', title: 'Batch processing', publisher: 'Anthropic', url: 'https://platform.claude.com/docs/en/build-with-claude/batch-processing', official: true, verifiedAt: VERIFIED_AT },
  { id: 'context-windows', title: 'Context windows', publisher: 'Anthropic', url: 'https://platform.claude.com/docs/en/build-with-claude/context-windows', official: true, verifiedAt: VERIFIED_AT },
  { id: 'context-editing', title: 'Context editing', publisher: 'Anthropic', url: 'https://platform.claude.com/docs/en/build-with-claude/context-editing', official: true, verifiedAt: VERIFIED_AT },
  { id: 'code-index', title: 'Claude Code documentation index', publisher: 'Anthropic', url: 'https://code.claude.com/docs/llms.txt', official: true, verifiedAt: VERIFIED_AT },
  { id: 'platform-index', title: 'Claude Platform documentation index', publisher: 'Anthropic', url: 'https://platform.claude.com/docs/llms.txt', official: true, verifiedAt: VERIFIED_AT },
  { id: 'mcp-tools', title: 'MCP specification: tools', publisher: 'MCP Project', url: 'https://modelcontextprotocol.io/specification/2025-11-25/server/tools', official: true, verifiedAt: VERIFIED_AT },
  { id: 'define-tools', title: 'Define tools', publisher: 'Anthropic', url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools', official: true, verifiedAt: '2026-07-18' },
];

export const sourceById = new Map(sources.map((source) => [source.id, source]));
