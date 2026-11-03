# Proposed Frontiers: public source release

Published 3 November 2026 from development revision `b6849dd52fd377b3f27f1995a24405f4fda7b721`.

This repository contains the current application source, tests, tracked assets and development documentation. It is a source snapshot; it does not automatically follow later changes in the production development repository.

The live application continues to use its existing deployment integration. The workflows in this public repository validate the code and do not deploy it. Production credentials, private runtime archives, database contents and local environment files are not included.

Existing source and third-party rights still apply. Publishing the source does not grant a new blanket licence. Preserve the licences and attribution included in the individual files and data references.

## Publication changes

- Added the vibe-coded disclosure and a development entry point.
- Retained the application logic, tests and supporting documentation.
- Removed a machine-specific Playwright fallback path; the optional geometry tool now uses the installed package or `PLAYWRIGHT_MODULE`.
- Added a GitHub Actions build-and-test workflow.
