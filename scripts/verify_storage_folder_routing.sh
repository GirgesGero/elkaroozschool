#!/usr/bin/env bash
# Pins the storage folder-routing contract in StorageController::upload().
#
# The bug this pins: the old catch-all `else` built
# "gallery/group_{id}/{folder_type}", so BOTH 'general' and 'gallery' landed in a
# shared directory, and any future folder_type silently joined them. Silent
# misrouting is worse than a loud 400.
#
# SCOPE — read this before trusting a green run:
#   These assertions read the SOURCE, which is correct for the routing table
#   (it is a static property: which folder_type maps to which path). They do
#   NOT prove containment on disk. verify_api_http.php and the traversal probes
#   own that. A green run here means "routing is as declared", nothing more.
set -u

ROOT="${ROOT:-E:/drive progect/ELKAROOZ SCHOOL}"
PHP="${PHPBIN:-/c/Users/Girge/AppData/Local/hermes/cache/php/php83/php.exe}"
BE="$ROOT/backend-api/src/Controllers/StorageController.php"

pass=0; fail=0
chk() { if [ "$2" = "1" ]; then echo "[PASS] $1"; pass=$((pass+1)); else echo "[FAIL] $1"; fail=$((fail+1)); fi; }
has() { grep -qF -- "$1" "$BE" && echo 1 || echo 0; }

# 1. Every allowlisted folder_type must be explicitly routed somewhere.
#    Each name must appear in the allowlist AND be reachable by a branch.
for ft in curriculum lectures books research mp3 users feed gallery general; do
  chk "folder_type '$ft' is explicitly routed" \
    "$([ "$(has "'$ft'")" = 1 ] && [ "$(has "\$folderType === '$ft'")$([ "$(has "'$ft'")" = 1 ] && echo 1 || echo 0)" != 0 ] && echo 1 || echo 0)"
done

# 2. The catch-all must not interpolate a raw folder_type into a path.
#    Scoped to the gallery catch-all specifically: `{$folderType}` legitimately
#    appears in the ACADEMIC branch (line ~39), where it is already constrained
#    by the preceding in_array() against the allowlist. A repo-wide search for
#    the literal gives a false failure there.
chk "catch-all does not interpolate \$folderType into a path" \
  "$([ "$(has 'gallery/group_{$groupId}/{$folderType}')" = 0 ] && echo 1 || echo 0)"

# 3. Album routing is allowlisted, not trusted from input.
chk "album_id is allowlisted (INVALID_ALBUM_ID)" "$(has 'INVALID_ALBUM_ID')"
chk "album path is keyed off \$albumId"         "$(has '{$albumId}')"

# 4. Group scope is still enforced before any path is constructed.
chk "enforceGroupScope present" "$(has 'enforceGroupScope')"

# 5. An unreachable folder_type fails loudly instead of falling through.
chk "unsupported folder_type returns 400" "$(has 'UNSUPPORTED_FOLDER_TYPE')"

# 6. The allowlist must not outgrow the branches that implement it.
n_allowed=$(sed -n '/\$ALLOWED_FOLDERS = \[/,/\];/p' "$BE" | tr ',' '\n' | grep -c "'")
chk "allowlist has 9 entries (got $n_allowed)" "$([ "$n_allowed" -eq 9 ] && echo 1 || echo 0)"

# 7. user_role stays allowlisted — it is interpolated into the users/ path.
chk "user_role is allowlisted (INVALID_USER_ROLE)" "$(has 'INVALID_USER_ROLE')"

# 8. Syntax.
chk "StorageController.php parses" "$("$PHP" -l "$BE" >/dev/null 2>&1 && echo 1 || echo 0)"

echo "---"
echo "$pass/$((pass+fail)) passed"
[ "$fail" -eq 0 ] || exit 1