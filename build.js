import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      attrs.other[key] = val;
    }
  }
  return attrs;
}

function protectFencedAttrs(text) {
  return text.replace(/^(:::)\s*\{([^}]+)\}/gm, (m, colons, content) => colons + "\x01" + content + "\x01");
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
        if (parsed.classes.length) tag += ` class="${parsed.classes.join(" ")}"`;
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
const PARTIALS_DIR = "template";
const SKIP_FILES = new Set(["replit.md"]);
const MD_SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".github", ".local", "template"]);
const ASSET_SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".github", ".local"]);
const IMAGE_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif", ".ico", ".bmp",
]);
const ASSET_EXTENSIONS = new Set([
  ...IMAGE_EXTENSIONS, ".css", ".eot", ".otf", ".ttf", ".woff", ".woff2",
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
      const subResults = await findFiles(fullPath, { skipDirs, filter, rootDir });
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
      if (!entry.name.endsWith(".md") || SKIP_FILES.has(entry.name.toLowerCase())) return null;
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

function resolveWikilinksInText(text, fileMap, imageMap) {
  return text.replace(/\[\[(.*?)\]\]/g, (match, inner) => {
    let target = inner;
    let linkText = inner;
    if (inner.includes("|")) {
      const parts = inner.split("|");
      target = parts[0];
      linkText = parts.slice(1).join("|");
    }
    const searchTarget = target.trim();
    const ext = path.extname(searchTarget).toLowerCase();
    if (IMAGE_EXTENSIONS.has(ext)) {
      const imgUrl = imageMap[searchTarget.toLowerCase()] || searchTarget;
      return `[${linkText === inner ? searchTarget : linkText}](${imgUrl})`;
    }
    let key = searchTarget.toLowerCase();
    if (key.endsWith(".md")) key = key.substring(0, key.length - 3);
    const linkUrl = fileMap[key] || `/${slugify(target, { lower: true, strict: true })}`;
    return `[${linkText}](${linkUrl})`;
  });
}

function expandShorthand(text, fileMap, imageMap) {
  text = text.replace(/\{\{(\d+)\}\}/g, (match, num) => {
    return `<%= locals["${num}"] %>`;
  });

  text = text.replace(
    /\{\{([^}|]+?)(?:\|([^}]*))?\}\}/g,
    (match, name, argsStr) => {
      name = name.trim().replace(/^\[\[/, "").replace(/\]\]$/, "").trim();
      const escapedName = name.replace(/'/g, "\\'");
      if (!argsStr) {
        return `<%- include('embed', { "file": "${escapedName}" }) %>`;
      }
      const args = argsStr.split("|");
      const argsObj = args
        .map((arg, i) => {
          let val = arg.trim();
          val = resolveWikilinksInText(val, fileMap, imageMap);
          return `"${i + 1}": "${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
        })
        .join(", ");
      return `<%- include('embed', { "file": "${escapedName}", ${argsObj} }) %>`;
    },
  );

  return text;
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
      console.warn(`Warning: Asset filename collision — "${assetName}" from "${assetPath}" overwrites "${seenAssetNames.get(lowerName)}"`);
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
      console.warn(`Warning: Failed to parse frontmatter in "${filePath}" — skipping (${err.message})`);
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

    const title = getFrontmatterValue(parsed.data, "title") || baseName;
    titleMap[key] = title;
    contentMap[key] = parsed.content;

    const hidden = !!getFrontmatterValue(parsed.data, "hidden");
    const aliasOf = getFrontmatterValue(parsed.data, "alias of");
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
      aliasOf: aliasOf ? stripBrackets(String(aliasOf)) : null,
      asideOf: asideOf ? stripBrackets(String(asideOf)) : null,
      categories,
      featured,
      draft,
    });
  }

  const redirectMap = {};
  for (const fileInfo of filesToProcess) {
    if (!fileInfo.aliasOf) continue;
    const resolvedKey = resolveFileMapKey(fileInfo.aliasOf, fileMap);
    const canonicalUrl = fileMap[resolvedKey];
    if (canonicalUrl) {
      const key = fileInfo.baseName.toLowerCase().trim();
      redirectMap[key] = canonicalUrl;
      fileMap[key] = canonicalUrl;
    }
  }

  const featuredPages = [];
  const draftPages = [];

  for (const fileInfo of filesToProcess) {
    if (fileInfo.aliasOf) continue;
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

  const allKnownUrls = new Set([
    ...Object.values(fileMap),
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

    if (fileInfo.aliasOf) {
      const resolvedKey = resolveFileMapKey(fileInfo.aliasOf, fileMap);
      const canonicalTitle = titleMap[resolvedKey] || fileInfo.aliasOf;
      const canonicalUrl =
        fileMap[resolvedKey] ||
        `/${slugify(fileInfo.aliasOf, { lower: true, strict: true })}`;
      allPages.push({ title: fileInfo.title, url: canonicalUrl, redirect: canonicalTitle });
    } else {
      allPages.push({ title: fileInfo.title, url: fileInfo.finalUrlPath });
    }
  }
  allPages.sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );

  const searchDocs = [];
  const viewsPathResolved = [path.resolve(PARTIALS_DIR)];

  for (const fileInfo of filesToProcess) {
    if (fileInfo.hidden) continue;

    if (fileInfo.aliasOf) {
      const resolvedKey = resolveFileMapKey(fileInfo.aliasOf, fileMap);
      const targetUrl =
        fileMap[resolvedKey] ||
        `/${slugify(fileInfo.aliasOf, { lower: true, strict: true })}`;
      const targetTitle = titleMap[resolvedKey] || fileInfo.aliasOf;

      const redirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=${targetUrl}">
  <link rel="canonical" href="${targetUrl}">
  <title>Redirecting to ${targetTitle}</title>
</head>
<body>
  <p>Redirecting to <a href="${targetUrl}">${targetTitle}</a>...</p>
</body>
</html>`;

      const { outDirPath, outFilePath } = getOutputPaths(fileInfo.finalUrlPath);
      await ensureDir(outDirPath);
      await fs.writeFile(outFilePath, redirectHtml);
      console.log(
        `Built (redirect): ${fileInfo.filePath} -> ${outFilePath} (-> ${targetUrl})`,
      );
      continue;
    }

    let markdownContent = fileInfo.parsed.content;

    const embedPlaceholders = [];
    markdownContent = markdownContent.replace(/\{\{([\s\S]*?)\}\}/g, (match) => {
      const idx = embedPlaceholders.length;
      embedPlaceholders.push(match);
      return `\x00EMBED_${idx}\x00`;
    });

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

    markdownContent = markdownContent.replace(/\x00EMBED_(\d+)\x00/g, (match, idx) => {
      return embedPlaceholders[Number(idx)];
    });

    markdownContent = expandShorthand(markdownContent, fileMap, imageMap);

    try {
      markdownContent = ejs.render(
        markdownContent,
        {
          frontmatter: fileInfo.parsed.data,
          contentMap,
          ejs,
          fileMap,
          imageMap,
          resolveWikilinksInText,
          expandShorthand,
          viewsPath: viewsPathResolved,
        },
        {
          views: viewsPathResolved,
        },
      );
    } catch (err) {
      console.warn(`Warning: EJS render error in "${fileInfo.filePath}" — ${err.message}`);
      markdownContent = `<!-- EJS render error in: ${fileInfo.fileName} -->`;
    }

    markdownContent = markdownContent.replace(/%%[\s\S]*?%%/g, "");

    markdownContent = markdownContent.replace(/(?<!~)~(?!~)([^~\n]+?)(?<!~)~(?!~)/g, "<small>$1</small>");

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
      if (memberKey && membersMap[memberKey] && membersMap[memberKey].length > 0) {
        subcategories.push(member);
      } else {
        pages.push(member);
      }
    }

    const finalHtml = renderLayout(htmlContent, {
      frontmatter: fileInfo.parsed.data,
      asideOf: asideOfResolved,
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

    const bodyText = htmlContent.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    searchDocs.push({
      id: fileInfo.finalUrlPath,
      title: fileInfo.title,
      url: fileInfo.finalUrlPath,
      body: bodyText.slice(0, 5000),
    });
  }

  const pagesWithCategories = new Set();
  for (const fileInfo of filesToProcess) {
    if (fileInfo.categories.length > 0) {
      pagesWithCategories.add(fileInfo.baseName.toLowerCase().trim());
    }
  }

  const topLevelCategoryPages = Object.keys(membersMap)
    .filter((key) => fileMap[key] && !pagesWithCategories.has(key))
    .map((key) => ({ title: titleMap[key] || key, url: fileMap[key] }))
    .sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
    );

  const indexPages = [
    { slug: "alphabetical", title: "Alphabetical Index", items: allPages },
    { slug: "categorical", title: "Categorical Index", items: topLevelCategoryPages },
    { slug: "featured", title: "Featured Topics", items: featuredPages },
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
          listHtml += `  <li>${item.title} (see <a href="${item.url}">${item.redirect}</a>)</li>\n`;
        } else {
          listHtml += `  <li><a href="${item.url}">${item.title}</a></li>\n`;
        }
      }
      listHtml += "</ul>";
    }

    const html = renderLayout(listHtml, {
      frontmatter: { title: indexPage.title },
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
    frontmatter: { title: "Search" },
  });

  const searchOutDir = path.join(OUTPUT_DIR, "search");
  await ensureDir(searchOutDir);
  await fs.writeFile(path.join(searchOutDir, "index.html"), searchHtml);
  console.log("Built: /search");

  await fs.writeFile(path.join(OUTPUT_DIR, ".nojekyll"), "");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
