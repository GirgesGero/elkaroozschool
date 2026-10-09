import json, datetime

data = [
  {"table_name":"books","id":"f123987b-cc2c-4db5-91be-05e9dd8858c0","file_url":"https://storage.elkarooz-school.internal/books/intro_nt.pdf","cover_url":"https://images.unsplash.com/photo-1544717305-2782549b5136","group_id":None},
  {"table_name":"books","id":"10d21b5d-e156-4fee-903f-33085ef5e006","file_url":"https://storage.elkarooz-school.internal/books/intro_nt.pdf","cover_url":"https://images.unsplash.com/photo-1544717305-2782549b5136","group_id":None},
  {"table_name":"books","id":"ad7c4abd-30e3-4411-9e9b-dff551c04f24","file_url":"https://storage.elkarooz-school.internal/books/intro_nt.pdf","cover_url":"https://images.unsplash.com/photo-1544717305-2782549b5136","group_id":None},
  {"table_name":"books","id":"f671b31a-544d-4cd1-a6fb-284c507b8aa7","file_url":"https://storage.elkarooz-school.internal/books/intro_nt.pdf","cover_url":"https://images.unsplash.com/photo-1544717305-2782549b5136","group_id":None},
  {"table_name":"books","id":"046cfabf-8082-4dff-92fb-4b701e67c234","file_url":"https://storage.elkarooz-school.internal/books/intro_nt.pdf","cover_url":"https://images.unsplash.com/photo-1544717305-2782549b5136","group_id":None},
  {"table_name":"researches","id":"6c28be49-838e-49ed-a508-987a3157180c","file_url":"https://storage.elkarooz-school.internal/research/paul_theology.pdf","cover_url":None,"group_id":None},
  {"table_name":"researches","id":"bec53671-bb11-45dc-8341-0e61a32ac4e2","file_url":"https://storage.elkarooz-school.internal/research/paul_theology.pdf","cover_url":None,"group_id":None},
  {"table_name":"researches","id":"56ebb05c-d8aa-408a-b47e-ed313ad3a44d","file_url":"https://storage.elkarooz-school.internal/research/paul_theology.pdf","cover_url":None,"group_id":None},
  {"table_name":"researches","id":"ec58d50a-aa3a-40e9-a155-bfd94ea5f40c","file_url":"https://storage.elkarooz-school.internal/research/paul_theology.pdf","cover_url":None,"group_id":None},
  {"table_name":"researches","id":"4ba67f1e-3529-4921-a7aa-ad45fff68827","file_url":"https://storage.elkarooz-school.internal/research/paul_theology.pdf","cover_url":None,"group_id":None},
  {"table_name":"curriculums","id":"28a4435c-c7dd-4786-87b8-bddbe3bba72d","file_url":"https://storage.elkarooz-school.com/academic/group_1/curriculum/matthew.pdf","cover_url":None,"group_id":"1"},
  {"table_name":"curriculums","id":"6bc26e12-2d38-4366-818b-977b8705ed8c","file_url":"https://storage.elkarooz-school.com/academic/group_1/curriculum/matthew.pdf","cover_url":None,"group_id":"1"},
  {"table_name":"curriculums","id":"d441ab4f-48a1-475d-ae79-1a6d1a841fcf","file_url":"https://storage.elkarooz-school.com/academic/group_1/curriculum/matthew.pdf","cover_url":None,"group_id":"1"},
  {"table_name":"curriculums","id":"7d4d1bfc-e60b-439d-9629-67a82056492e","file_url":"https://storage.elkarooz-school.com/academic/group_1/curriculum/matthew.pdf","cover_url":None,"group_id":"1"},
  {"table_name":"curriculums","id":"273231d0-837d-4800-ac5f-493d1adf427e","file_url":"https://storage.elkarooz-school.com/academic/group_1/curriculum/matthew.pdf","cover_url":None,"group_id":"1"},
  {"table_name":"curriculums","id":"45884eca-dc6d-4ef5-a081-e9da934023d1","file_url":"https://storage.elkarooz-school.com/academic/group_1/curriculum/matthew.pdf","cover_url":None,"group_id":"1"},
  {"table_name":"curriculums","id":"b707b2ef-265f-438e-8282-2d255fb90efe","file_url":"https://storage.elkarooz-school.com/academic/group_1/curriculum/matthew.pdf","cover_url":None,"group_id":"1"},
  {"table_name":"curriculums","id":"1cc26c36-5334-4e4e-9a43-b701d4701220","file_url":"https://storage.elkarooz-school.com/academic/group_1/curriculum/matthew.pdf","cover_url":None,"group_id":"1"},
  {"table_name":"mp3_tracks","id":"0a950cfc-f73f-4568-bae2-b2bd153c7b76","file_url":"https://storage.elkarooz-school.internal/mp3/group1_liturgy.mp3","cover_url":None,"group_id":"1"},
  {"table_name":"mp3_tracks","id":"8cce991f-ba7f-4242-98fe-f7d103bd803a","file_url":"https://storage.elkarooz-school.internal/mp3/group1_liturgy.mp3","cover_url":None,"group_id":"1"},
  {"table_name":"mp3_tracks","id":"ed45f8e8-d4b8-427b-9911-f8e4b95fa17e","file_url":"https://storage.elkarooz-school.internal/mp3/group1_liturgy.mp3","cover_url":None,"group_id":"1"},
  {"table_name":"mp3_tracks","id":"941a0b40-de76-4069-90ff-541512feadbb","file_url":"https://storage.elkarooz-school.internal/mp3/group1_liturgy.mp3","cover_url":None,"group_id":"1"},
  {"table_name":"mp3_tracks","id":"a20384ee-472a-40d6-8c43-4e4a64181179","file_url":"https://storage.elkarooz-school.internal/mp3/group1_liturgy.mp3","cover_url":None,"group_id":"1"},
  {"table_name":"gallery_items","id":"37fe775d-6b05-4765-80ca-864213610727","file_url":"https://images.unsplash.com/photo-1544717305-2782549b5136","cover_url":None,"group_id":"1"},
  {"table_name":"gallery_items","id":"a18a6076-6733-4624-81b3-319c3e9c780a","file_url":"https://images.unsplash.com/photo-1544717305-2782549b5136","cover_url":None,"group_id":"1"},
  {"table_name":"gallery_items","id":"ebc45f9d-7f00-4060-8c80-2e4b9e935c57","file_url":"https://images.unsplash.com/photo-1544717305-2782549b5136","cover_url":None,"group_id":"1"},
  {"table_name":"gallery_items","id":"4190dfb8-9600-4a9a-8d38-880418e67878","file_url":"https://images.unsplash.com/photo-1544717305-2782549b5136","cover_url":None,"group_id":"1"},
  {"table_name":"gallery_items","id":"41782b9a-ed71-4b52-b106-6491f9a1dec7","file_url":"https://images.unsplash.com/photo-1544717305-2782549b5136","cover_url":None,"group_id":"1"},
  {"table_name":"post_images","id":"330a2636-cbfb-42a9-9ec8-082911293230","file_url":"https://images.unsplash.com/photo-1544717305-2782549b5136","cover_url":None,"group_id":None},
  {"table_name":"post_images","id":"e0f05e86-74c1-432b-80cf-54f6625e3960","file_url":"https://images.unsplash.com/photo-1512820790803-83ca734da794","cover_url":None,"group_id":None},
  {"table_name":"post_images","id":"aea0f28d-8396-41ee-bb60-1c208d4b3a68","file_url":"https://images.unsplash.com/photo-1544717305-2782549b5136","cover_url":None,"group_id":None},
  {"table_name":"post_images","id":"f6b1c41d-9516-4e92-b7fe-7b6dc166931e","file_url":"https://images.unsplash.com/photo-1512820790803-83ca734da794","cover_url":None,"group_id":None},
  {"table_name":"post_images","id":"de31a538-e892-4223-9bc0-ea18077a3a81","file_url":"https://images.unsplash.com/photo-1544717305-2782549b5136","cover_url":None,"group_id":None},
  {"table_name":"post_images","id":"32227c14-4619-4ade-867c-64e058799c32","file_url":"https://images.unsplash.com/photo-1512820790803-83ca734da794","cover_url":None,"group_id":None},
  {"table_name":"post_images","id":"d8ea860d-5c40-49d2-bd1b-d837521fa288","file_url":"https://images.unsplash.com/photo-1544717305-2782549b5136","cover_url":None,"group_id":None},
  {"table_name":"post_images","id":"57641cce-994f-4e2b-b565-f51e22638e7e","file_url":"https://images.unsplash.com/photo-1512820790803-83ca734da794","cover_url":None,"group_id":None},
  {"table_name":"post_images","id":"3b497625-e7e8-41d3-a357-d3aae4905f5a","file_url":"https://images.unsplash.com/photo-1544717305-2782549b5136","cover_url":None,"group_id":None},
  {"table_name":"post_images","id":"ee54a047-19ef-4498-9ad5-60cc044ca945","file_url":"https://images.unsplash.com/photo-1512820790803-83ca734da794","cover_url":None,"group_id":None},
  {"table_name":"backup_records","id":"2dfd28d7-9478-4db2-8ee1-c108841501e9","file_url":"backups/backup_phase9_1790409591.zip","cover_url":None,"group_id":None},
  {"table_name":"backup_records","id":"2de22f08-2203-4e2a-a29c-b64ffc1acb8f","file_url":"backups/backup_phase9_1790409847.zip","cover_url":None,"group_id":None},
  {"table_name":"backup_records","id":"aae94e3b-e739-4f12-bbf6-87966c752f7b","file_url":"backups/backup_phase9_1790410196.zip","cover_url":None,"group_id":None},
  {"table_name":"backup_records","id":"96209857-7749-48d8-92d1-4807d2656277","file_url":"backups/backup_phase9_1790410354.zip","cover_url":None,"group_id":None},
  {"table_name":"backup_records","id":"80e62b1f-f821-4544-b4bc-4b795343096e","file_url":"backups/backup_phase9_1790410623.zip","cover_url":None,"group_id":None},
  {"table_name":"backup_records","id":"28f94ca9-9d39-4ec0-bba5-a4808efe8ff6","file_url":"backups/backup_phase9_1790410869.zip","cover_url":None,"group_id":None},
  {"table_name":"backup_records","id":"0be577b8-a990-4195-b7a4-b3c021b49ea1","file_url":"backups/backup_phase9_1790423799.zip","cover_url":None,"group_id":None},
  {"table_name":"backup_records","id":"32360218-e58b-420a-83dd-79d9f174cff7","file_url":"backups/backup_phase9_1790436264.zip","cover_url":None,"group_id":None},
  {"table_name":"backup_records","id":"a2642f9c-f5a1-4a6d-b6b1-d9fb9478c144","file_url":"backups/backup_phase9_1790552996.zip","cover_url":None,"group_id":None},
  {"table_name":"backup_records","id":"95db34f9-92fd-42f1-b1bf-db83a753d7f7","file_url":"backups/backup_phase9_1790607279.zip","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"3dffaf52-5d11-4862-923c-d8dfcd3fb822","file_url":"imports/batch_dry_run.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"5575739f-9e44-4c8b-ae1a-dd582c19db71","file_url":"imports/batch_err.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"8b092110-9a9e-4c99-a7fb-23d4e139f39f","file_url":"imports/batch_dry_run.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"4552664d-abd7-4bb1-9d06-ca64034180bf","file_url":"imports/batch_err.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"0845d14e-a444-4465-8d96-606cd933cad8","file_url":"imports/batch_dry_run.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"d65b7b8e-ef21-4d36-a84b-f5db3040a853","file_url":"imports/batch_err.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"e2f4bd4d-d062-4b9b-a1ee-40364ae12398","file_url":"imports/batch_real.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"a8998998-025e-4651-96da-e0782d271586","file_url":"imports/batch_update.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"cd025b2b-973b-4aed-9ded-a13543ca6de0","file_url":"imports/batch_dry_run.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"8d8eb869-4cd2-4446-bccd-a2893ac3f859","file_url":"imports/batch_err.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"14835778-d36e-4eef-8e6f-1f9d42776ac7","file_url":"imports/batch_real.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"4ec8a149-ba2b-4a36-b6fd-e54b9c105c3f","file_url":"imports/batch_update.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"4ea6a167-37bc-46d7-b67a-eb69b32f9727","file_url":"imports/batch_dry_run_1790410875.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"44e7e3bd-2ee4-40ce-8203-e76af8e72ade","file_url":"imports/batch_err_1790410875.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"24089388-dae1-4505-a172-8e92d82d584f","file_url":"imports/batch_real_1790410875.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"d4cef2c2-bb73-47d2-95ae-5684c8e36d81","file_url":"imports/batch_update_1790410875.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"73b85608-e92e-4018-a4dc-d5e3a6cf3a5f","file_url":"imports/batch_dry_run_1790423800.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"e4538d83-e20f-4ee9-9b55-80a318e991fd","file_url":"imports/batch_err_1790423800.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"68ad69b1-3fb1-472e-959a-0c5c5e9cfa7b","file_url":"imports/batch_real_1790423800.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"beff8507-d0f0-432d-a0bb-56342b1036b4","file_url":"imports/batch_update_1790423800.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"9404fdc1-8be7-42b4-8bad-1f1f0eb602d5","file_url":"imports/batch_dry_run_1790436265.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"25fa34b7-fa89-4c90-b8ad-ac73d27cb34c","file_url":"imports/batch_err_1790436265.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"aa5bd602-6966-4c1a-ae5b-0eaec49069a8","file_url":"imports/batch_real_1790436265.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"e1330f71-6c94-46b6-ade3-167dc83bb24f","file_url":"imports/batch_update_1790436265.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"74b16c8b-c6e9-40e9-94d6-71a84fb7db5a","file_url":"imports/batch_dry_run_1790607280.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"8117dd7d-abff-4828-8536-da1141160106","file_url":"imports/batch_err_1790607280.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"a6de4571-714e-4e17-8e4a-a4ba208891da","file_url":"imports/batch_real_1790607280.csv","cover_url":None,"group_id":None},
  {"table_name":"import_history","id":"2c4de1ec-3f25-4afd-88c0-3b417be3ab01","file_url":"imports/batch_update_1790607280.csv","cover_url":None,"group_id":None}
]

resource_type_map = {
    "books": ("BOOK_FILE", "BOOK_COVER"),
    "researches": ("RESEARCH_FILE", None),
    "curriculums": ("CURRICULUM", None),
    "mp3_tracks": ("MP3_TRACK", None),
    "gallery_items": ("GALLERY_ITEM", "GALLERY_COVER"),
    "post_images": ("POST_IMAGE", None),
    "backup_records": ("BACKUP_ARCHIVE", None),
    "import_history": ("IMPORT_FILE", None),
}

plan = []
summary = {}

for r in data:
    tbl = r["table_name"]
    main_type, cover_type = resource_type_map[tbl]
    
    # Main file
    if r["file_url"]:
        plan.append({
            "resource_type": main_type,
            "source_table": tbl,
            "record_id": r["id"],
            "source_path_or_url": r["file_url"],
            "group_id": int(r["group_id"]) if r["group_id"] else None,
            "target_storage_provider": "GOOGLE_DRIVE",
            "status": "MIGRATION_READY"
        })
        summary[main_type] = summary.get(main_type, 0) + 1
        
    # Cover file if exists
    if r.get("cover_url") and cover_type:
        plan.append({
            "resource_type": cover_type,
            "source_table": tbl,
            "record_id": r["id"],
            "source_path_or_url": r["cover_url"],
            "group_id": int(r["group_id"]) if r["group_id"] else None,
            "target_storage_provider": "GOOGLE_DRIVE",
            "status": "MIGRATION_READY"
        })
        summary[cover_type] = summary.get(cover_type, 0) + 1

manifest = {
    "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
    "environment": "STAGING_REHEARSAL",
    "total_verified_media_records": len(plan),
    "counts_by_resource_type": summary,
    "migration_items": plan
}

manifest_path = r"E:\drive progect\ELKAROOZ SCHOOL\docs\MEDIA_MIGRATION_REHEARSAL_MANIFEST.json"
with open(manifest_path, "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)

print(f"Generated verified manifest with {len(plan)} media items.")
print(json.dumps(summary, indent=2))
