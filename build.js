import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

// ─── Bible Reference Auto-Linker ──────────────────────────────────────────────

const BIBLE_BOOKS = [
  { names: ["Genesis", "Ge"], osis: "Gen" },
  { names: ["Exodus", "Ex"], osis: "Exod" },
  { names: ["Leviticus", "Lev"], osis: "Lev" },
  { names: ["Numbers", "Nu"], osis: "Num" },
  { names: ["Deuteronomy", "Dt"], osis: "Deut" },
  { names: ["Joshua", "Jos"], osis: "Josh" },
  { names: ["Judges", "Jdg"], osis: "Judg" },
  { names: ["Ruth", "Ru"], osis: "Ruth" },
  { names: ["1 Samuel", "1Samuel", "1Sa"], osis: "1Sam" },
  { names: ["2 Samuel", "2Samuel", "2Sa"], osis: "2Sam" },
  { names: ["1 Kings", "1Kings", "1Ki"], osis: "1Kgs" },
  { names: ["2 Kings", "2Kings", "2Ki"], osis: "2Kgs" },
  { names: ["1 Chronicles", "1Chronicles", "1Ch"], osis: "1Chr" },
  { names: ["2 Chronicles", "2Chronicles", "2Ch"], osis: "2Chr" },
  { names: ["Ezra", "Ezr"], osis: "Ezra" },
  { names: ["Nehemiah", "Ne"], osis: "Neh" },
  { names: ["Esther", "Est"], osis: "Esth" },
  { names: ["Job"], osis: "Job" },
  { names: ["Psalms", "Psalm", "Ps"], osis: "Ps" },
  { names: ["Proverbs", "Pr"], osis: "Prov" },
  { names: ["Ecclesiastes", "Ecc"], osis: "Eccl" },
  { names: ["Song of Solomon", "Song of Songs", "SS"], osis: "Song" },
  { names: ["Isaiah", "Isa"], osis: "Isa" },
  { names: ["Jeremiah", "Jer"], osis: "Jer" },
  { names: ["Lamentations", "La"], osis: "Lam" },
  { names: ["Ezekiel", "Eze"], osis: "Ezek" },
  { names: ["Daniel", "Da"], osis: "Dan" },
  { names: ["Hosea", "Hos"], osis: "Hos" },
  { names: ["Joel"], osis: "Joel" },
  { names: ["Amos", "Am"], osis: "Amos" },
  { names: ["Obadiah", "Ob"], osis: "Obad" },
  { names: ["Jonah", "Jnh"], osis: "Jonah" },
  { names: ["Micah", "Mic"], osis: "Mic" },
  { names: ["Nahum", "Na"], osis: "Nah" },
  { names: ["Habakkuk", "Hab"], osis: "Hab" },
  { names: ["Zephaniah", "Zep"], osis: "Zeph" },
  { names: ["Haggai", "Hag"], osis: "Hag" },
  { names: ["Zechariah", "Zec"], osis: "Zech" },
  { names: ["Malachi", "Mal"], osis: "Mal" },
  { names: ["Matthew", "Mt"], osis: "Matt" },
  { names: ["Mark", "Mk"], osis: "Mark" },
  { names: ["Luke", "Lk"], osis: "Luke" },
  { names: ["John", "Jn"], osis: "John" },
  { names: ["Acts", "Ac"], osis: "Acts" },
  { names: ["Romans", "Ro"], osis: "Rom" },
  { names: ["1 Corinthians", "1Corinthians", "1Co"], osis: "1Cor" },
  { names: ["2 Corinthians", "2Corinthians", "2Co"], osis: "2Cor" },
  { names: ["Galatians", "Gal"], osis: "Gal" },
  { names: ["Ephesians", "Eph"], osis: "Eph" },
  { names: ["Philippians", "Php"], osis: "Phil" },
  { names: ["Colossians", "Col"], osis: "Col" },
  { names: ["1 Thessalonians", "1Thessalonians", "1Th"], osis: "1Thess" },
  { names: ["2 Thessalonians", "2Thessalonians", "2Th"], osis: "2Thess" },
  { names: ["1 Timothy", "1Timothy", "1Ti"], osis: "1Tim" },
  { names: ["2 Timothy", "2Timothy", "2Ti"], osis: "2Tim" },
  { names: ["Titus", "Tit"], osis: "Titus" },
  { names: ["Philemon", "Phm"], osis: "Phlm" },
  { names: ["Hebrews", "Heb"], osis: "Heb" },
  { names: ["James", "Jas"], osis: "Jas" },
  { names: ["1 Peter", "1Peter", "1Pe"], osis: "1Pet" },
  { names: ["2 Peter", "2Peter", "2Pe"], osis: "2Pet" },
  { names: ["1 John", "1John", "1Jn"], osis: "1John" },
  { names: ["2 John", "2John", "2Jn"], osis: "2John" },
  { names: ["3 John", "3John", "3Jn"], osis: "3John" },
  { names: ["Jude"], osis: "Jude" },
  { names: ["Revelation", "Rev"], osis: "Rev" },
];

// Build a map from lowercased name/abbreviation to CWMS abbreviation
// The CWMS abbreviation is always the last element of each book's names array
const _bookCwmsMap = new Map();
for (const book of BIBLE_BOOKS) {
  const cwms = book.names[book.names.length - 1];
  for (const name of book.names) {
    _bookCwmsMap.set(name.toLowerCase(), cwms);
  }
}

