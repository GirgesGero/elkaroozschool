# EL KAROOZ School — Phase 2 Observatory Acceptance Notes

## Scope

This phase makes the observatory/marathon question bank manageable without destroying historical attempts.

## Database contract

- `marathon_questions.status`: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- `marathon_sections.status`: same lifecycle.
- `marathon_question_revisions`: immutable snapshots owned by the original question id.
- `get_marathon_questions_for_player(uuid)`: player-safe payload; never returns `is_correct`.
- `archive_marathon_question(uuid)`: archives a published item without deleting historical answers.
- `replace_marathon_question(uuid,text,uuid,jsonb)`: snapshots old content, archives old question, creates a new published question, and inserts validated options.
- `reopen_marathon_question(uuid,uuid)`: verifies that the question belongs to the submission's marathon before opening it.

## Authorization contract

- `admin` and `super_user`: cross-group management.
- `servant`: only in own group and only with `MANAGE_MARATHON`.
- `secretariat`: own group through `is_secretariat_of_group()`.
- `trainee`: reads own group's published questions through the player RPC; cannot read the answer key.
- `anon`: no access to the player RPC, management RPCs, or revision table.

## Historical data invariant

A question replacement does not rewrite `marathon_trainee_answers.question_id`. Old answers therefore remain attached to the old question row and its archived content. Never hard-delete a question referenced by submissions.

## Known UI limitation

The manager currently supports adding/archiving sections/questions and reopening the first question from the submissions row. A full edit form that calls `replace_marathon_question` is still a follow-up UI task; the database API is ready for it.

## Verification evidence

- Live Supabase after Phase 2:
  - 54 questions.
  - 54 published questions.
  - 0 archived questions before any operator action.
  - New player/management RPC grants: `authenticated=true`, `anon=false`.
- Local frontend verification is separate from live database verification and must be rerun after final UI changes.
