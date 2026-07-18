# Risk register and devil’s-advocate review

| ID   | Risk                                       | L/I          | Mitigation                                                                               | Trigger                                 |
| ---- | ------------------------------------------ | ------------ | ---------------------------------------------------------------------------------------- | --------------------------------------- |
| R-01 | Becomes another storage graveyard          | High/High    | Intent, daily/weekly review, useful-recollection metric, cold storage                    | Review <25% for four weeks              |
| R-02 | Instagram extraction unreliable            | High/High    | URL-first promise, coverage badges, screenshot/recording guidance, no scraper dependency | >30% misleading summaries               |
| R-03 | Free AI quota/terms disappear              | Med/High     | Adapters, deterministic extraction, Ollama, hard thresholds                              | Policy change/repeated quota errors     |
| R-04 | Notion bottleneck/schema drift             | Med/Med      | D1 authority, async sync, Web Inbox/rebuild                                              | Sync lag >24h or schema failures        |
| R-05 | Too much low-intent capture                | High/Med     | Reason/categories/review prompts                                                         | Most captures unopened/no reason        |
| R-06 | Sensitive content reaches external model   | Low/Critical | Conservative routing, tests, adapters, provenance                                        | Any sensitive fixture in provider audit |
| R-07 | Attachment storage exceeds free tier       | Med/Med      | Limits, no auto-video copy, usage/retention                                              | Storage >70%                            |
| R-08 | Local worker slow/offline                  | High/Low     | Pending state, manual run, approved hosted path                                          | Private backlog threshold               |
| R-09 | AI categorization wrong                    | High/Low     | Editable fields, known project list, user intent priority                                | Correction >40%                         |
| R-10 | Overengineering delays value               | High/High    | Vertical slices/gates                                                                    | Native/graph/vector before gates        |
| R-11 | Worker CPU/parser limits                   | Med/Med      | Thin path, staged/local parsing, size limits                                             | Repeated CPU-limit errors               |
| R-12 | Single maintainer dependency               | High/Med     | Complete docs, ADRs, tests, exports, runbooks                                            | Undocumented manual fixes required      |
| R-13 | Fluent unsupported RAG answer              | Med/Critical | Answer states, citation validation, groundedness/refusal tests                           | Any sampled unsupported factual claim   |
| R-14 | Stale vector index                         | Med/High     | Content/index versions, invalidation, lexical fallback                                   | Deleted/edited content in new answer    |
| R-15 | Reposts create false confidence            | High/High    | Duplicate clusters, diversity, trust-aware selection                                     | One source dominates corroboration      |
| R-16 | Evaluation overfits                        | Med/Med      | Holdout, real feedback, failure-set growth                                               | Benchmark up/usefulness down            |
| R-17 | Conversation becomes self-evidence         | Med/High     | Fresh retrieval and prior-answer prohibition                                             | Follow-up relies on model text only     |
| R-18 | Silent billable usage                      | Low/Critical | No payment method, ledger, hard thresholds                                               | Nonzero invoice/overage path            |
| R-19 | Backup exists but restore fails            | Med/High     | Scheduled rehearsal/checksums/counts                                                     | Rehearsal mismatch/failure              |
| R-20 | Deletion incomplete across derived systems | Med/Critical | Purge orchestration, invalidation audit, tests                                           | Deleted source in search/answer/cache   |
| R-21 | Platform/legal violation                   | Med/High     | Official APIs, no bypass/scraping, legal review before SaaS                              | Access-control/terms change             |
| R-22 | Public product leaks tenants               | Med/Critical | Separate SaaS architecture/PRD, tenant tests                                             | Productization begins without isolation |
| R-23 | Notification leaks private context         | Low/High     | Neutral labels/secure links                                                              | Sensitive text appears externally       |
| R-24 | Docs and Linear drift from code            | Med/Med      | Contract change control, traceability, same-day sync                                     | Route/schema/status mismatch            |

## Devil’s-advocate questions

- Would Telegram + Notion solve 80% with less code?
- Will the owner actually review saved content?
- Does this capture need AI, or are reason/metadata/FTS enough?
- Does this file need copying, or is a reference sufficient?
- Is Notion necessary, and can Web Inbox prevent dependence?
- Is a native app justified by measured Shortcut limitations?
- What happens when every free service changes?
- Does vocabulary mismatch actually justify RAG?
- Can the feature be removed while preserving the core loop?

## Kill, pivot, or simplify

Simplify if fewer than five useful items/week after four weeks, old save destinations remain dominant despite fixes, weekly review/search produce no useful recollections, or maintenance exceeds value. Do not respond by adding speculative AI. The fallback is a smaller Share-to-Notion/Telegram workflow with exportable storage.
