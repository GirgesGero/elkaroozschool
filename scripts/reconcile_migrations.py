import json, re
from pathlib import Path

local_dir = Path("supabase/migrations")
local_files = {}
for p in sorted(local_dir.glob("*.sql")):
    m = re.match(r"^([0-9]+)_(.*)\.sql$", p.name)
    if m:
        v, n = m.group(1), m.group(2)
        local_files[p.name] = {"version": v, "name": n, "file": p.name}
    else:
        local_files[p.name] = {"version": "unknown", "name": p.stem, "file": p.name}

# Live ledger data from DB
live_raw = [
  {"version":"20260926042302","name":"001_extensions","has_statements":True},
  {"version":"20260926042315","name":"002_core_roles_groups","has_statements":True},
  {"version":"20260926042328","name":"003_profiles_auth_mapping","has_statements":True},
  {"version":"20260926042339","name":"004_permissions_secretariat","has_statements":True},
  {"version":"20260926042352","name":"005_academic_terms_lectures","has_statements":True},
  {"version":"20260926042434","name":"006_attendance","has_statements":True},
  {"version":"20260926042447","name":"007_exams_grades","has_statements":True},
  {"version":"20260926042500","name":"008_marathons","has_statements":True},
  {"version":"20260926042514","name":"009_feed_social","has_statements":True},
  {"version":"20260926042525","name":"010_notifications_verses","has_statements":True},
  {"version":"20260926042537","name":"011_library_media","has_statements":True},
  {"version":"20260926042557","name":"012_bible_local","has_statements":True},
  {"version":"20260926042609","name":"013_audit_backup_import","has_statements":True},
  {"version":"20260926042622","name":"014_indexes_functions_triggers","has_statements":True},
  {"version":"20260926042639","name":"015_rls_policies","has_statements":True},
  {"version":"20260926042652","name":"016_seed_data","has_statements":True},
  {"version":"20260926043106","name":"017_seed_test_accounts","has_statements":True},
  {"version":"20260926043127","name":"018_populate_test_accounts","has_statements":True},
  {"version":"20260926043551","name":"019_fix_auth_identities","has_statements":True},
  {"version":"20260926043605","name":"020_repopulate_test_accounts","has_statements":True},
  {"version":"20260926044034","name":"021_fix_gotrue_users","has_statements":True},
  {"version":"20260926044425","name":"022_set_default_auth_uid","has_statements":True},
  {"version":"20260926045131","name":"023_academic_attendance_engine","has_statements":True},
  {"version":"20260926045146","name":"024_attendance_thursday_lock","has_statements":True},
  {"version":"20260926045209","name":"025_attendance_summary_rpc","has_statements":True},
  {"version":"20260926050041","name":"026_marathon_engine_rpcs","has_statements":True},
  {"version":"20260926051133","name":"027_marathon_sections_rls","has_statements":True},
  {"version":"20260926051334","name":"028_marathon_timestamps","has_statements":True},
  {"version":"20260926051422","name":"029_fix_servant_permissions_rls","has_statements":True},
  {"version":"20260926051844","name":"030_feed_interactions_rpcs","has_statements":True},
  {"version":"20260926051916","name":"032_fix_feed_rpcs","has_statements":True},
  {"version":"20260926052629","name":"033_feed_content_columns","has_statements":True},
  {"version":"20260926052709","name":"034_create_post_images_table","has_statements":True},
  {"version":"20260926060538","name":"035_update_library_media_scope","has_statements":True},
  {"version":"20260926065541","name":"036_bible_dictionary_and_rpcs","has_statements":True},
  {"version":"20260926070009","name":"038_seed_all_bible_books","has_statements":True},
  {"version":"20260926070224","name":"039_seed_bible_sources","has_statements":True},
  {"version":"20260926070408","name":"037_seed_full_bible_chapters","has_statements":True},
  {"version":"20260926074253","name":"040_backup_restore_import_engine","has_statements":True},
  {"version":"20260926075510","name":"041_backup_restore_trainee_bulk_rpc","has_statements":True},
  {"version":"20260926080305","name":"042_fix_bulk_import_rpc_and_audit_rls","has_statements":True},
  {"version":"20260926080852","name":"043_fix_bulk_import_columns","has_statements":True},
  {"version":"20260926081155","name":"044_fix_auth_identities_columns","has_statements":True},
  {"version":"20260926085926","name":"045_notification_engine_rpcs","has_statements":True},
  {"version":"20260928134021","name":"046_group_and_profile_rpcs","has_statements":True},
  {"version":"20260928134139","name":"047_servants_drilldown_rpc","has_statements":True},
  {"version":"20260928134507","name":"048_seed_full_groups_data","has_statements":True},
  {"version":"20260928142358","name":"049_fix_trainee_full_profile_rpc","has_statements":True},
  {"version":"20260928144739","name":"050_fix_exam_grades_column_rpc","has_statements":True},
  {"version":"20260928145220","name":"051_fix_marathon_in_trainee_profile_rpc","has_statements":True},
  {"version":"20260928145324","name":"052_fix_marathon_status_rpc","has_statements":True},
  {"version":"20260930095254","name":"revoke_anon_security_definer","has_statements":True},
  {"version":"20260930133048","name":"close_self_escalation","has_statements":True},
  {"version":"20260930133128","name":"close_self_escalation_v2","has_statements":True},
  {"version":"20260930133150","name":"close_self_escalation_stage2","has_statements":True},
  {"version":"20260930150000","name":"rpc_group_scope_guards","has_statements":False},
  {"version":"20260930200000","name":"pastoral_template_admin_only","has_statements":False},
  {"version":"20261001","name":"revoke_anon_execute_on_group_rpcs","has_statements":False},
  {"version":"20261001112952","name":"fix_null_propagation_fail_open_authz","has_statements":True},
  {"version":"20261001130000","name":"backfill_app_metadata_from_profiles","has_statements":False},
  {"version":"20261001140000","name":"drop_create_test_user","has_statements":False},
  {"version":"20261001141907","name":"logical_restore_rpcs","has_statements":True},
  {"version":"20261001141945","name":"logical_restore_rpcs_patch_update_existing","has_statements":True},
  {"version":"20261001142008","name":"logical_restore_rpcs_patch_update_existing","has_statements":True},
  {"version":"20261001142024","name":"logical_restore_rpcs_patch_update_existing","has_statements":True},
  {"version":"20261001150000","name":"sync_profile_app_metadata","has_statements":False},
  {"version":"20261001160000","name":"logical_export_rpcs","has_statements":False},
  {"version":"20261002","name":"revoke_public_execute_on_data_reading_rpcs","has_statements":False},
  {"version":"20261004120000","name":"create_media_assets","has_statements":True},
  {"version":"20261004141649","name":"phase0_post_image_and_reactor_visibility","has_statements":True},
  {"version":"20261004202345","name":"harden_marathon_and_audit_rpcs","has_statements":True},
  {"version":"20261004210000","name":"acl_least_privilege_hardening","has_statements":True}
]

