-- Удаляем старые политики
DROP POLICY IF EXISTS "Allow all operations" ON favorites;
DROP POLICY IF EXISTS "Users can view their own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can insert their own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON favorites;

-- Создаем новые политики с правильными правами
-- Разрешаем всем читать (SELECT)
CREATE POLICY "Enable read access for all users"
ON favorites FOR SELECT
USING (true);

-- Разрешаем всем добавлять (INSERT)
CREATE POLICY "Enable insert access for all users"
ON favorites FOR INSERT
WITH CHECK (true);

-- Разрешаем всем удалять (DELETE)
CREATE POLICY "Enable delete access for all users"
ON favorites FOR DELETE
USING (true);

-- Разрешаем всем обновлять (UPDATE) - на всякий случай
CREATE POLICY "Enable update access for all users"
ON favorites FOR UPDATE
USING (true)
WITH CHECK (true);

-- ВАЖНО: Исправляем колонку created_at для автоматической установки времени
ALTER TABLE favorites 
ALTER COLUMN created_at SET DEFAULT NOW();
