# Tota Scriptura (content vault)

The Obsidian vault behind https://totascriptura.org, Joey's topical study of Scripture. Read `About.md` for the why. In short: gather Scripture passages by topic with minimal running commentary, aiming to be exhaustive ("tota Scriptura", the whole counsel of God). It is closer to Nave's Topical Bible than to prose theology, so don't add commentary or narrative to topic pages.

This is the **content repo** (`joeyday/totascriptura.org`). The site generator is a separate repo, `~/Projects/tsgen`, read its `CLAUDE.md` and `README.md` (the feature reference) before reasoning about how content renders. **Don't change anything in `~/Projects/tsgen` without Joey's express permission.**

## Layout

Markdown is allowed only in these folders (anything else fails the build):

- `topic/` (the bulk), `summary/` (book and article summaries), `commentary/`, `reference/`, `category/` (a page here is a category), `partial/` (reusable snippets, never pages), root pages (`About`, `Home page`, `Colophon`, …).
- A `notes/` folder next to a page holds its notes page: `topic/notes/Foo.md` is the notes for `topic/Foo.md`. The root `notes/` holds notes for root pages.
- `abbreviations.json` (`<abbr>` expansions) and `alt-text.json` (image alt text, keyed by file name). `image/` holds assets.
- `.claude/` (this file), `.obsidian/` and all other dot-folders are ignored by the generator. Since tsgen 0.8.0, files named `CLAUDE.md`, `PLAN.md` and `README.md` are ignored in any folder too.

Frontmatter keys are lowercase (`title`, `hidden`, `draft`, `featured`, `categories`, `aliases`, …). A capitalised key fails the build. See the tsgen README for what each does.

## Scripture reference conventions

- References use short book abbreviations (`Ro 3:23`, `Hos 8:14`, `Pr 15:8`, `Ps 50:13–15`, `1Ki 12:31`, `Ac 7:48`), matched **case-sensitively**; tsgen links them to ref.ly automatically. The accepted abbreviations are the last entry of each book's `names` list in tsgen's `BIBLE_BOOKS` (`lib/bible/`). Check there rather than guessing.
- Translation tags follow the reference (`Ac 7:48 KJV`, `Ac 19:37 NIV`).
- Within a list, a bare `50:13–15` continues the previous book. When a chapter number is out of range for the book (e.g. "Proverbs 50"), the usual cause is a dropped book prefix after a semicolon, so look at the surrounding context to find the intended book.
- Book of Mormon references appear on some topic pages under their own heading; leave them in their sections.

## Workflow

- Pushing to `main` deploys the live site (GitHub Actions: `npm ci && npm run build`). Commit only when asked; Joey asks for commit and push together.
- Commit messages are short, lowercase-ish, descriptive (`fixing many non-standard Bible book abbreviations`). Tsgen bumps are `Bump tsgen to X.Y.Z`.
- Releasing a new tsgen: `npm run update-tsgen -- X.Y.Z` (`scripts/update-tsgen.sh`). It edits only `package.json` and `package-lock.json`. Never run a full `npm install` in this vault (it lives in iCloud).
- To preview locally, run `tsgen serve` from the vault root with `TSGEN_OUT` set outside the vault (for test builds use the scratchpad). Never let build output land in the vault.
- Many pages open with `{{[[violation-goals]]}}`-style partial calls and `hidden: true`/`draft` flags. Respect the status of a page: don't un-hide or publish a hidden page unprompted.
