Modifications to the original template

- created variables.scss from variables in _base.scss so it could be included in
  custom.scss sheet.
- moved mixins from _base.scss to _variables.scss
- text-shadow to slide
- added .button to default.scss along with button
- added .bold to default.scss along with default b
- added animate.css
- added @include column-break-after mixin to variables.scss

Deck specific changes that should not be upstreamed.
- removed document.body.classList.add('loaded'); in slide-deck.js. Moved to app.js


Tech used:
- Compass/ SaSS
- Mutation Observers (flexbox columns)
- rAF
- flexbox (slide layouts)
- transitions/transforms/animations
- requirejs
- window.postMessage() for speaker mode
- CORs to bring in webkit bugs
- transforms, user-select: none, pointer-events: none; for readonly live preview iframes
