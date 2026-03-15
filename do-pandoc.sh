#!/bin/bash

# Loop through all MediaWiki files in the current directory
for f in *.wiki; do
  pandoc "$f" -f mediawiki-smart -t markdown+wikilinks_title_after_pipe+footnotes+fenced_divs+bracketed_spans+yaml_metadata_block+mark-header_attributes-smart -s --lua-filter=ts-filter.lua --wrap=none -o "${f%.wiki}.md"
done