# OpenClaw VibeLife Plugin

OpenClaw tools for managing VibeLife data:

- `vibelife_todo_list`
- `vibelife_todo_create`
- `vibelife_todo_update`
- `vibelife_note_search`
- `vibelife_note_create`
- `vibelife_note_update`
- `vibelife_project_list`
- `vibelife_project_update`
- `vibelife_project_step_create`
- `vibelife_project_step_update`

Configuration sources, in priority order:

1. `VIBELIFE_API_BASE_URL`, `VIBELIFE_API_TOKEN`, `VIBELIFE_API_TIMEOUT_MS`
2. `plugins.entries.vibelife.config`
3. Built-in default base URL `http://127.0.0.1:49174`

Development install:

```bash
openclaw plugins install --link ./openclaw-vibelife-plugin
```
