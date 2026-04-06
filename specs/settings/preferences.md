# User Preferences

## Theme persistence
- Given a user switches from dark to light theme
- Then the theme applies immediately
- And it persists across page reloads (localStorage)

## Source preferences
- Given a user disables certain sources in settings
- Then those sources are not queried on future searches
- And the preferences persist in localStorage

## Default sort
- Given a user sets a default sort order in settings
- Then new searches use that sort order automatically

## Export/import settings
- Given a user clicks "Export Settings"
- Then a JSON file downloads with all preferences and favorites
- Given a user imports a settings JSON file
- Then their preferences and favorites are restored

## Clear data
- Given a user clicks "Clear All Data" in settings
- Then search history, favorites, and preferences are wiped
- And the app resets to default state

## Cross-device sync via slug
- Given a user clicks "Generate Sync Code"
- Then a 3-word human-readable slug is generated (e.g., swift-amber-falcon)
- And their settings + favorites are saved to PocketBase under that slug
- Given a user enters an existing slug on another device
- Then their settings and favorites are restored from PocketBase
