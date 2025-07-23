/*
  # إضافة النقوط الصادر العالمي وميزة تتبع الرد

  1. تعديلات الجدول
    - جعل `event_id` قابل للقيمة الفارغة للنقوط الصادر العالمي
    - إضافة عمود `reciprocated_at` لتتبع تاريخ الرد

  2. الفهارس
    - إضافة فهارس لتحسين الأداء

  3. الأمان
    - تحديث سياسات RLS للتعامل مع النقوط الصادر العالمي
*/

-- جعل event_id قابل للقيمة الفارغة
ALTER TABLE nugoot ALTER COLUMN event_id DROP NOT NULL;

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

-- إضافة فهرس لـ reciprocated_at
CREATE INDEX IF NOT EXISTS idx_nugoot_reciprocated_at ON nugoot(reciprocated_at);

-- إضافة فهرس مركب للبحث عن النقوط الواردة حسب الاسم
CREATE INDEX IF NOT EXISTS idx_nugoot_direction_name ON nugoot(direction, name);

-- تحديث سياسات RLS للتعامل مع النقوط الصادر العالمي
DROP POLICY IF EXISTS "Users can insert own nugoot" ON nugoot;
CREATE POLICY "Users can insert own nugoot"
  ON nugoot
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own nugoot" ON nugoot;
CREATE POLICY "Users can update own nugoot"
  ON nugoot
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own nugoot" ON nugoot;
CREATE POLICY "Users can delete own nugoot"
  ON nugoot
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own nugoot" ON nugoot;
CREATE POLICY "Users can read own nugoot"
  ON nugoot
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);