// Build the reference regex
// Sorted by length desc so longer matches win (e.g. "Song of Solomon" before "Song")
const _allBookNames = BIBLE_BOOKS.flatMap((b) => b.names).sort(
  (a, b) => b.length - a.length,
);
// Each book name pattern: allow optional \s* between words and between a leading
// digit and the rest (so "1 Co" matches the abbreviation "1Co", etc.)
const _bookPattern = _allBookNames
  .map((n) => {
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Allow flexible whitespace between words (including "Song of Solomon")
    let pat = escaped.replace(/\\ /g, "\\s*").replace(/\s+/g, "\\s*");
    // Also allow optional space between a leading digit and the following letters
    // e.g. "1Co" becomes "1\\s*Co" so "1 Co" also matches
    pat = pat.replace(/^([123])([A-Za-z])/, "$1\\s*$2");
    return pat;
  })
  .join("|");

// Matches:
//   optional !opt-out
//   book name or abbreviation (word-boundary anchored via (?<!\w) / (?!\w))
//   whitespace
//   chapter number
//   optional :verseStart
//   optional range: -endChapterOrVerse[:endVerse]
//
// Capture groups:
//   1: bang ("!" or "")
//   2: book name/abbr (matched text)
//   3: chapter
//   4: verseStart
//   5: rangeVal  — endVerse (same-chapter) OR endChapter (cross-chapter)
//   6: endVerse  — only present in cross-chapter range
const BIBLE_REF_RE = new RegExp(
  `(?<![\\w])(\\!?)(${_bookPattern})\\s+(\\d+)(?::(\\d+)(?:\\s*[-\u2013\u2014]\\s*(\\d+)(?::(\\d+))?)?)?(?![\\w])`,
  "gi",
);

// Supported translation abbreviations (case-sensitive, word-boundary matched).
// When one of these follows the last ref in a citation group, all refs in that
// group link to that translation instead of the default ESV.
const TRANSLATIONS = new Set(["ESV", "KJV", "NASB", "NIV", "NKJV", "NLT", "NRSV"]);
const TRANS_RE = /\b(ESV|KJV|NASB|NIV|NKJV|NLT|NRSV)\b/g;

// Pre-pass: build a map from each named-ref start index → translation abbreviation.
// For each named ref, the translation is the first TRANS_RE match that appears
// after it and before the next named ref; defaults to 'ESV' if none is found.
function buildTranslationMap(text) {
  const map = new Map();

  BIBLE_REF_RE.lastIndex = 0;
  const namedRefs = [];
  let m;
  while ((m = BIBLE_REF_RE.exec(text)) !== null) {
    if (m[1] !== "!") namedRefs.push({ index: m.index });
  }

  TRANS_RE.lastIndex = 0;
  const transList = [];
  while ((m = TRANS_RE.exec(text)) !== null) {
    transList.push({ index: m.index, abbr: m[1] });
  }

  for (let i = 0; i < namedRefs.length; i++) {
    const from = namedRefs[i].index;
    const to = i + 1 < namedRefs.length ? namedRefs[i + 1].index : Infinity;
    const found = transList.find((t) => t.index > from && t.index < to);
    map.set(from, found ? found.abbr : "ESV");
  }

  return map;
}

function buildReflyUrl(cwms, chapter, verseStart, rangeVal, endVerse, translation = "ESV") {
  // rangeVal = endVerse (same-chapter) or endChapter (cross-chapter)
  // endVerse = undefined (same-chapter) or the end verse (cross-chapter)
  // URL: https://ref.ly/{cwms}{chapter}[.{verse}[-{endVerse}|{endChapter}.{endVerse}]];{translation}
  let ref = `${cwms}${chapter}`;
  if (verseStart) {
    ref += `.${verseStart}`;
    if (rangeVal) {
      if (endVerse) {
        // Cross-chapter: rangeVal is end chapter, endVerse is end verse
        ref += `-${rangeVal}.${endVerse}`;
      } else {
        // Same-chapter: rangeVal is end verse
        ref += `-${rangeVal}`;
      }
    }
  }
  return `https://ref.ly/${ref};${translation}`;
}

// Matches bare chapter:verse OR bare verse continuations after a separator.
// Two branches via alternation:
//   A) chapter:verse[-range] — colon present after firstNum
//   B) verse[-verse]         — no colon; requires ctxState.lastChapter to resolve
//
// Groups: 1=sep  2=firstNum  3=verseStart(A)  4=rangeVal(A)  5=endVerse(A cross-ch)  6=bareRangeEnd(B)
const CONT_REF_RE = /([;,]\s*)(\d+)(?::(\d+)(?:\s*[-\u2013\u2014]\s*(\d+)(?::(\d+))?)?|(?:\s*[-\u2013\u2014]\s*(\d+))?)?(?![\w:])/g;

function makeBibleRefLink(url, rawText) {
  let lt = rawText.replace(/\s/g, "\u00a0");
  lt = lt.replace(/(\d)\s*[-\u2014]\s*(\d)/g, "$1\u2013$2");
  return `<a href="${url}" class="external bible-ref" target="_blank" rel="noopener noreferrer">${lt}</a>`;
}

// ctxState = { lastCwms, lastChapter, translation } — shared across processPlainText calls.
// Apply continuation refs to a plain-text chunk using current context.
function applyContinuationRefs(text, ctxState) {
  if (!ctxState.lastCwms) return text;
  CONT_REF_RE.lastIndex = 0;
  return text.replace(CONT_REF_RE, (match, sep, firstNum, verseStart, rangeVal, endVerse, bareRangeEnd) => {
    let chapter, vs, rv, ev;
    if (verseStart !== undefined) {
      // Branch A: chapter:verse format — firstNum is the chapter
      chapter = firstNum;
      vs = verseStart;
      rv = rangeVal;
      ev = endVerse;
      ctxState.lastChapter = chapter;
    } else if (ctxState.lastChapter) {
      // Branch B: bare verse — firstNum is a verse in the last known chapter
      chapter = ctxState.lastChapter;
      vs = firstNum;
      rv = bareRangeEnd;
      ev = undefined;
    } else {
      // No chapter context yet; can't resolve a bare verse
      return match;
    }
    const url = buildReflyUrl(ctxState.lastCwms, chapter, vs, rv, ev, ctxState.translation);
    return sep + makeBibleRefLink(url, match.slice(sep.length));
  });
}

