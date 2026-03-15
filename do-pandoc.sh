#!/bin/bash

# Loop through all MediaWiki files in the current directory
for f in *.wiki; do
  pandoc "$f" -f mediawiki-smart -t markdown+wikilinks_title_after_pipe+mark-header_attributes-smart -s --lua-filter=ts-filter.lua --wrap=none -o "${f%.wiki}.md"
done