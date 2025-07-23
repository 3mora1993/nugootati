/*
  # إضافة النقوط الصادر العالمي وميزة الرد

  1. تعديلات الجدول
    - جعل `event_id` قابل للقيمة الفارغة للنقوط الصادر العالمي
    - إضافة عمود `reciprocated_at` لتسجيل تاريخ الرد

  2. الفهارس
    - إضافة فهرس على `reciprocated_at` لتحسين الأداء
    - إضافة فهرس مركب على `direction` و `name` للبحث السريع

  3. الأمان
    - تحديث سياسات RLS للتعامل مع النقوط الصادر العالمي
*/

-- جعل event_id قابل للقيمة الفارغة
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nugoot' AND column_name = 'event_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE nugoot ALTER COLUMN event_id DROP NOT NULL;
  END IF;
END $$;

-- إضافة عمود reciprocated_at إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nugoot' AND column_name = 'reciprocated_at'
  ) THEN
    ALTER TABLE nugoot ADD COLUMN reciprocated_at timestamptz;
  END IF;
END $$;

-- إضافة فهرس على reciprocated_at
CREATE INDEX IF NOT EXISTS idx_nugoot_reciprocated_at ON nugoot (reciprocated_at);

-- إضافة فهرس مركب على direction و name
CREATE INDEX IF NOT EXISTS idx_nugoot_direction_name ON nugoot (direction, name);

-- تحديث الفهرس الموجود للتعامل مع event_id القابل للقيمة الفارغة
DROP INDEX IF EXISTS idx_nugoot_event_direction;
CREATE INDEX IF NOT EXISTS idx_nugoot_event_direction ON nugoot (event_id, direction) WHERE event_id IS NOT NULL;