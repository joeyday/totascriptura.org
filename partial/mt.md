---
hidden: "true"
---
<% const numberedValues = Object.keys(locals)
    .filter(key => /^\d+$/.test(key))   // keep only numeric keys
    .sort((a, b) => Number(a) - Number(b)) // ensure proper order
    .map(key => locals[key])

if (numberedValues.length) { %><span class="main-topic”><em>Main topic<%= numberedValues.length > 1 ? 's' : '' %>: <%= numberedValues.join(', ') %></em></span><% } %>