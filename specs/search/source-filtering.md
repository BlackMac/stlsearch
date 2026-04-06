# Source Filtering

## Toggle source off
- Given a user viewing search results
- When they toggle a source off in the filter bar
- Then results from that source disappear immediately
- And the source pill appears dimmed/inactive

## Free models by default
- Given a user with default settings (paid models OFF)
- When they search for any term
- Then only free models appear in results
- And no price badges are shown

## Enable paid models
- Given a user enables the "Include Paid" toggle
- When they search
- Then paid results also appear alongside free results
- And paid models show a price badge with the amount

## Sort options
- Given a user viewing results
- When they change sort to "Most Downloaded"
- Then results re-order by download count (highest first)
- And the same applies for "Newest", "Most Liked", "Relevance"

## View toggle
- Given a user viewing the results grid
- When they switch to list view
- Then results display as horizontal cards with more detail
- And switching back restores the grid layout
