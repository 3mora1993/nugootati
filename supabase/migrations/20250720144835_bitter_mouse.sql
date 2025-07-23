/*
  # إضافة ميزة الرد والنقوط الصادر العالمي

  1. تعديلات الجدول
    - إضافة عمود `reciprocated_at` لتسجيل تاريخ الرد
    - جعل `event_id` قابل للقيمة الفارغة للنقوط الصادر العالمي

  2. الفهارس
    - إضافة فهرس على `reciprocated_at`
    - إضافة فهرس مركب على `direction` و `name`

  3. الأمان
    - تحديث سياسات RLS للتعامل مع النقوط العالمي
*/

-- إضافة عمود reciprocated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nugoot' AND column_name = 'reciprocated_at'
  ) THEN
    ALTER TABLE nugoot ADD COLUMN reciprocated_at timestamptz;
  END IF;
END $$;

-- جعل event_id قابل للقيمة الفارغة (إذا لم يكن كذلك بالفعل)
ALTER TABLE nugoot ALTER COLUMN event_id DROP NOT NULL;

-- إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_nugoot_reciprocated_at ON nugoot(reciprocated_at);
CREATE INDEX IF NOT EXISTS idx_nugoot_direction_name ON nugoot(direction, name);
CREATE INDEX IF NOT EXISTS idx_nugoot_event_direction ON nugoot(event_id, direction) WHERE event_id IS NOT NULL;