# Result Cards

## Unified design across sources
- Given a result from any source (Thingiverse, Printables, Cults3D, etc.)
- Then it renders with the same card layout
- And the only source indicator is a colored badge in the corner

## Card contents
- Given any result card
- Then it displays: thumbnail (4:3 ratio), title (max 2 lines), author name, source badge, download count, like count, license badge
- And free models show no price, paid models show price

## Download redirects to original page
- Given a user clicks "View on [Source]" on any card
- Then a new tab opens with the original model page on the source site
- And the user can download from the original source directly

## Favorite a model
- Given a user clicks the heart/bookmark icon on a card
- Then the model is saved to their favorites (localStorage)
- And the heart icon fills/highlights to indicate saved state
