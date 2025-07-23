/*
  # إزالة ميزة رد النقوط

  1. تغييرات قاعدة البيانات
    - إزالة عمود `reciprocation_date` من جدول `nugoot`
    - إزالة الفهرس المرتبط بهذا العمود

  2. تنظيف البيانات
    - إزالة جميع البيانات المتعلقة برد النقوط
*/

-- إزالة الفهرس إذا كان موجوداً
DROP INDEX IF EXISTS idx_nugoot_reciprocation_date;

-- إزالة عمود reciprocation_date
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nugoot' AND column_name = 'reciprocation_date'
  ) THEN
    ALTER TABLE nugoot DROP COLUMN reciprocation_date;
  END IF;
END $$;