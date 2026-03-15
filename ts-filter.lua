-- Create an empty list to store our collected categories globally for the run
local categories = pandoc.List()

function Link(el)
  -- 1. Check if the link target starts with "c:" or "Category:"
  if el.target:match("^c:") or el.target:match("^Category:") then
    -- Extract the category name and replace underscores with spaces
    local catName = el.target:gsub("^c:", ""):gsub("^Category:", ""):gsub("_", " ")
    
    -- Use RawInline to prevent the CommonMark writer from escaping the brackets
    categories:insert(pandoc.RawInline('markdown', '[[' .. catName .. ']]'))
    
    -- Return an empty list to delete the category link from the document body
    return {} 
  end

  -- 2. Existing logic for regular links
  el.target = el.target:gsub("_", " ")
  return el
end

function RawInline(el)
  if el.format == "html" then
    -- 1. Replace opening and closing small tags with a tilde
    if el.text == "<small>" or el.text == "</small>" then
      return pandoc.Str("~")
    end

    -- 2. Remove opening <abbr> tags (including any attributes) and closing </abbr> tags
    if el.text:match("^<abbr") or el.text == "</abbr>" then
      return {} 
    end
  end
end

function RawBlock(el)
  if el.format == "html" then
    -- Remove references tags
    if el.text:match("^<hr class=\"references\"") or el.text:match("^<references") then
      return {}
    end
  end
end

function Image(el)
  -- Remove the "File:" or "Image:" prefix that MediaWiki uses
  local filename = el.src:gsub("^File:", ""):gsub("^Image:", "")
  
  -- Replace underscores with spaces for cleaner Obsidian links
  filename = filename:gsub("_", " ")
  
  -- Use RawInline to prevent Pandoc from backslash-escaping the brackets
  return pandoc.RawInline('markdown', '![[' .. filename .. ']]')
end

function Figure(el)
  -- A Figure block contains 'content' (the image) and 'caption'.
  -- By returning just the content, we drop the figure wrapper and caption entirely.
  return el.content
end

function Meta(meta)
  -- If we collected any categories, inject them into the document's metadata
  if #categories > 0 then
    meta.categories = categories
  end
  return meta
end