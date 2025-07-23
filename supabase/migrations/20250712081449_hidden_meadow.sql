/*
  # إنشاء مخطط قاعدة البيانات لتطبيق نقوطاتي

  1. الجداول الجديدة
    - `events` (المناسبات)
      - `id` (uuid, primary key)
      - `name` (text, اسم المناسبة)
      - `type` (text, نوع المناسبة)
      - `date` (date, تاريخ المناسبة)
      - `user_id` (uuid, معرف المستخدم)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `nugoot` (النقوط)
      - `id` (uuid, primary key)
      - `event_id` (uuid, foreign key to events)
      - `name` (text, اسم الشخص)
      - `amount` (decimal, المبلغ)
      - `type` (text, نوع النقوط - cash/gift)
      - `gift_description` (text, وصف الهدية)
      - `notes` (text, ملاحظات)
      - `date` (date, التاريخ)
      - `user_id` (uuid, معرف المستخدم)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. الأمان
    - تفعيل RLS على جميع الجداول
    - إضافة سياسات للمستخدمين المصادق عليهم لقراءة وكتابة بياناتهم فقط

  3. الفهارس
    - فهرس على event_id في جدول nugoot
    - فهرس على user_id في كلا الجدولين
*/

-- إنشاء جدول المناسبات
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'عرس',
  date date NOT NULL DEFAULT CURRENT_DATE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول النقوط
CREATE TABLE IF NOT EXISTS nugoot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  amount decimal(10,3) DEFAULT 0,
  type text NOT NULL DEFAULT 'cash' CHECK (type IN ('cash', 'gift')),
  gift_description text DEFAULT '',
  notes text DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE nugoot ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للمناسبات
CREATE POLICY "Users can read own events"
  ON events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- سياسات الأمان للنقوط
CREATE POLICY "Users can read own nugoot"
  ON nugoot
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nugoot"
  ON nugoot
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nugoot"
  ON nugoot
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own nugoot"
  ON nugoot
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_nugoot_event_id ON nugoot(event_id);
CREATE INDEX IF NOT EXISTS idx_nugoot_user_id ON nugoot(user_id);
CREATE INDEX IF NOT EXISTS idx_nugoot_date ON nugoot(date);

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- إضافة triggers لتحديث updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nugoot_updated_at
  BEFORE UPDATE ON nugoot
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();