def normalize(name):
    return re.sub(r"^[0-9]+_", "", name)

categories = {
    "MATCH": [],
    "VERSION_DRIFT": [],
    "LIVE_ONLY": [],
    "LOCAL_PROPOSALS": []
}

local_matched = set()

for item in live_raw:
    v_live = item["version"]
    n_live = item["name"]
    n_norm = normalize(n_live)
    
    found_exact = False
    found_drift = False
    
    for fname, finfo in local_files.items():
        if finfo["version"] == v_live and finfo["name"] == n_live:
            categories["MATCH"].append({"live_version": v_live, "name": n_live, "local_file": fname, "has_sql": item["has_statements"]})
            local_matched.add(fname)
            found_exact = True
            break
            
    if not found_exact:
        for fname, finfo in local_files.items():
            if fname in local_matched:
                continue
            if finfo["name"] == n_live or finfo["name"] == n_norm or normalize(finfo["name"]) == n_norm:
                categories["VERSION_DRIFT"].append({"live_version": v_live, "local_version": finfo["version"], "name": n_live, "local_file": fname, "has_sql": item["has_statements"]})
                local_matched.add(fname)
                found_drift = True
                break
                
    if not found_exact and not found_drift:
        categories["LIVE_ONLY"].append(item)

for fname, finfo in local_files.items():
    if fname not in local_matched:
        categories["LOCAL_PROPOSALS"].append(finfo)

print("="*60)
print(f"RECONCILIATION SUMMARY:")
print(f"  Live Migrations Total: {len(live_raw)}")
print(f"  Local Migration Files: {len(local_files)}")
print(f"  1. Exact MATCH: {len(categories['MATCH'])}")
print(f"  2. VERSION DRIFT: {len(categories['VERSION_DRIFT'])}")
print(f"  3. LIVE ONLY: {len(categories['LIVE_ONLY'])}")
print(f"  4. LOCAL PROPOSALS (unapplied): {len(categories['LOCAL_PROPOSALS'])}")
print("="*60)

print("\n--- 1. EXACT MATCH (9) ---")
for x in categories["MATCH"]:
    print(f"  [MATCH] v={x['live_version']} | {x['name']} | file={x['local_file']} | SQL in ledger: {x['has_sql']}")

print("\n--- 2. VERSION DRIFT (20) ---")
for x in categories["VERSION_DRIFT"]:
    print(f"  [DRIFT] live_v={x['live_version']} vs local_v={x['local_version']} | name={x['name']} | file={x['local_file']} | SQL in ledger: {x['has_sql']}")

print("\n--- 3. LIVE ONLY (40) ---")
for x in categories["LIVE_ONLY"]:
    print(f"  [LIVE_ONLY] v={x['version']} | {x['name']} | SQL in ledger: {x['has_statements']}")

print("\n--- 4. LOCAL PROPOSALS (2) ---")
for x in categories["LOCAL_PROPOSALS"]:
    print(f"  [PROPOSAL] v={x['version']} | {x['name']} | file={x['file']}")