// ctxState = { lastCwms, lastChapter, translation } — shared across calls within one
// linkBibleRefs pass so continuation refs can span inline tags. Reset at block boundaries.
function processPlainText(text, ctxState) {
  // Pre-pass: determine which translation each named ref's group uses
  const transMap = buildTranslationMap(text);

  BIBLE_REF_RE.lastIndex = 0;
  let result = "";
  let lastIndex = 0;
  let m;
  while ((m = BIBLE_REF_RE.exec(text)) !== null) {
    const [match, bang, bookName, chapter, verseStart, rangeVal, endVerse] = m;
    // Apply continuation refs to the gap before this named ref
    result += applyContinuationRefs(text.slice(lastIndex, m.index), ctxState);
    if (bang === "!") {
      // Opt-out: emit raw text without the leading !
      result += match.slice(1);
    } else {
      const normalized = bookName.toLowerCase().replace(/\s+/g, " ").trim();
      const cwms = _bookCwmsMap.get(normalized) || _bookCwmsMap.get(normalized.replace(/\s/g, ""));
      if (cwms) {
        ctxState.lastCwms = cwms;
        ctxState.lastChapter = chapter;
        ctxState.translation = transMap.get(m.index) || "ESV";
        const url = buildReflyUrl(cwms, chapter, verseStart, rangeVal, endVerse, ctxState.translation);
        result += makeBibleRefLink(url, match);
      } else {
        result += match;
      }
    }
    lastIndex = m.index + match.length;
  }
  // Trailing text after the last named ref
  result += applyContinuationRefs(text.slice(lastIndex), ctxState);
  // Move each trailing translation abbreviation inside the preceding closing </a>
  // e.g. "3:1–4</a> KJV" → "3:1–4 KJV</a>"
  result = result.replace(/(<\/a>)\s+(ESV|KJV|NASB|NIV|NKJV|NLT|NRSV)\b/g, " $2$1");
  return result;
}

// Tags whose content we skip entirely (no Bible-ref linking inside these)
const SKIP_TAGS = new Set(["a", "code", "pre", "script", "style"]);

// Block-level tags that reset the continuation-ref context between paragraphs/items
const BLOCK_TAGS = new Set([
  "p", "li", "dd", "dt", "blockquote", "div", "section", "article",
  "h1", "h2", "h3", "h4", "h5", "h6", "td", "th", "figcaption",
]);

function linkBibleRefs(html) {
  // Split HTML into raw-markup chunks and plain-text chunks.
  // Use a stack to correctly track nested skip tags (e.g. <a><code>…</code></a>).
  const result = [];
  // Regex to find HTML tags (opening, closing, self-closing, comments, CDATA)
  const TAG_RE = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;

  // Stack of skip-tag names currently open
  const skipStack = [];
  // Shared continuation-ref context; reset at every block boundary
  const ctxState = { lastCwms: null, lastChapter: null, translation: "ESV" };
  let lastIndex = 0;

  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(html)) !== null) {
    const tagFull = m[0];
    const tagName = m[1] ? m[1].toLowerCase() : null;
    const before = html.slice(lastIndex, m.index);

    // Handle text before this tag
    if (before) {
      if (skipStack.length === 0) {
        result.push(processPlainText(before, ctxState));
      } else {
        result.push(before);
      }
    }

    // Reset continuation context at block boundaries (opening or closing tag)
    if (tagName && BLOCK_TAGS.has(tagName)) {
      ctxState.lastCwms = null;
      ctxState.lastChapter = null;
      ctxState.translation = "ESV";
    }

    // Update skip stack based on tag type
    if (tagName && SKIP_TAGS.has(tagName)) {
      if (tagFull.startsWith("</")) {
        // Closing tag: pop matching tag from the stack top
        if (skipStack.length > 0 && skipStack[skipStack.length - 1] === tagName) {
          skipStack.pop();
        }
      } else if (!tagFull.endsWith("/>")) {
        // Opening (non-self-closing) tag: push onto stack
        skipStack.push(tagName);
      }
    }

    result.push(tagFull);
    lastIndex = m.index + tagFull.length;
  }

  // Handle trailing text
  const tail = html.slice(lastIndex);
  if (tail) {
    if (skipStack.length === 0) {
      result.push(processPlainText(tail, ctxState));
    } else {
      result.push(tail);
    }
  }

  return result.join("");
}

async function findHtmlFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findHtmlFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      results.push(fullPath);
    }
  }
  return results;
}

// ─── End Bible Reference Auto-Linker ──────────────────────────────────────────

// ─── Abbreviation Expansion ───────────────────────────────────────────────────

async function loadAbbrMap() {
  const abbrFile = "abbreviations.json";
  let raw;
  try {
    raw = await fs.readFile(abbrFile, "utf-8");
  } catch {
    console.log("Abbreviation expander: abbreviations.json not found, skipping.");
    return null;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.log("Abbreviation expander: abbreviations.json is not valid JSON, skipping.");
    return null;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    console.log("Abbreviation expander: abbreviations.json must be a JSON object, skipping.");
    return null;
  }
  return data;
}

// Tags whose content we skip entirely for abbreviation wrapping
const ABBR_SKIP_TAGS = new Set(["abbr", "a", "code", "pre", "script", "style"]);

