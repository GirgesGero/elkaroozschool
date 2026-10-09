<?php
/**
 * Runtime check for the storage folder-routing table.
 *
 * verify_storage_folder_routing.sh asserts the routing table on the SOURCE.
 * That proves the declarations are present; it cannot prove each folder_type
 * still lands on the path the table promises, nor that two folder types do not
 * collide. This executes the routing logic itself and compares real outputs.
 *
 * The controller's routing is a pure function of ($folderType, $groupId) once
 * the guards pass, so it is re-derived here from the same branch structure
 * rather than extracted (the controller exits via Response::error, which is not
 * callable in isolation). Keep this in step with the controller.
 */
declare(strict_types=1);

const ACADEMIC = ['curriculum', 'lectures', 'books', 'research', 'mp3'];
const USER_ROLES = ['trainees', 'servants', 'secretariat', 'admins'];
const ALBUMS = ['general', 'gallery'];
const ALLOWED = ['curriculum', 'lectures', 'books', 'research', 'mp3',
                  'users', 'feed', 'general', 'gallery'];

function route(string $folderType, int $groupId, string $userRole = 'trainees', ?string $albumId = null): string {
    if (!in_array($folderType, ALLOWED, true)) {
        throw new RuntimeException('INVALID_FOLDER_TYPE');
    }
    if (in_array($folderType, ACADEMIC, true)) {
        return "academic/group_{$groupId}/{$folderType}";
    }
    if ($folderType === 'users') {
        if (!in_array($userRole, USER_ROLES, true)) {
            throw new RuntimeException('INVALID_USER_ROLE');
        }
        return "users/{$userRole}/group_{$groupId}";
    }
    if ($folderType === 'feed') {
        return 'feed/group_' . $groupId . '/' . date('Y/m');
    }
    if ($folderType === 'gallery' || $folderType === 'general') {
        $album = $albumId ?? $folderType;
        if (!in_array($album, ALBUMS, true)) {
            throw new RuntimeException('INVALID_ALBUM_ID');
        }
        return "gallery/group_{$groupId}/{$album}";
    }
    throw new RuntimeException('UNSUPPORTED_FOLDER_TYPE');
}

$pass = 0; $fail = 0;
function chk(string $label, bool $ok): void {
    global $pass, $fail;
    if ($ok) { echo "[PASS] $label\n"; $pass++; }
    else     { echo "[FAIL] $label\n"; $fail++; }
}

// --- Every folder_type resolves, for every group. -----------------------------
foreach ([1, 2, 3] as $g) {
    foreach (ALLOWED as $ft) {
        try {
            $p = route($ft, $g);
            chk("$ft @group_$g -> $p", str_contains($p, "group_$g"));
        } catch (Throwable $e) {
            chk("$ft @group_$g routed", false);
        }
    }
}

// --- Isolation: group 1's paths must never appear under another group. --------
foreach (ALLOWED as $ft) {
    $p1 = route($ft, 1);
    $p2 = route($ft, 2);
    chk("$ft differs between group 1 and 2", $p1 !== $p2);
    chk("$ft group_1 path carries no group_2", !str_contains($p1, 'group_2'));
}

// --- No two folder types collide within a group. -----------------------------
$seen = [];
foreach (ALLOWED as $ft) {
    $p = route($ft, 1);
    chk("$ft does not collide with another folder_type in group 1",
        !array_key_exists($p, $seen) && ($seen[$p] = $ft) !== null);
}

// --- Rejections are loud. -----------------------------------------------------
foreach (['', 'academic', '../../etc', 'gallery/sub', 'GALLERY'] as $bad) {
    try {
        route($bad, 1);
        chk("rejects folder_type '" . $bad . "'", false);
    } catch (RuntimeException $e) {
        chk("rejects folder_type '" . $bad . "' (" . $e->getMessage() . ')', true);
    }
}

try { route('users', 1, 'root');            chk('rejects user_role root', false); }
catch (RuntimeException $e) { chk('rejects user_role root', true); }
try { route('gallery', 1, 'trainees', '../../../etc'); chk('rejects album traversal', false); }
catch (RuntimeException $e) { chk('rejects album traversal', true); }

// --- The specific regression: 'general' vs 'gallery' used to share a path. ----
chk('general and gallery no longer collide',
    route('general', 1) !== route('gallery', 1));

echo "---\n";
echo $pass . '/' . ($pass + $fail) . " passed\n";
exit($fail === 0 ? 0 : 1);