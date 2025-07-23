/*
  # إضافة خاصية رد النقوط

  1. تعديلات الجدول
    - إضافة عمود `reciprocation_date` إلى جدول `nugoot`
    - العمود يحتوي على تاريخ رد النقوط (nullable)

  2. الفهارس
    - إضافة فهرس على `reciprocation_date` لتحسين الأداء

  3. الأمان
    - لا حاجة لتعديل RLS policies حيث أن العمود الجديد يتبع نفس قواعد الأمان الموجودة
*/

-- إضافة عمود تاريخ رد النقوط
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nugoot' AND column_name = 'reciprocation_date'
  ) THEN
    ALTER TABLE nugoot ADD COLUMN reciprocation_date date;
  END IF;
END $$;

-- إضافة فهرس على تاريخ رد النقوط لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_nugoot_reciprocation_date ON nugoot(reciprocation_date);

-- إضافة تعليق على العمود الجديد
COMMENT ON COLUMN nugoot.reciprocation_date IS 'تاريخ رد النقوط - null يعني لم يتم الرد بعد';