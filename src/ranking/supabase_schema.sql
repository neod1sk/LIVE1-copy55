-- 0. 既存のテーブルと関数を削除（リセット）
DROP TABLE IF EXISTS rankings CASCADE;
DROP FUNCTION IF EXISTS delete_ranking;

-- 1. ランキングテーブルの作成
CREATE TABLE rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  nickname TEXT NOT NULL,
  x_id TEXT,
  score INTEGER NOT NULL,
  secret_key TEXT DEFAULT gen_random_uuid()::text -- 削除用の秘密鍵
);

-- 2. RLS（行レベルセキュリティ）の有効化
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;

-- 3. 権限の設定（重要：秘密鍵を守るため）
-- まずanonロールの既定の権限を整理
REVOKE ALL ON rankings FROM anon;
GRANT INSERT (nickname, x_id, score, secret_key) ON rankings TO anon;
GRANT SELECT (id, nickname, x_id, score) ON rankings TO anon;

-- 4. ポリシーの設定

-- 誰でもランキングを参照可能（カラム権限でsecret_keyは隠される）
CREATE POLICY "Enable read access for all users" ON rankings
  FOR SELECT USING (true);

-- 誰でもスコアを登録可能
CREATE POLICY "Enable insert for all users" ON rankings
  FOR INSERT WITH CHECK (true);

-- 直接の削除は禁止
CREATE POLICY "Disable direct delete" ON rankings
  FOR DELETE USING (false);

-- 5. 安全な削除用の関数（RPC）
-- IDと秘密鍵が一致する場合のみ削除を行う
CREATE OR REPLACE FUNCTION delete_ranking(target_id UUID, secret TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM rankings
  WHERE id = target_id AND secret_key = secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPCの実行権限を付与
GRANT EXECUTE ON FUNCTION delete_ranking TO anon;
