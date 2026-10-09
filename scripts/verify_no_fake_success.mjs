/**
 * Guards the rule: a success message may only follow a real, confirmed backend result.
 *
 * The backup/restore page used to "succeed" by writing a fake checksum and logging an
 * audit event — no archive, no restore, no server call. These assertions fail if that
 * pattern ever comes back, or if a new page invents the same shape.
 *
 * Run: node scripts/verify_no_fake_success.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// The repo path contains a space, so it must be decoded rather than used as a URL path.
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'frontend', 'src');

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${label}`);
  } else {
    failed++;
    console.log(`  [FAIL] ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

console.log('=== backup/restore UI must not fabricate results ===\n');

const backupsPage = readFileSync(join(SRC, 'app', 'admin', 'backups', 'page.tsx'), 'utf8');

// 1. The original three tells of a fabricated archive.
check('no random checksum', !/Math\.random\(\)/.test(backupsPage),
  'a Math.random checksum means the sha256 was invented');
check('no hardcoded archive size', !/file_size_bytes:\s*1048576/.test(backupsPage),
  'a fixed byte size means the archive was never measured');
check('no hardcoded COMPLETED status', !/status:\s*['"]COMPLETED['"]/.test(backupsPage),
  'status must come from the backend, not the form');

// 2. Both destructive-sounding handlers must reach the PHP API.
const createHandler = backupsPage.slice(
  backupsPage.indexOf('const handleCreateBackup'),
  backupsPage.indexOf('const handleAttachFile'),
);
check('handleCreateBackup calls phpApi', /phpApi[\s<]/.test(createHandler));

const restoreHandler = backupsPage.slice(
  backupsPage.indexOf('const handleRestoreBackup'),
  backupsPage.lastIndexOf('const handleRestoreBackup') + 2500,
);
check('handleRestoreBackup calls phpApi', /phpApi[\s<]/.test(restoreHandler));

// 3. The restore must send the fields the backend actually requires, otherwise the
//    backend rejects it with CONFIRMATION_REQUIRED and the UI would look broken.
check('restore confirms explicitly', /confirm_restore/.test(restoreHandler));
check('restore selects a mode', /restore_mode/.test(restoreHandler));
check('restore uploads the archive', /backup_zip/.test(restoreHandler));

// 4. A rollback must be reported as a failure, never as success.
check('rollback is reported as failure',
  /rolled_back[\s\S]{0,200}type:\s*['"]error['"]/.test(restoreHandler),
  'a rolled-back restore must never surface as a success message');

// 5. The archive must actually be attached before restoring.
check('restore requires an attached file',
  /backupFiles\[/.test(restoreHandler));
check('restore button is gated on the file',
  /disabled=\{restoring \|\| !backupFiles\[/.test(backupsPage));

console.log('\n=== no page may log an audit event as a substitute for doing the work ===\n');

/**
 * Handlers that legitimately log an audit event: they performed a real write first and
 * only then reported success. Each is whitelisted by name so the check stays meaningful
 * instead of firing on every correct page.
 */
const AUDIT_AFTER_REAL_WRITE = ['handleDeleteBackup'];

const files = walk(SRC);
let offenders = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file).replace(/\\/g, '/');

  const auditIdx = text.indexOf('log_operational_event');
  if (auditIdx === -1) continue;

  // Find which handler the audit call sits inside.
  const before = text.slice(0, auditIdx);
  const handlerStart = Math.max(
    before.lastIndexOf('const handleCreate'),
    before.lastIndexOf('const handleDelete'),
    before.lastIndexOf('const handleRestore'),
    before.lastIndexOf('const handleUpload'),
    before.lastIndexOf('const handleImport'),
  );
  const handlerName = handlerStart === -1
    ? null
    : before.slice(handlerStart).match(/const (handle\w+)/)?.[1] ?? null;

  if (handlerName && AUDIT_AFTER_REAL_WRITE.includes(handlerName)) continue;

  const after = text.slice(auditIdx, auditIdx + 900);
  const successIdx = after.search(/type:\s*['"]success['"]/);
  if (successIdx === -1) continue;

  const between = after.slice(0, successIdx);
  if (!/phpApi|fetch\(|\.rpc\(/.test(between)) {
    offenders.push(`${rel}:${before.split('\n').length} (${handlerName ?? 'unknown handler'})`);
  }
}

check('no audit-log-then-claim-success pattern', offenders.length === 0,
  offenders.join(', '));

// 6. The export must not claim a format it does not produce.
const importsPage = readFileSync(join(SRC, 'app', 'admin', 'imports', 'page.tsx'), 'utf8');
check('export does not fake an xlsx filename',
  !/\?\s*['"]csv['"]\s*:\s*['"]csv['"]/.test(importsPage),
  "format === 'csv' ? 'csv' : 'csv' downloads a CSV for every choice");
check('excel export is not offered', !/handleExportTrainees\(['"]excel['"]\)/.test(importsPage));

console.log('\n=== the API gateway must be the only PHP entry point ===\n');

const gateway = readFileSync(join(SRC, 'lib', 'api', 'php.ts'), 'utf8');
check('gateway forwards the caller JWT', /Authorization/.test(gateway));
check('gateway refuses to run without a configured base URL',
  /PHP_API_URL_MISSING/.test(gateway));
check('gateway never treats a non-2xx as success',
  /!response\.ok \|\| payload\?\.status !== ['"]success['"]/.test(gateway));
check('gateway is the only module importing the PHP base URL', (() => {
  const users = files.filter((f) => f !== join(SRC, 'lib', 'api', 'php.ts'))
    .filter((f) => /NEXT_PUBLIC_PHP_API_URL/.test(readFileSync(f, 'utf8')));
  return users.length === 0;
})());

console.log(`\n=== SUMMARY ===\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
