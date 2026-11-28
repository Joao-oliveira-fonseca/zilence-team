<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (ZILENCE)

- Google OAuth uses `src/lib/google-auth.ts` with an absolute broker URL on the project's published Lovable host, returns to `/auth` on the caller's origin, and waits for a validated user with a late-session listener. Why: independent hosts do not serve `/~oauth`, and OAuth completion can arrive after the page mounts.

- Roles live in `public.user_roles` (`coach` | `player`); RLS uses `is_coach()` / `my_player_id()` security-definer helpers. Why: UI hiding is not security; every table must enforce role and visibility in RLS.
- The first account becomes coach via the `handle_new_user` trigger; players join through `invitePlayer` (server fn, service role used only after the caller's coach check). Why: no self-promotion path exists from the browser.
- Shared content carries a `visibility_level` (`private` default, `player`, `team`); coach notes never get one. Why: sharing is managed centrally in Visibility Control.
- All UI text goes through `src/i18n` (`pt` is the source dictionary, `es` must mirror every key; a test enforces it). Why: per-user language saved on `profiles.language`.
- Few main areas: coach routes under `src/routes/_authenticated/_coach/`, player routes under `_player/`, each gated by a role check in its pathless layout. Sub-features go in tabs, dialogs and sheets, not new routes. Why: the spec forbids one page per feature.
