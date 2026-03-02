import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import markdownIt from "markdown-it";
import markdownItFootnote from "markdown-it-footnote";
import markdownItMark from "markdown-it-mark";
import markdownItContainer from "markdown-it-container";
import ejs from "ejs";
import slugify from "slugify";

const md = markdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
})
  .enable("strikethrough")
  .use(markdownItFootnote)
  .use(markdownItMark)
  .use(markdownItContainer, "", {
    validate: () => true,
    render(tokens, idx) {
      const info = tokens[idx].info.trim();
      if (tokens[idx].nesting === 1) {
        return info ? `<div class="${info}">\n` : "<div>\n";
      }
      return "</div>\n";
    },
  });

const OUTPUT_DIR = "dist";
const TEMPLATE_PATH = path.join("template", "layout.ejs");
const PARTIALS_DIR = path.join("template", "partials");
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  ".github",
  ".local",
  "template",
]);
const SKIP_FILES = new Set(["replit.md"]);
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

async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function findMarkdownFiles(dir, rootDir = dir) {
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
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      const subResults = await findMarkdownFiles(fullPath, rootDir);
      results.push(...subResults);
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".md") &&
      !SKIP_FILES.has(entry.name.toLowerCase())
    ) {
      const relDir = path.relative(rootDir, dir);
      results.push({ filePath: fullPath, relDir, fileName: entry.name });
    }
  }

  return results;
}