function wrapAbbreviations(html, abbrMap) {
  // Sort abbreviations longest-first to prevent prefix collisions
  const sorted = Object.keys(abbrMap).sort((a, b) => b.length - a.length);

  // Build a single regex that matches any abbreviation (case-sensitive)
  // For each abbreviation:
  //   - If it ends with a word character, use \b on both sides
  //   - If it ends with punctuation (e.g. "e.g."), use \b on the left only
  const parts = sorted.map((abbr) => {
    const escaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const lastChar = abbr[abbr.length - 1];
    const rightBoundary = /\w/.test(lastChar) ? "\\b" : "";
    return `\\b${escaped}${rightBoundary}`;
  });
  const combinedRe = new RegExp(`(${parts.join("|")})`, "g");

  // Split HTML into tag and text chunks, process only text nodes outside skip tags
  const result = [];
  const TAG_RE = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
  const skipStack = [];
  let lastIndex = 0;

  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(html)) !== null) {
    const tagFull = m[0];
    const tagName = m[1] ? m[1].toLowerCase() : null;
    const before = html.slice(lastIndex, m.index);

    if (before) {
      if (skipStack.length === 0) {
        result.push(before.replace(combinedRe, (match) => {
          const expansion = abbrMap[match];
          return expansion ? `<abbr title="${expansion}">${match}</abbr>` : match;
        }));
      } else {
        result.push(before);
      }
    }

    if (tagName && ABBR_SKIP_TAGS.has(tagName)) {
      if (tagFull.startsWith("</")) {
        if (skipStack.length > 0 && skipStack[skipStack.length - 1] === tagName) {
          skipStack.pop();
        }
      } else if (!tagFull.endsWith("/>")) {
        skipStack.push(tagName);
      }
    }

    result.push(tagFull);
    lastIndex = m.index + tagFull.length;
  }

  const tail = html.slice(lastIndex);
  if (tail) {
    if (skipStack.length === 0) {
      result.push(tail.replace(combinedRe, (match) => {
        const expansion = abbrMap[match];
        return expansion ? `<abbr title="${expansion}">${match}</abbr>` : match;
      }));
    } else {
      result.push(tail);
    }
  }

  return result.join("");
}

// ─── End Abbreviation Expansion ───────────────────────────────────────────────

import markdownIt from "markdown-it";
import markdownItFootnote from "markdown-it-footnote";
import markdownItMark from "markdown-it-mark";
import markdownItContainer from "markdown-it-container";
import markdownItBracketedSpans from "markdown-it-bracketed-spans";
import markdownItAttrs from "markdown-it-attrs";
import ejs from "ejs";
import slugify from "slugify";

function parseFencedAttrs(info) {
  const attrs = { classes: [], id: null, other: {} };
  if (!info) return attrs;
  const m = info.match(/^\x01(.*)\x01$/);
  if (!m) {
    attrs.classes.push(info);
    return attrs;
  }
  const tokens = m[1].match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  for (const token of tokens) {
    if (token.startsWith(".")) {
      attrs.classes.push(token.slice(1));
    } else if (token.startsWith("#")) {
      attrs.id = token.slice(1);
    } else if (token.includes("=")) {
      const eq = token.indexOf("=");
      const key = token.slice(0, eq);
      let val = token.slice(eq + 1);
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      attrs.other[key] = val;
    }
  }
  return attrs;
}

function protectFencedAttrs(text) {
  return text.replace(
    /^(:::)\s*\{([^}]+)\}/gm,
    (m, colons, content) => colons + "\x01" + content + "\x01",
  );
}

const md = markdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
})
  .enable("strikethrough")
  .use(markdownItFootnote)
  .use(markdownItMark)
  .use(markdownItBracketedSpans)
  .use(markdownItContainer, "", {
    validate: () => true,
    render(tokens, idx) {
      const info = tokens[idx].info.trim();
      if (tokens[idx].nesting === 1) {
        if (!info) return "<div>\n";
        const parsed = parseFencedAttrs(info);
        let tag = "<div";
        if (parsed.id) tag += ` id="${parsed.id}"`;
        if (parsed.classes.length)
          tag += ` class="${parsed.classes.join(" ")}"`;
        for (const [k, v] of Object.entries(parsed.other)) {
          tag += ` ${k}="${v}"`;
        }
        return tag + ">\n";
      }
      return "</div>\n";
    },
  })
  .use(markdownItAttrs);

const OUTPUT_DIR = "dist";
const TEMPLATE_PATH = path.join("template", "layout.ejs");
const SKIP_FILES = new Set(["replit.md"]);
const MD_SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  ".github",
  ".local",
  "template",
]);
const ASSET_SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  ".github",
  ".local",
]);
const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".avif",
  ".ico",
  ".bmp",
]);
const ASSET_EXTENSIONS = new Set([
  ...IMAGE_EXTENSIONS,
  ".css",
  ".eot",
  ".otf",
  ".ttf",
  ".woff",
  ".woff2",
]);

async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function findFiles(dir, { skipDirs, filter, rootDir }) {
  rootDir = rootDir || dir;
  const results = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name) || entry.name.startsWith(".")) continue;
      const subResults = await findFiles(fullPath, {
        skipDirs,
        filter,
        rootDir,
      });
      results.push(...subResults);
    } else if (entry.isFile()) {
      const item = filter(entry, fullPath, rootDir);
      if (item) results.push(item);
    }
  }
  return results;
}

function findMarkdownFiles(dir) {
  return findFiles(dir, {
    skipDirs: MD_SKIP_DIRS,
    filter: (entry, fullPath, rootDir) => {
      if (
        !entry.name.endsWith(".md") ||
        SKIP_FILES.has(entry.name.toLowerCase())
      )
        return null;
      const relDir = path.relative(rootDir, path.dirname(fullPath));
      return { filePath: fullPath, relDir, fileName: entry.name };
    },
  });
}

