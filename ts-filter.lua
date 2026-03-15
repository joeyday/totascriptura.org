-- Create an empty list to store our collected categories globally for the run
local categories = pandoc.List()

function Link(el)
  -- 1. Handle category links (c: prefix)
  local catName = el.target:match("^c:(.+)")
  if catName then
    catName = catName:gsub("_", " ")
    if catName ~= "" then
      categories:insert(pandoc.RawInline('markdown', '[[' .. catName .. ']]'))
    end
    return {}
  end

  -- 2. Rewrite underscores in internal link targets only
  if not (el.target:match("^https?://") or el.target:match("^mailto:")) then
    if not el.target:match("[?#]") then
      el.target = el.target:gsub("_", " ")
    end
  end

  return el
end

function RawInline(el)
  if el.format == "html" then
    -- 1. Replace opening and closing small tags with a tilde
    if el.text == "<small>" or el.text == "</small>" then
	  return pandoc.RawInline('markdown', '~')
    end

    -- 2. Remove opening <abbr> tags and closing </abbr> tags
    if el.text:match("^<abbr") or el.text == "</abbr>" then
      return {}
    end
    
    -- 3. Remove references tags
    if el.text:match("^<hr class=\"references\"") or el.text:match("^<references") then
      return {}
    end
    
  elseif el.format == "mediawiki" then
    -- Convert MediaWiki includes {{name|params}} to {{[[name]]|params}}
    if el.text:sub(1, 2) == "{{" and el.text:sub(-2) == "}}" then
      local inner = el.text:sub(3, -3)
      local pipe_pos = inner:find("|")
      local new_text = ""
      
      if pipe_pos then
        -- If there are parameters, separate the name from the parameters
        local name = inner:sub(1, pipe_pos - 1)
        local params = inner:sub(pipe_pos) -- keeps the leading '|'
        new_text = '{{[[' .. name .. ']]' .. params .. '}}'
      else
        -- If there are no parameters, just wrap the whole inner text
        new_text = '{{[[' .. inner .. ']]}}'
      end
      
      return pandoc.RawInline('markdown', new_text)
    end
  end
end

function RawBlock(el)
  if el.format == "html" then
    -- Remove references tags
    if el.text:match("^<hr class=\"references\"") or el.text:match("^<references") then
      return {}
    end
    
  elseif el.format == "mediawiki" then
    -- Convert MediaWiki includes {{name|params}} to {{[[name]]|params}}
    if el.text:sub(1, 2) == "{{" and el.text:sub(-2) == "}}" then
      local inner = el.text:sub(3, -3)
      local pipe_pos = inner:find("|")
      local new_text = ""
      
      if pipe_pos then
        local name = inner:sub(1, pipe_pos - 1)
        local params = inner:sub(pipe_pos) 
        new_text = '{{[[' .. name .. ']]' .. params .. '}}'
      else
        new_text = '{{[[' .. inner .. ']]}}'
      end
      
      return pandoc.RawBlock('markdown', new_text)
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