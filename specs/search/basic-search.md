# Basic Search

## Search for models
- Given a user on MeshHunt
- When they type a query in the search bar and press Enter (or wait 300ms)
- Then results appear from multiple sources in a unified grid
- And each result shows thumbnail, title, author, source badge, download count

## Skeleton loading
- Given a search has been initiated
- When results are still loading
- Then 12 skeleton placeholder cards with shimmer animation are shown
- And they are replaced by real results as they arrive

## Infinite scroll
- Given results have loaded (first page)
- When the user scrolls near the bottom
- Then the next page of results loads automatically
- And a loading spinner appears at the bottom during load

## Empty results
- Given a user searches for a very obscure term with no results
- When all sources return zero results
- Then a friendly "No models found" message appears with suggestions

## Search history
- Given a user has performed previous searches
- When they focus the search bar
- Then recent search terms appear as suggestions (from localStorage)