function findAssetFiles(dir) {
  return findFiles(dir, {
    skipDirs: ASSET_SKIP_DIRS,
    filter: (entry, fullPath) => {
      const ext = path.extname(entry.name).toLowerCase();
      if (!ASSET_EXTENSIONS.has(ext)) return null;
      return { filePath: fullPath, fileName: entry.name };
    },
  });
}

function getOutputPaths(finalUrlPath) {
  let outDirPath;
  if (finalUrlPath === "/") {
    outDirPath = OUTPUT_DIR;
  } else {
    outDirPath = path.join(OUTPUT_DIR, finalUrlPath.substring(1));
  }
  return { outDirPath, outFilePath: path.join(outDirPath, "index.html") };
}

function getFrontmatterValue(data, key) {
  const lowerKey = key.toLowerCase();
  for (const k of Object.keys(data)) {
    if (k.toLowerCase() === lowerKey) {
      return data[k];
    }
  }
  return undefined;
}

function stripBrackets(value) {
  if (typeof value !== "string") return value;
  return value.replace(/^\[\[/, "").replace(/\]\]$/, "").trim();
}

function resolveFileMapKey(target, fileMap) {
  const raw = target.toLowerCase().trim();
  if (fileMap[raw]) return raw;
  for (const key of Object.keys(fileMap)) {
    if (key.replace(/-/g, " ") === raw) return key;
  }
  return raw;
}

function resolveEmbeds(text, contentMap, { seen = new Set() } = {}) {
  return text.replace(
    /\{\{([^}|]+?)(?:\|([^}]*))?\}\}/g,
    (match, name, argsStr) => {
      name = name.trim().replace(/^\[\[/, "").replace(/\]\]$/, "").trim();
      const key = name.toLowerCase().trim();

      // Numeric names are unfilled positional placeholders — leave as empty
      if (/^\d+$/.test(key)) return "";

      if (seen.has(key)) {
        console.warn(`Warning: Circular embed detected — "${name}"`);
        return `<!-- circular embed: ${name} -->`;
      }

      let embedContent = contentMap[key];
      if (embedContent === undefined || embedContent === null) {
        console.warn(`Warning: Embed not found — "${name}"`);
        return `<!-- embed not found: ${name} -->`;
      }

      const args = argsStr ? argsStr.split("|").map((a) => a.trim()) : [];

      for (let i = 0; i < args.length; i++) {
        embedContent = embedContent.replace(
          new RegExp(`\\{\\{${i + 1}\\}\\}`, "g"),
          args[i],
        );
      }

      // Replace any remaining unfilled {{N}} placeholders with empty string
      embedContent = embedContent.replace(/\{\{\d+\}\}/g, "");

      embedContent = embedContent.replace(/\{\{\$args\}\}/g, args.join(", "));
      embedContent = embedContent.replace(/\{\{\$n\}\}/g, String(args.length));

      const newSeen = new Set(seen);
      newSeen.add(key);
      return resolveEmbeds(embedContent, contentMap, { seen: newSeen });
    },
  );
}

function parseCategoriesList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((v) => stripBrackets(String(v)));
  }
  return [stripBrackets(String(raw))];
}

