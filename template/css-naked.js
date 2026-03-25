/**
 * CSS Naked
 * Strips all styles from the document in two cases:
 *   1. The `?css-naked` query param is present (manual toggle).
 *   2. It's CSS Naked Day — April 9 anywhere in the world, i.e.
 *      from 00:00 Apr 9 UTC+14:00 to 00:00 Apr 10 UTC-12:00
 *      (10:00 Apr 8 UTC to 12:00 Apr 10 UTC).
 *
 * The user can always toggle back via a banner link. Their preference
 * is stored in localStorage scoped to the current year, so it resets
 * each CSS Naked Day.
 */

/**
 * Returns true if the current moment falls within CSS Naked Day,
 * which spans all time zones where it's April 9 somewhere in the world.
 */
function isCSSNakedDay() {
  const now = new Date()
  const year = now.getUTCFullYear()

  // 00:00 Apr 9 in UTC+14:00 → Apr 8 10:00 UTC
  const start = Date.UTC(year, 2, 24, 10, 0, 0)
  // 00:00 Apr 10 in UTC-12:00 → Apr 10 12:00 UTC
  const end = Date.UTC(year, 2, 26, 12, 0, 0)

  return now >= start && now < end
}

const nakedDay = isCSSNakedDay()
const params = new URLSearchParams(window.location.search)
const storageKey = `css-naked-${new Date().getFullYear()}`
const override = window.localStorage.getItem(storageKey)

// Determine whether to go naked:
//   - ?css-naked param forces it on and persists the preference.
//   - On CSS Naked Day, default to naked unless the user explicitly opted out.
//   - On a normal day, only go naked if the user previously opted in.
let cssNaked = false

if (params.has('css-naked')) {
  cssNaked = true
  window.localStorage.setItem(storageKey, 'true')
} else if (override !== null) {
  cssNaked = override === 'true'
} else if (nakedDay) {
  cssNaked = true
}

if (cssNaked) {
  // Remove all styles from external stylesheets or embedded <style> tags
  Array.from(document.querySelectorAll('style,link[rel="stylesheet"]')).forEach(
    ($node) => {
      $node.remove()
    }
  )

  // Remove all styles from inline attributes
  Array.from(document.querySelectorAll('[style]')).forEach(($node) => {
    $node.setAttribute('style', '')
  })

  // Embed a banner at the top indicating you are in "css-naked" mode
  const $alert = document.createElement('div')
  $alert.innerHTML = [
    nakedDay
      ? `Happy <a href="https://css-naked-day.org"><abbr title="Cascading Style Sheets">CSS</abbr> Naked Day</a>!`
      : `You’re viewing this site with all <abbr title="Cascading Style Sheets">CSS</abbr> removed.`,
    nakedDay
      ? `You are viewing this site with all <abbr title="Cascading Style Sheets">CSS</abbr> removed.`
      : `Any day can be <a href="https://css-naked-day.org"><abbr title="Cascading Style Sheets">CSS</abbr> Naked Day</a>!`,
    `Want to flip back to the normal view?`,
    `<a href="./" id="naked-css-toggle">Click here</a>.`,
  ].join(' ')
  $alert.style.cssText = `
    background: lightyellow;
    padding: 5px;
    margin: 15px 0;
  `
  $alert.querySelector('#naked-css-toggle').addEventListener('click', (e) => {
    e.preventDefault()
    window.localStorage.setItem(storageKey, 'false')
    window.location.href = window.location.href.split('?')[0]
  })
  document.body.prepend($alert)
} else if (nakedDay) {
  // It's CSS Naked Day but the user opted to keep styles on —
  // show a banner so they can easily toggle back to naked mode.
  const $alert = document.createElement('div')
  $alert.innerHTML = [
    `It’s <a href="https://css-naked-day.org" class="external"><abbr title="Cascading Style Sheets">CSS</abbr> Naked Day</a>!`,
    `Want to view the site without any <abbr title="Cascading Style Sheets">CSS</abbr>?`,
    `<a href="./" id="naked-css-toggle" class="internal">Click here</a>.`,
  ].join(' ')
  $alert.className = `css-naked-alert`

  $alert.querySelector('#naked-css-toggle').addEventListener('click', (e) => {
    e.preventDefault()
    window.localStorage.setItem(storageKey, 'true')
    window.location.reload()
  })
  document.querySelector('main').prepend($alert)
}