# Extraction, AI enrichment, and Personal Knowledge RAG

## Processing order

1. Deterministic URL/file normalization and metadata.
2. Coverage and privacy classification.
3. Optional OCR/transcription only when bytes and policy permit.
4. Minimum AI input package: user intent, acquired source facts, metadata, explicit limitations.
5. Provider selection by sensitivity, modality, quota, availability.
6. Strict structured generation.
7. Schema, length, enum, grounding, and coverage validation.
8. Versioned derived-field write with provider/model/prompt/content provenance.
9. Search-index refresh and Notion sync as independent jobs.

## Provider routing

- Deterministic/no-AI path is always valid.
- App-managed OpenRouter is the hosted default for Public content.
- Gemini free is a Public-only fallback when OpenRouter is unavailable.
- Personal content requires explicit hosted-processing consent. App-managed Personal routing is OpenRouter-only with ZDR and data collection denied; a user-provided provider key uses the selected provider without silent fallback.
- Unknown content is not sent automatically. Sensitive and restricted content never use hosted AI.
- A privacy or quota failure leaves work pending/partial; it never silently chooses a less private or billable provider.

## Enrichment contract

Output includes concise title, 1–5 grounded summary bullets, up to eight normalized topics, null-or-known project slug, importance 0–100, at most one action, confidence 0–1, exact coverage acknowledgement, limitations, provider/model/prompt/schema/content versions. Unknown fields fail validation. User edits are protected against routine reprocessing.

The model sees source text as untrusted data, receives no credentials or general tools, cannot call arbitrary URLs, cannot infer inaccessible media, and cannot treat user intent as proof of source claims.

## Local Ollama worker

Separate Mac process with scoped token: lease eligible jobs, fetch only approved content, call local Ollama text/embedding APIs, validate output, submit minimal provenance/result, heartbeat/release leases, start at one-job concurrency, and avoid routine prompt logging. The cloud never calls private localhost. Mac-off means pending work.

## RAG entry gate

Do not implement/activate until V1 acceptance passes, at least 100 useful captures exist, real search logs show vocabulary mismatch, a representative gold set exists, privacy/source-trust/answer policies are approved, and owner records the start decision.

## Corpus ingestion

Create immutable content versions after deterministic extraction. Chunk by source structure—headings/paragraphs, PDF pages/sections, transcript timestamps, notes—while preserving coverage and exact source span. Remove boilerplate and cluster exact duplicate text without losing provenance. Classify chunk privacy and hosted/local eligibility. Embed idempotently by content/model/index version. Invalidate affected retrieval/answers on edit, delete, privacy, model, index, or policy change.

## Embeddings and indexes

Embedding and vector store are replaceable adapters. One vector maps to one chunk/content version/model version. Model changes build a parallel index before atomic activation. Restricted chunks use approved local indexes or remain lexical-only. Deleted/superseded/restricted chunks are excluded immediately from new retrieval.

## Hybrid retrieval pipeline

1. Query plan: names/constraints, filters, privacy, hosted/local/retrieval-only mode.
2. FTS5 candidates for exact phrases, names, URLs, titles, rare terms.
3. Vector candidates for paraphrase/concept.
4. Deterministic rank fusion with component scores.
5. Exact/near duplicate clustering.
6. Source diversity and approved trust adjustment without hiding conflicts.
7. Replaceable reranking with deterministic fallback.
8. Token/source/item/domain-bounded evidence selection.

## Context and prompt-injection defense

Every block has a stable citation ID resolving to exact chunk, item, and span. Source content is wrapped as untrusted evidence. Context carries title, URL/item link, coverage, capture date, span, sensitivity, trust/staleness. Enforce max tokens, chunks per item, and duplicate-domain/cluster concentration. Truncation is recorded and the retrieval run keeps the full candidate trace.

## Answer states and citations

- `answered`: evidence supports requested answer.
- `partially_answered`: some requested facts unsupported or coverage-limited.
- `conflicting_evidence`: saved sources disagree and each claim remains separate.
- `insufficient_evidence`: corpus does not support an answer; show closest evidence/refinement.

Every factual paragraph/block requires one or more supplied-context citations. Citation IDs must resolve to exact saved evidence. URL-only/caption-only/OCR-only/summary-only evidence is labeled. Repeated captures of one source are not independent support. External model knowledge is forbidden as corpus evidence.

## Conversational recall

History resolves references and filter intent only. Every turn performs fresh retrieval against current corpus/index/privacy state. Prior assistant answers are never evidence. Each turn persists retrieval/citation provenance. Users may narrow date, project, source, topic, or privacy mode.

## Zero-cost degradation

Independent limits for embedding, vector search, reranking, and generation. At hard threshold: stop optional calls; use lexical search, local path, or retrieval-only evidence cards. Capture/raw retrieval/exact search remain available. No billing method is added implicitly.

## Evaluation and release thresholds

Versioned gold corpus: at least 50 questions; ≥20% unanswerable/partial; ≥10% changing/conflicting; exact, paraphrase, comparison, synthesis, timeline, duplicate, stale, and privacy cases. Measure Recall@K, ranking/MRR/nDCG, duplicate concentration, citation precision/coverage, groundedness, insufficient-evidence accuracy, conflict preservation, privacy routing, cost, and P50/P95 latency separately.

Targets: Recall@5 ≥85%, citation precision ≥95%, citation coverage ≥90%, insufficient-evidence accuracy ≥90%, useful answers ≥70% after month one. Human citation sample and explicit go/no-go are mandatory. No critical privacy/deletion/unsupported-claim/billing defect may remain.