async function build() {
  await ensureDir(OUTPUT_DIR);
  const layoutTemplate = await fs.readFile(TEMPLATE_PATH, "utf-8");

  const fileMap = {};
  const titleMap = {};
  const contentMap = {};
  const filesToProcess = [];

  const imageMap = {};
  const assetFiles = await findAssetFiles(".");
  const assetsOutDir = path.join(OUTPUT_DIR, "asset");
  if (assetFiles.length > 0) {
    await ensureDir(assetsOutDir);
  }
  const seenAssetNames = new Map();
  for (const { filePath: assetPath, fileName: assetName } of assetFiles) {
    const lowerName = assetName.toLowerCase();
    if (seenAssetNames.has(lowerName)) {
      console.warn(
        `Warning: Asset filename collision — "${assetName}" from "${assetPath}" overwrites "${seenAssetNames.get(lowerName)}"`,
      );
    }
    seenAssetNames.set(lowerName, assetPath);
    const outPath = path.join(assetsOutDir, assetName);
    await fs.copyFile(assetPath, outPath);
    const ext = path.extname(assetName).toLowerCase();
    if (IMAGE_EXTENSIONS.has(ext)) {
      imageMap[lowerName] = `/asset/${assetName}`;
    }
  }
  if (assetFiles.length > 0) {
    console.log(`Copied ${assetFiles.length} asset(s) to dist/asset/`);
  }

  const mdFiles = await findMarkdownFiles(".");

  for (const { filePath, relDir, fileName } of mdFiles) {
    const content = await fs.readFile(filePath, "utf-8");
    let parsed;
    try {
      parsed = matter(content);
    } catch (err) {
      console.warn(
        `Warning: Failed to parse frontmatter in "${filePath}" — skipping (${err.message})`,
      );
      continue;
    }

    const baseName = path.basename(fileName, ".md");

    let permalink = getFrontmatterValue(parsed.data, "permalink");
    if (typeof permalink === "string") {
      permalink = permalink.replace(/^\/+/, "");
    }

    if (!permalink) {
      permalink = slugify(baseName, { lower: true, strict: true });
    }

    let finalUrlPath;
    if (relDir === "" && permalink === "home") {
      finalUrlPath = "/";
    } else if ((relDir === "" && permalink === "index") || permalink === "") {
      finalUrlPath = "/";
    } else {
      if (relDir === "") {
        finalUrlPath = `/${permalink}`;
      } else {
        finalUrlPath = `/${relDir}/${permalink}`;
      }
    }

    const key = baseName.toLowerCase().trim();
    fileMap[key] = finalUrlPath;
    parsed.data.permalink = permalink;

    const title = getFrontmatterValue(parsed.data, "title") || baseName;
    if (!getFrontmatterValue(parsed.data, "title")) {
      parsed.data.title = baseName;
    }
    titleMap[key] = title;
    contentMap[key] = parsed.content;

    const hidden = !!getFrontmatterValue(parsed.data, "hidden");
    const rawAliases = getFrontmatterValue(parsed.data, "aliases");
    const aliases = parseCategoriesList(rawAliases);
    const asideOf = getFrontmatterValue(parsed.data, "aside of");
    const rawCategories = getFrontmatterValue(parsed.data, "categories");
    const categories = parseCategoriesList(rawCategories);
    const featured = !!getFrontmatterValue(parsed.data, "featured");
    const draft = !!getFrontmatterValue(parsed.data, "draft");

    filesToProcess.push({
      relDir,
      fileName,
      filePath,
      baseName,
      permalink,
      finalUrlPath,
      parsed,
      title,
      hidden,
      aliases,
      asideOf: asideOf ? stripBrackets(String(asideOf)) : null,
      categories,
      featured,
      draft,
    });
  }

  const aliasRedirects = [];
  for (const fileInfo of filesToProcess) {
    if (fileInfo.aliases.length === 0) continue;
    for (const aliasName of fileInfo.aliases) {
      const aliasSlug = slugify(aliasName, { lower: true, strict: true });
      const aliasUrlPath =
        fileInfo.relDir === ""
          ? `/${aliasSlug}`
          : `/${fileInfo.relDir}/${aliasSlug}`;
      const aliasKey = aliasName.toLowerCase().trim();
      if (!fileMap[aliasKey]) fileMap[aliasKey] = fileInfo.finalUrlPath;
      if (!fileMap[aliasSlug]) fileMap[aliasSlug] = fileInfo.finalUrlPath;
      aliasRedirects.push({
        fromUrlPath: aliasUrlPath,
        toUrl: fileInfo.finalUrlPath,
        toTitle: fileInfo.title,
      });
    }
  }

  const featuredPages = [];
  const draftPages = [];

  for (const fileInfo of filesToProcess) {
    if (fileInfo.hidden) continue;
    if (fileInfo.featured) {
      featuredPages.push({ title: fileInfo.title, url: fileInfo.finalUrlPath });
    }
    if (fileInfo.draft) {
      draftPages.push({ title: fileInfo.title, url: fileInfo.finalUrlPath });
    }
  }

  featuredPages.sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );
  draftPages.sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );

  const asidesMap = {};
  for (const fileInfo of filesToProcess) {
    if (fileInfo.hidden) continue;
    if (!fileInfo.asideOf) continue;
    const resolvedKey = resolveFileMapKey(fileInfo.asideOf, fileMap);
    if (!asidesMap[resolvedKey]) {
      asidesMap[resolvedKey] = [];
    }
    asidesMap[resolvedKey].push({
      title: fileInfo.title,
      url: fileInfo.finalUrlPath,
    });
  }

  const membersMap = {};
  for (const fileInfo of filesToProcess) {
    if (fileInfo.hidden) continue;
    for (const catName of fileInfo.categories) {
      const resolvedKey = resolveFileMapKey(catName, fileMap);
      if (!membersMap[resolvedKey]) {
        membersMap[resolvedKey] = [];
      }
      membersMap[resolvedKey].push({
        title: fileInfo.title,
        url: fileInfo.finalUrlPath,
      });
    }
  }

  const urlToKey = {};
  for (const [key, url] of Object.entries(fileMap)) {
    if (!urlToKey[url]) urlToKey[url] = key;
  }

  const hiddenUrls = new Set(
    filesToProcess.filter((f) => f.hidden).map((f) => f.finalUrlPath),
  );
  const allKnownUrls = new Set([
    ...Object.values(fileMap).filter((url) => !hiddenUrls.has(url)),
    ...aliasRedirects.map((r) => r.fromUrlPath),
    ...Object.values(imageMap),
    "/search",
  ]);
  const draftUrls = new Set(draftPages.map((p) => p.url));
  const featuredUrls = new Set(featuredPages.map((p) => p.url));
  const categoryUrls = new Set();
  for (const key of Object.keys(membersMap)) {
    if (fileMap[key]) categoryUrls.add(fileMap[key]);
  }
  const asideUrls = new Set();
  for (const fileInfo of filesToProcess) {
    if (fileInfo.asideOf) {
      asideUrls.add(fileInfo.finalUrlPath);
    }
  }

  function classifyLinks(html) {
    return html.replace(
      /<a\s([^>]*href="([^"]*)"[^>]*)>/g,
      (match, attrs, href) => {
        const classes = [];
        if (/^https?:\/\//.test(href)) {
          classes.push("external");
        } else {
          classes.push("internal");
          if (href.startsWith("/")) {
            if (draftUrls.has(href)) classes.push("draft");
            if (categoryUrls.has(href)) classes.push("category");
            if (asideUrls.has(href)) classes.push("aside");
            if (featuredUrls.has(href)) classes.push("featured");
            if (!allKnownUrls.has(href) && !href.startsWith("/index/"))
              classes.push("broken");
          }
        }
        if (/class="/.test(attrs)) {
          return `<a ${attrs.replace(/class="([^"]*)"/, `class="$1 ${classes.join(" ")}"`)}>`;
        }
        return `<a class="${classes.join(" ")}" ${attrs}>`;
      },
    );
  }

  function renderLayout(content, locals = {}) {
    return classifyLinks(
      ejs.render(layoutTemplate, {
        frontmatter: locals.frontmatter || {},
        content,
        asideOf: locals.asideOf || null,
        isAside: locals.isAside || false,
        asides: locals.asides || [],
        categories: locals.categories || [],
        subcategories: locals.subcategories || [],
        pages: locals.pages || [],
      }),
    );
  }

  const allPages = [];
  for (const fileInfo of filesToProcess) {
    if (fileInfo.asideOf) continue;
    if (fileInfo.relDir === "") continue;
    if (fileInfo.hidden) continue;
    const pageKey = fileInfo.baseName.toLowerCase().trim();
    if (membersMap[pageKey]) continue;

    allPages.push({ title: fileInfo.title, url: fileInfo.finalUrlPath });
    for (const aliasName of fileInfo.aliases) {
      allPages.push({
        title: aliasName,
        redirect: { title: fileInfo.title, url: fileInfo.finalUrlPath },
      });
    }
  }
  allPages.sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );

  const searchDocs = [];

  for (const fileInfo of filesToProcess) {
    if (fileInfo.hidden) continue;

    let markdownContent = resolveEmbeds(fileInfo.parsed.content, contentMap);

    markdownContent = markdownContent.replace(
      /(!?)\[\[(.*?)\]\]/g,
      (match, bang, inner) => {
        const isEmbed = bang === "!";
        let target = inner;
        let text = inner;
        if (inner.includes("|")) {
          const parts = inner.split("|");
          target = parts[0];
          text = parts.slice(1).join("|");
        }

        let searchTarget = target.trim();

        const ext = path.extname(searchTarget).toLowerCase();
        if (IMAGE_EXTENSIONS.has(ext)) {
          const imgUrl = imageMap[searchTarget.toLowerCase()] || searchTarget;
          if (isEmbed) {
            let attrs = "";
            const dimMatch = text.match(/^(\d+)(?:x(\d+))?$/);
            if (dimMatch) {
              attrs += ` width="${dimMatch[1]}"`;
              if (dimMatch[2]) attrs += ` height="${dimMatch[2]}"`;
              return `<img src="${imgUrl}" alt="${searchTarget}"${attrs}>`;
            }
            const alt = text === inner ? searchTarget : text;
            return `<img src="${imgUrl}" alt="${alt}">`;
          } else {
            const linkText = text === inner ? searchTarget : text;
            return `[${linkText}](${imgUrl})`;
          }
        }

        if (searchTarget.toLowerCase().endsWith(".md")) {
          searchTarget = searchTarget.substring(0, searchTarget.length - 3);
        }

        const linkUrl =
          fileMap[searchTarget.toLowerCase()] ||
          `/${slugify(target, { lower: true, strict: true })}`;
        return `[${text}](${linkUrl})`;
      },
    );

    try {
      markdownContent = ejs.render(markdownContent, {
        frontmatter: fileInfo.parsed.data,
        contentMap,
        fileMap,
        imageMap,
      });
    } catch (err) {
      console.warn(
        `Warning: EJS render error in "${fileInfo.filePath}" — ${err.message}`,
      );
      markdownContent = `<!-- EJS render error in: ${fileInfo.fileName} -->`;
    }

    markdownContent = markdownContent.replace(/%%[\s\S]*?%%/g, "");

    markdownContent = markdownContent.replace(
      /(?<!~)~(?!~)([^~\n]+?)(?<!~)~(?!~)/g,
      "<small>$1</small>",
    );

    markdownContent = protectFencedAttrs(markdownContent);
    const htmlContent = md.render(markdownContent);

    let asideOfResolved = null;
    if (fileInfo.asideOf) {
      const resolvedKey = resolveFileMapKey(fileInfo.asideOf, fileMap);
      if (fileMap[resolvedKey]) {
        asideOfResolved = {
          title: titleMap[resolvedKey],
          url: fileMap[resolvedKey],
        };
      }
    }

    const pageKey = fileInfo.baseName.toLowerCase().trim();
    const asides = asidesMap[pageKey] || [];

    const resolvedCategories = fileInfo.categories.map((catName) => {
      const resolvedKey = resolveFileMapKey(catName, fileMap);
      return {
        title: titleMap[resolvedKey] || catName,
        url:
          fileMap[resolvedKey] ||
          `/${slugify(catName, { lower: true, strict: true })}`,
      };
    });

    const allMembers = membersMap[pageKey] || [];
    const subcategories = [];
    const pages = [];
    for (const member of allMembers) {
      const memberKey = urlToKey[member.url];
      if (
        memberKey &&
        membersMap[memberKey] &&
        membersMap[memberKey].length > 0
      ) {
        subcategories.push(member);
      } else {
        pages.push(member);
      }
    }

    const finalHtml = renderLayout(htmlContent, {
      frontmatter: fileInfo.parsed.data,
      asideOf: asideOfResolved,
      isAside: !!fileInfo.asideOf,
      asides,
      categories: resolvedCategories,
      subcategories,
      pages,
    });

    const { outDirPath, outFilePath } = getOutputPaths(fileInfo.finalUrlPath);
    await ensureDir(outDirPath);
    await fs.writeFile(outFilePath, finalHtml);
    console.log(
      `Built: ${fileInfo.filePath} -> ${outFilePath} (URL: ${fileInfo.finalUrlPath})`,
    );

    const bodyText = htmlContent
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    searchDocs.push({
      id: fileInfo.finalUrlPath,
      title: fileInfo.title,
      url: fileInfo.finalUrlPath,
      body: bodyText.slice(0, 5000),
    });
  }

  for (const { fromUrlPath, toUrl, toTitle } of aliasRedirects) {
    const redirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=${toUrl}">
  <link rel="canonical" href="${toUrl}">
  <title>Redirecting to ${toTitle}</title>
</head>
<body>
  <p>Redirecting to <a href="${toUrl}">${toTitle}</a>...</p>
</body>
</html>`;
    const { outDirPath, outFilePath } = getOutputPaths(fromUrlPath);
    await ensureDir(outDirPath);
    await fs.writeFile(outFilePath, redirectHtml);
    console.log(`Built (alias redirect): ${fromUrlPath} -> ${toUrl}`);
  }

  const pagesWithCategories = new Set();
  for (const fileInfo of filesToProcess) {
    if (fileInfo.categories.length > 0) {
      pagesWithCategories.add(fileInfo.baseName.toLowerCase().trim());
    }
  }

  const topLevelCategoryPages = Object.keys(membersMap)
    .filter((key) => fileMap[key] && !pagesWithCategories.has(key) && !hiddenUrls.has(fileMap[key]))
    .map((key) => ({ title: titleMap[key] || key, url: fileMap[key] }))
    .sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
    );

  const indexPages = [
    { slug: "alphabetical", title: "Alphabetical index", items: allPages },
    {
      slug: "categorical",
      title: "Categorical index",
      items: topLevelCategoryPages,
    },
    { slug: "featured", title: "Featured topics", items: featuredPages },
    { slug: "drafts", title: "Drafts", items: draftPages },
  ];

  for (const indexPage of indexPages) {
    let listHtml = "";
    if (indexPage.items.length === 0) {
      listHtml += "<p>No pages yet.</p>";
    } else {
      listHtml += "<ul>\n";
      for (const item of indexPage.items) {
        if (item.redirect) {
          listHtml += `  <li>${item.title} <small>(see <a href="${item.redirect.url}">${item.redirect.title}</a>)</small></li>\n`;
        } else {
          listHtml += `  <li><a href="${item.url}">${item.title}</a></li>\n`;
        }
      }
      listHtml += "</ul>";
    }

    const html = renderLayout(listHtml, {
      frontmatter: { title: indexPage.title, permalink: indexPage.slug },
    });

    const outDir = path.join(OUTPUT_DIR, "index", indexPage.slug);
    await ensureDir(outDir);
    await fs.writeFile(path.join(outDir, "index.html"), html);
    console.log(`Built (index): /index/${indexPage.slug}`);
  }

  await fs.writeFile(
    path.join(OUTPUT_DIR, "search-index.json"),
    JSON.stringify(searchDocs),
  );
  console.log(`Built search index: ${searchDocs.length} document(s)`);

  const searchJs = `(function() {
  var index = null;
  var docs = null;
  var input = document.getElementById("search-input");
  var results = document.getElementById("search-results");

  function render(hits) {
    if (!hits.length) {
      results.innerHTML = input.value.trim() ? "<p>No results found.</p>" : "";
      return;
    }
    var html = "<ul>";
    for (var i = 0; i < hits.length; i++) {
      html += '<li><a href="' + hits[i].url + '">' + hits[i].title + '</a></li>';
    }
    html += "</ul>";
    results.innerHTML = html;
  }

  function doSearch() {
    if (!index) return;
    var q = input.value.trim();
    var url = new URL(window.location);
    if (q) {
      url.searchParams.set("q", q);
    } else {
      url.searchParams.delete("q");
    }
    history.replaceState(null, "", url);
    if (!q) { render([]); return; }
    var hits = index.search(q, { prefix: true, fuzzy: 0.2, boost: { title: 2 } });
    var mapped = [];
    for (var i = 0; i < hits.length; i++) {
      var doc = docs.find(function(d) { return d.id === hits[i].id; });
      if (doc) mapped.push({ title: doc.title, url: doc.url });
    }
    render(mapped);
  }

  fetch("/search-index.json")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      docs = data;
      index = new MiniSearch({ fields: ["title", "body"], storeFields: ["title", "url"] });
      index.addAll(docs);
      var params = new URLSearchParams(window.location.search);
      var q = params.get("q");
      if (q) { input.value = q; }
      doSearch();
    });

  input.addEventListener("input", doSearch);
})();
`;
  await fs.writeFile(path.join(OUTPUT_DIR, "search.js"), searchJs);

  const searchContent = `<div id="search-page">
  <input type="text" id="search-input" placeholder="Search…" autofocus>
  <div id="search-results"></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/minisearch@7/dist/umd/index.min.js"><\/script>
