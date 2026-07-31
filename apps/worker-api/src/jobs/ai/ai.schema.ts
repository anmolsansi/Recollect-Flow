import { z } from 'zod';

export const ExtractResultSchema = z.object({
  title: z.string().optional(),
  summary: z.string(),
  topics: z.array(z.string()),
  people: z.array(z.string()),
  companies: z.array(z.string()),
  project: z.string().optional(),
  importance: z.number().min(0).max(100),
  whyItMatters: z.string(),
  suggestedAction: z.string().optional(),
});

export const DigestSummaryResultSchema = z.object({
  summary: z.string(),
  topicGroups: z.array(
    z.object({
      topic: z.string(),
      items: z.array(z.string()),
    }),
  ),
  topItems: z.array(z.string()),
  suggestedActions: z.array(z.string()),
  dormantIdeas: z.array(z.string()).optional(),
});

export const ExtractResultJsonSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    topics: { type: 'array', items: { type: 'string' } },
    people: { type: 'array', items: { type: 'string' } },
    companies: { type: 'array', items: { type: 'string' } },
    project: { type: 'string' },
    importance: { type: 'number' },
    whyItMatters: { type: 'string' },
    suggestedAction: { type: 'string' },
  },
  required: [
    'summary',
    'topics',
    'people',
    'companies',
    'importance',
    'whyItMatters',
  ],
};

export const DigestSummaryResultJsonSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    topicGroups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
        },
        required: ['topic', 'items'],
      },
    },
    topItems: { type: 'array', items: { type: 'string' } },
    suggestedActions: { type: 'array', items: { type: 'string' } },
    dormantIdeas: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'topicGroups', 'topItems', 'suggestedActions'],
};

export const SummaryResultSchema = z.object({
  title: z.string().optional(),
  summary: z.string(),
  topics: z.array(z.string()),
});

export const SummaryResultJsonSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    topics: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'topics'],
};

export const ClassificationResultSchema = z.object({
  category: z.string(),
  importance: z.number().min(0).max(100),
});

export const ClassificationResultJsonSchema = {
  type: 'object',
  properties: {
    category: { type: 'string' },
    importance: { type: 'number' },
  },
  required: ['category', 'importance'],
};
