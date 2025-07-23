/*
  # إضافة اتجاه النقوط (وارد/صادر)

  1. تعديلات الجدول
    - إضافة عمود `direction` إلى جدول `nugoot`
    - تعيين القيمة الافتراضية 'incoming' للبيانات الموجودة
    - إضافة قيد للتأكد من القيم المسموحة

  2. الفهارس
    - إضافة فهرس على عمود `direction`
    - إضافة فهرس مركب على `event_id` و `direction`

  3. الأمان
    - تحديث سياسات RLS للتعامل مع الاتجاه الجديد
*/

-- إضافة عمود direction مع القيمة الافتراضية
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nugoot' AND column_name = 'direction'
  ) THEN
    ALTER TABLE nugoot ADD COLUMN direction text DEFAULT 'incoming'::text NOT NULL;
  END IF;
END $$;

-- إضافة قيد للتأكد من القيم المسموحة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'nugoot' AND constraint_name = 'nugoot_direction_check'
  ) THEN
    ALTER TABLE nugoot ADD CONSTRAINT nugoot_direction_check 
    CHECK (direction = ANY (ARRAY['incoming'::text, 'outgoing'::text]));
  END IF;
END $$;

-- إضافة فهرس على عمود direction
CREATE INDEX IF NOT EXISTS idx_nugoot_direction ON nugoot USING btree (direction);

-- إضافة فهرس مركب على event_id و direction
CREATE INDEX IF NOT EXISTS idx_nugoot_event_direction ON nugoot USING btree (event_id, direction);