async function findImageFiles(dir, rootDir = dir) {
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
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      const subResults = await findImageFiles(fullPath, rootDir);
      results.push(...subResults);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.has(ext)) {
        results.push({ filePath: fullPath, fileName: entry.name });
      }
    }
  }

  return results;
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

  // Discover and copy image files, build image map
  const imageMap = {};
  const imageFiles = await findImageFiles(".");
  const assetsOutDir = path.join(OUTPUT_DIR, "asset");
  if (imageFiles.length > 0) {
    await ensureDir(assetsOutDir);
  }
  for (const { filePath: imgPath, fileName: imgName } of imageFiles) {
    const outPath = path.join(assetsOutDir, imgName);
    await fs.copyFile(imgPath, outPath);
    imageMap[imgName.toLowerCase()] = `/asset/${imgName}`;
  }
  if (imageFiles.length > 0) {
    console.log(`Copied ${imageFiles.length} image(s) to dist/asset/`);
  }

  const mdFiles = await findMarkdownFiles(".");

  for (const { filePath, relDir, fileName } of mdFiles) {
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = matter(content);

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
    titleMap[key] = getFrontmatterValue(parsed.data, "title") || baseName;
    contentMap[key] = parsed.content;

    filesToProcess.push({
      relDir,
      fileName,
      filePath,
      baseName,
      permalink,
      finalUrlPath,
      parsed,
    });
  }

  // Build redirect map: alias key -> canonical URL
  const redirectMap = {};
  for (const fileInfo of filesToProcess) {
    let aliasOf = getFrontmatterValue(fileInfo.parsed.data, "alias of");
    if (!aliasOf) continue;
    aliasOf = stripBrackets(String(aliasOf));
    const resolvedKey = resolveFileMapKey(aliasOf, fileMap);
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
    const aliasOf = getFrontmatterValue(fileInfo.parsed.data, "alias of");
    if (aliasOf) continue;

    const title =
      getFrontmatterValue(fileInfo.parsed.data, "title") || fileInfo.baseName;

    const featured = getFrontmatterValue(fileInfo.parsed.data, "featured");
    if (featured) {
      featuredPages.push({ title, url: fileInfo.finalUrlPath });
    }

    const draft = getFrontmatterValue(fileInfo.parsed.data, "draft");
    if (draft) {
      draftPages.push({ title, url: fileInfo.finalUrlPath });
    }
  }

  featuredPages.sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );
  draftPages.sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );

  // Build asides map
  const asidesMap = {};
  for (const fileInfo of filesToProcess) {
    let asideOfValue = getFrontmatterValue(fileInfo.parsed.data, "aside of");
    if (!asideOfValue) continue;

    asideOfValue = stripBrackets(String(asideOfValue));
    const resolvedKey = resolveFileMapKey(asideOfValue, fileMap);

    if (!asidesMap[resolvedKey]) {
      asidesMap[resolvedKey] = [];
    }
    asidesMap[resolvedKey].push({
      title:
        getFrontmatterValue(fileInfo.parsed.data, "title") || fileInfo.baseName,
      url: fileInfo.finalUrlPath,
    });
  }

  // Build members map (reverse of categories)
  const membersMap = {};
  for (const fileInfo of filesToProcess) {
    const rawCategories = getFrontmatterValue(
      fileInfo.parsed.data,
      "categories",
    );
    const categoryNames = parseCategoriesList(rawCategories);

    for (const catName of categoryNames) {
      const resolvedKey = resolveFileMapKey(catName, fileMap);
      if (!membersMap[resolvedKey]) {
        membersMap[resolvedKey] = [];
      }
      membersMap[resolvedKey].push({
        title:
          getFrontmatterValue(fileInfo.parsed.data, "title") ||
          fileInfo.baseName,
        url: fileInfo.finalUrlPath,
      });
    }
  }

  // Build URL classification sets for link styling
  const allKnownUrls = new Set([
    ...Object.values(fileMap),
    ...Object.values(imageMap),
  ]);
  const draftUrls = new Set(draftPages.map((p) => p.url));
  const featuredUrls = new Set(featuredPages.map((p) => p.url));
  const categoryUrls = new Set();
  for (const key of Object.keys(membersMap)) {
    if (fileMap[key]) categoryUrls.add(fileMap[key]);
  }
  const asideUrls = new Set();
  for (const fileInfo of filesToProcess) {
    if (getFrontmatterValue(fileInfo.parsed.data, "aside of")) {
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

  // Build alphabetical index (exclude asides, categories, partials, and root-level pages; include redirects)
  const allPages = [];
  for (const fileInfo of filesToProcess) {
    const asideOf = getFrontmatterValue(fileInfo.parsed.data, "aside of");
    if (asideOf) continue;
    if (fileInfo.relDir === "") continue;
    if (getFrontmatterValue(fileInfo.parsed.data, "hidden")) continue;
    const pageKey = fileInfo.baseName.toLowerCase().trim();
    if (membersMap[pageKey]) continue;

    const title =
      getFrontmatterValue(fileInfo.parsed.data, "title") || fileInfo.baseName;
    const aliasOf = getFrontmatterValue(fileInfo.parsed.data, "alias of");
    if (aliasOf) {
      const aliasTarget = stripBrackets(String(aliasOf));
      const resolvedKey = resolveFileMapKey(aliasTarget, fileMap);
      const canonicalTitle = titleMap[resolvedKey] || aliasTarget;
      const canonicalUrl =
        fileMap[resolvedKey] ||
        `/${slugify(aliasTarget, { lower: true, strict: true })}`;
      allPages.push({ title, url: canonicalUrl, redirect: canonicalTitle });
    } else {
      allPages.push({ title, url: fileInfo.finalUrlPath });
    }
  }
  allPages.sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );

  // Pass 2: Render pages
  for (const fileInfo of filesToProcess) {
    if (getFrontmatterValue(fileInfo.parsed.data, "hidden")) continue;

    // Check for alias of (redirect)
    let aliasOfValue = getFrontmatterValue(fileInfo.parsed.data, "alias of");
    if (aliasOfValue) {
      aliasOfValue = stripBrackets(String(aliasOfValue));
      const resolvedKey = resolveFileMapKey(aliasOfValue, fileMap);
      const targetUrl =
        fileMap[resolvedKey] ||
        `/${slugify(aliasOfValue, { lower: true, strict: true })}`;
      const targetTitle = titleMap[resolvedKey] || aliasOfValue;

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

      let outDirPath;
      let outFilePath;
      if (fileInfo.finalUrlPath === "/") {
        outDirPath = OUTPUT_DIR;
        outFilePath = path.join(outDirPath, "index.html");
      } else {
        outDirPath = path.join(OUTPUT_DIR, fileInfo.finalUrlPath.substring(1));
        outFilePath = path.join(outDirPath, "index.html");
      }

      await ensureDir(outDirPath);
      await fs.writeFile(outFilePath, redirectHtml);
      console.log(
        `Built (redirect): ${fileInfo.filePath} -> ${outFilePath} (-> ${targetUrl})`,
      );
      continue;
    }

    if (!getFrontmatterValue(fileInfo.parsed.data, "title")) {
      fileInfo.parsed.data.title = fileInfo.baseName;
    }

    let markdownContent = fileInfo.parsed.content;

    // Step 0: Protect {{...}} embed blocks from wikilink transformation
    const embedPlaceholders = [];
    markdownContent = markdownContent.replace(/\{\{([\s\S]*?)\}\}/g, (match) => {
      const idx = embedPlaceholders.length;
      embedPlaceholders.push(match);
      return `\x00EMBED_${idx}\x00`;
    });

    // Step 1: Transform wikilinks (including ![[image]] embeds)
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

        // Check if target is an image file
        const ext = path.extname(searchTarget).toLowerCase();
        if (IMAGE_EXTENSIONS.has(ext)) {
          const imgUrl = imageMap[searchTarget.toLowerCase()] || searchTarget;
          if (isEmbed) {
            // Parse optional dimensions: ![[img.png|300]] or ![[img.png|300x150]]
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

    // Step 1.5: Restore {{...}} embed blocks
    markdownContent = markdownContent.replace(/\x00EMBED_(\d+)\x00/g, (match, idx) => {
      return embedPlaceholders[Number(idx)];
    });

    // Step 2: Expand shorthand syntax into EJS
    markdownContent = expandShorthand(markdownContent, fileMap, imageMap);

    // Step 3: Render EJS (handles includes recursively)
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
      },
      {
        views: [path.resolve(PARTIALS_DIR)],
      },
    );

    // Step 4: Strip Obsidian comments (%%...%%) — after EJS so partial comments are caught
    markdownContent = markdownContent.replace(/%%[\s\S]*?%%/g, "");

    // Step 5: Custom inline syntax (~small~)
    markdownContent = markdownContent.replace(/(?<!~)~(?!~)([^~\n]+?)(?<!~)~(?!~)/g, "<small>$1</small>");

    // Step 6: Convert Markdown to HTML
    const htmlContent = md.render(markdownContent);

    // Resolve aside-of
    let asideOf = null;
    let asideOfValue = getFrontmatterValue(fileInfo.parsed.data, "aside of");
    if (asideOfValue) {
      asideOfValue = stripBrackets(String(asideOfValue));
      const resolvedKey = resolveFileMapKey(asideOfValue, fileMap);
      if (fileMap[resolvedKey]) {
        asideOf = {
          title: titleMap[resolvedKey],
          url: fileMap[resolvedKey],
        };
      }
    }

    // Resolve asides
    const pageKey = fileInfo.baseName.toLowerCase().trim();
    const asides = asidesMap[pageKey] || [];

    // Resolve categories for this page
    const rawCategories = getFrontmatterValue(
      fileInfo.parsed.data,
      "categories",
    );
    const categoryNames = parseCategoriesList(rawCategories);
    const categories = categoryNames.map((catName) => {
      const resolvedKey = resolveFileMapKey(catName, fileMap);
      return {
        title: titleMap[resolvedKey] || catName,
        url:
          fileMap[resolvedKey] ||
          `/${slugify(catName, { lower: true, strict: true })}`,
      };
    });

    // Resolve members (pages that list this page as a category)
    const allMembers = membersMap[pageKey] || [];
    const subcategories = [];
    const pages = [];
    for (const member of allMembers) {
      const memberKey = Object.keys(fileMap).find(
        (k) => fileMap[k] === member.url,
      );
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

    const finalHtml = classifyLinks(
      ejs.render(layoutTemplate, {
        frontmatter: fileInfo.parsed.data,
        content: htmlContent,
        asideOf,
        asides,
        categories,
        subcategories,
        pages,
      }),
    );

    let outDirPath;
    let outFilePath;

    if (fileInfo.finalUrlPath === "/") {
      outDirPath = OUTPUT_DIR;
      outFilePath = path.join(outDirPath, "index.html");
    } else {
      outDirPath = path.join(OUTPUT_DIR, fileInfo.finalUrlPath.substring(1));
      outFilePath = path.join(outDirPath, "index.html");
    }

    await ensureDir(outDirPath);
    await fs.writeFile(outFilePath, finalHtml);
    console.log(
      `Built: ${fileInfo.filePath} -> ${outFilePath} (URL: ${fileInfo.finalUrlPath})`,
    );
  }

  // Collect which pages belong to a category
  const pagesWithCategories = new Set();
  for (const fileInfo of filesToProcess) {
    const rawCategories = getFrontmatterValue(
      fileInfo.parsed.data,
      "categories",
    );
    const categoryNames = parseCategoriesList(rawCategories);
    if (categoryNames.length > 0) {
      const key = fileInfo.baseName.toLowerCase().trim();
      pagesWithCategories.add(key);
    }
  }

  // Top-level categories: have members but don't themselves belong to any category
  const topLevelCategoryPages = Object.keys(membersMap)
    .filter((key) => fileMap[key] && !pagesWithCategories.has(key))
    .map((key) => ({ title: titleMap[key] || key, url: fileMap[key] }))
    .sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
    );

  // Generate index pages
  const indexPages = [
    {
      slug: "alphabetical",
      title: "Alphabetical Index",
      items: allPages,
    },
    {
      slug: "categorical",
      title: "Categorical Index",
      items: topLevelCategoryPages,
    },
    {
      slug: "featured",
      title: "Featured Topics",
      items: featuredPages,
    },
    {
      slug: "drafts",
      title: "Drafts",
      items: draftPages,
    },
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

    const html = classifyLinks(
      ejs.render(layoutTemplate, {
        frontmatter: { title: indexPage.title },
        content: listHtml,
        asideOf: null,
        asides: [],
        categories: [],
        subcategories: [],
        pages: [],
      }),
    );

    const outDir = path.join(OUTPUT_DIR, "index", indexPage.slug);
    await ensureDir(outDir);
    await fs.writeFile(path.join(outDir, "index.html"), html);
    console.log(`Built (index): /index/${indexPage.slug}`);
  }

  await fs.writeFile(path.join(OUTPUT_DIR, ".nojekyll"), "");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