<script src="/search.js"><\/script>`;

  const searchHtml = renderLayout(searchContent, {
    frontmatter: { title: "Search", permalink: "search" },
  });

  const searchOutDir = path.join(OUTPUT_DIR, "search");
  await ensureDir(searchOutDir);
  await fs.writeFile(path.join(searchOutDir, "index.html"), searchHtml);
  console.log("Built: /search");

  await fs.writeFile(path.join(OUTPUT_DIR, ".nojekyll"), "");

  // Post-process: link Bible references in all HTML files
  const htmlFiles = await findHtmlFiles(OUTPUT_DIR);
  let linkedCount = 0;
  for (const htmlFile of htmlFiles) {
    const raw = await fs.readFile(htmlFile, "utf-8");
    const linked = linkBibleRefs(raw);
    if (linked !== raw) {
      await fs.writeFile(htmlFile, linked);
      linkedCount++;
    }
  }
  console.log(
    `Bible ref linker: processed ${htmlFiles.length} HTML file(s), rewrote ${linkedCount}.`,
  );

  // Post-process: wrap abbreviations in all HTML files
  const abbrMap = await loadAbbrMap();
  if (abbrMap && Object.keys(abbrMap).length > 0) {
    let abbrCount = 0;
    for (const htmlFile of htmlFiles) {
      const raw = await fs.readFile(htmlFile, "utf-8");
      const wrapped = wrapAbbreviations(raw, abbrMap);
      if (wrapped !== raw) {
        await fs.writeFile(htmlFile, wrapped);
        abbrCount++;
      }
    }
    console.log(
      `Abbreviation expander: processed ${htmlFiles.length} HTML file(s), rewrote ${abbrCount}.`,
    );
  }
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
