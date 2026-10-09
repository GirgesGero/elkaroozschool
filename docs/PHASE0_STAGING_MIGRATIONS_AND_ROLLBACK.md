# توثيق تعديلات Staging وخطة التراجع — Staging Migrations & Rollback Plan

**تاريخ التوثيق:** 4 أكتوبر 2026  
**البيئة المستهدفة:** STAGING (`kgqgnqjkrghvktymbimz.supabase.co`)  
**الهدف:** تطبيق تحصين الدوال (RPC Hardening)، وإنشاء جدول الوسائط (`media_assets`)، وتقييد الصلاحيات الزائدة (ACL Least Privilege Hardening) على Staging مع توفير سكريبتات التراجع (Rollback).

---

## 1. لقطة الحالة قبل التعديل (Pre-Modification Snapshot)

### أ. دوال RPC المستهدفة
- `get_trainee_marathon_state(uuid, uuid)`:
  - المالك: `postgres`
  - النوع: `SECURITY DEFINER`, `search_path = public, pg_temp`
  - الصلاحيات الحالية: `GRANT EXECUTE TO authenticated, service_role`
  - المشكلة الأمنية: عدم التحقق من صلاحية المستدعي أو تبعية المتدرب للمجموعة، مما يسمح لأي مستخدم مسجل بقراءة إجابات متدرب آخر.
- `log_operational_event(...)`:
  - المالك: `postgres`
  - النوع: `SECURITY DEFINER`, `search_path = public, pg_temp`
  - الصلاحيات الحالية: `GRANT EXECUTE TO authenticated, service_role`
  - المشكلة الأمنية: غياب فحص الدور والسماح لأي مستخدم بإدراج سجلات تدقيق منتحلة (`actor_role='admin'`).

### ب. صلاحيات الجداول الحالية (Current Table ACLs)
- جميع جداول `public` الـ 50 تمنح `anon` و `authenticated` صلاحيات كاملة على مستوى الجدول:
  `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN`.
- رغم أن RLS يمنع عمليات الصفوف (`SELECT, INSERT, UPDATE, DELETE`)، فإن `TRUNCATE` و `MAINTAIN` تمثل امتيازات زائدة تتجاوز RLS في PostgreSQL ويجب سحبها تطبيقًا لمبدأ Least Privilege.

---

## 2. أوامر التعديل المقترحة (Proposed SQL Changes)

### التعديل 1: إنشاء جدول الوسائط المركزي `media_assets`
- الملف: `supabase/migrations/20261004120000_create_media_assets.sql`
- الوصف: إنشاء جدول `media_assets` مع الفهارس وسياسات RLS لعزل المجموعات والملفات العامة.

### التعديل 2: تحصين دوال الماراثون وسجل العمليات
- الملف: `supabase/migrations/20261004202345_harden_marathon_and_audit_rpcs.sql`
- الوصف:
  - نقل دالة الماراثون القديمة إلى `_unsafe_get_trainee_marathon_state` وقصرها على `service_role`.
  - إنشاء دالة غلاف `get_trainee_marathon_state` تفحص: المسئول/سوبر يوزر، قراءة المتدرب لنفسه داخل مجموعته، وقراءة الخادم المصرح له (`MANAGE_MARATHON`) داخل نفس المجموعة.
  - قصر `log_operational_event` على `service_role` والمسؤولين فقط ومنع تزوير الأدوار.

### التعديل 3: تقييد صلاحيات الجداول الزائدة (ACL Least Privilege)
- المقترح:
```sql
-- سحب صلاحيات TRUNCATE و MAINTAIN و TRIGGER و REFERENCES من anon و authenticated
REVOKE TRUNCATE, MAINTAIN, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- سحب صلاحية إنشاء كائنات جديدة مستقبلاً بتلك الامتيازات من defaults لمنشئ postgres
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE TRUNCATE, MAINTAIN, TRIGGER, REFERENCES ON TABLES FROM anon, authenticated;
```

---

## 3. أوامر التراجع الكامل (Rollback SQL Script)

في حال حدوث أي خلل في بيئة Staging، يتم تنفيذ الأوامر التالية لاستعادة الحالة السابقة بدقة:

```sql
-- 1. Rollback RPC Hardening
DROP FUNCTION IF EXISTS public.get_trainee_marathon_state(uuid, uuid);
ALTER FUNCTION public._unsafe_get_trainee_marathon_state(uuid, uuid)
    RENAME TO get_trainee_marathon_state;
GRANT EXECUTE ON FUNCTION public.get_trainee_marathon_state(uuid, uuid)
    TO authenticated, service_role;

-- Restore original log_operational_event
CREATE OR REPLACE FUNCTION public.log_operational_event(
    p_operation character varying,
    p_entity_type character varying,
    p_entity_id character varying,
    p_status character varying,
    p_details jsonb,
    p_checksum character varying DEFAULT NULL::character varying
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role VARCHAR;
    v_actor_name VARCHAR;
    v_log_id BIGINT;
BEGIN
    SELECT role_id, full_name INTO v_actor_role, v_actor_name
    FROM public.profiles WHERE id = v_actor_id;

    INSERT INTO public.audit_logs (
        actor_id,
        actor_name,
        actor_role,
        action,
        entity_type,
        entity_id,
        new_values
    ) VALUES (
        v_actor_id,
        COALESCE(v_actor_name, 'النظام الآلي'),
        COALESCE(v_actor_role, 'admin'),
        p_operation,
        p_entity_type,
        p_entity_id,
        jsonb_build_object(
            'status', p_status,
            'details', p_details,
            'checksum', p_checksum,
            'timestamp', NOW()
        )
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$function$;

-- 2. Rollback media_assets
DROP TABLE IF EXISTS public.media_assets CASCADE;

-- 3. Rollback ACL Hardening
GRANT TRUNCATE, MAINTAIN, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT TRUNCATE, MAINTAIN, TRIGGER, REFERENCES ON TABLES TO anon, authenticated;
```
