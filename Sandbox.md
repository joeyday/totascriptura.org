---
hidden: true
quick nav: true
---
%% A test page for the whole site: every style and feature on one page. It is hidden, so view it with `tsgen serve --show-hidden` at /sandbox. Keep it building clean, and add a section whenever the site gains a feature. %%

![[Town.png|300x137]]

This opening paragraph follows a sized hero image. It has *emphasis*, **strong text**, ***both***, ==a highlight==, ~~a strikethrough~~, ~small text~, `inline code`, a [link to another topic](/topic/trinity), and a footnote reference.[^1] Quotation marks are “curly,” apostrophes are God’s, and an ellipsis written . . . gets non-breaking spaces. Dashes: en 3–5, em—like this.

## Headings

### A third-level heading

Body text under an h3. The next heading is an h2 with the same kind of text beneath it.

## Topic-page definition lists

A topic page sets each section title as a term with muted, indented definitions beneath it.

Plain term with one definition
: Jn 3:16

Term with several definitions
: Ge 1:1; Ps 33:6
: Heb 11:3

Term with a parenthetical aside (like this one)
: A definition with an aside (the outermost parentheses become small text) and an em dash — everything after the dash is small and italic.

Main-topic line
: {{[[mt]]|[[topic/Trinity|Trinity]]|[[topic/Atonement|Atonement]]}}

A *term in italics* and **bold**
: The term is styled like an h3.

1\. Term that starts like a list item
: Escaped with a backslash so it doesn't turn into an ordered list.

## Scripture references

Every reference below should link to ref.ly.

Chapter, verse, ranges
: Jn 3; Jn 3–4; Jn 3:16; Jn 3:16–18; Jn 3:16-18; Jn 3:16 – 4:2; Jn 3:16–4:2

Continuations
: Ro 3:23; 5:8; 6:23. Ro 3, 5–7. Ro 3:16, 18. Ro 12:1–15:13, 20

Numbered books and full names
: 1Jn 2:2; 2Ki 5; 1Co 13; 2Ti 3:16; 1 John 4:8; 2 Kings 5:14; Song of Solomon 2:1; Psalm 23:1

One-chapter books
: Phm 1:3; Phm 1:3–5; Phm 1; Jude 1:3, 5; Ob 1:15; 2Jn 1:6; 3Jn 1:4

Translation tags
: Ac 7:48 KJV; Ac 19:37 NIV; Jn 3:16; 5:24 NASB; Mt 5:3 ESV

Opted out (left as plain text)
: !Jn 3:16–18; !Romans 17

A tag set apart in parentheses, as in Jn 3:16 (KJV), doesn't apply to the reference, so it links as ESV. Words like “John chapter three” aren't references and stay plain.

## Abbreviations, initials and numerals

Abbreviations
: The OT and NT; the ESV, NIV and KJV; AD and BC; CSS.

Initials
: D.A. Carson and R.C. Sproul, or Carson, D.A. and Sproul, R.C.

Roman numerals
: Psalm numbering in Part II, Book XII, and the year MMXXVI.

Divine names
: The LORD said to Moses, “I AM WHO I AM.” GOD is YHWH; I AM; I WILL BE what I WILL BE.

## Links

Link classes
: [Featured topic](topic/Trinity); [draft page](commentary/Titus); [category](category/Theology%20(proper)); [notes page](topic/notes/Trinity); [external](https://example.com); <https://example.com/bare-url>; [broken](/no-such-page)

Wikilinks
: [[topic/Trinity]]; [[topic/Trinity|aliased text]]; [[Colophon]]; [[topic/Atonement#^5602cb|Atonement, by block id]]; [[topic/Definite atonement#Designed to secure salvation, not merely make it possible|Definite atonement, by heading]]; [[topic/Temples]] (hidden, so a placeholder)

## Text blocks

> A blockquote with *emphasis* and a reference (Ro 8:28). It can run
> over several lines.
>
> A second paragraph in the same quote.

A bulleted list:

* First item
* Second item
  * A nested item
* Third item

A numbered list:

1. One
2. Two
3. Three

A callout:

::: callout
Centered text in a callout box.
:::

A div with attributes:

:::{.pull #custom-id data-note=example}
A fenced div with a class, an id and a data attribute.
:::

A [bracketed span]{.custom} inside a sentence, and a paragraph with attributes.
{.note}

---

A horizontal rule sits above this line.

```js
// A fenced code block
const verse = 'Jn 3:16' // code is never linked
```

## Tables

| Left | Centre | Right |
|:-----|:------:|------:|
| One  | Ro 1:1 |     1 |
| Two  | Ro 1:2 |    22 |
| Three | Ro 1:3 |  333 |

The Bible-books table, as on the Colophon:

::: bible-books

| Book title | Abbr |
| ---------- | ---- |
| Genesis    | Ge   |
| Exodus     | Ex   |

| Book title | Abbr |
| ---------- | ---- |
| Matthew    | Mt   |
| Mark       | Mk   |
:::

## Images

![[Pillars.png]]

![[Monastery.png|200]]

![[Pillars.png|Custom alt text|150x100]]

## Hidden pieces

The comment at the very top of this file is stripped, as is %%this one%%.

## Footnotes

A second footnote.[^2]

[^1]: The first footnote, with a reference (Ro 8:28) and a [link](/topic/trinity).
[^2]: The second footnote.
