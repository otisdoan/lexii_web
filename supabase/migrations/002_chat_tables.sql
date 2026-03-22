-- ============================================================
-- Chat tables for Support / Phản hồi & Hỗ trợ
-- ============================================================

-- Each row = one 1:1 conversation between a user and the admin
CREATE TABLE IF NOT EXISTS chat_conversations (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  last_message_sender VARCHAR(10), -- 'user' | 'admin'
  unread_user_count  INT     DEFAULT 0,  -- messages admin sent that user hasn't read
  unread_admin_count INT     DEFAULT 0,  -- messages user sent that admin hasn't read
  is_resolved BOOLEAN  DEFAULT FALSE,
  CONSTRAINT one_conversation_per_user UNIQUE (user_id)
);

-- All messages in a conversation
CREATE TABLE IF NOT EXISTS chat_messages (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID       NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role    VARCHAR(10) NOT NULL CHECK (sender_role IN ('user', 'admin', 'system')),
  content        TEXT        NOT NULL,
  is_read        BOOLEAN     DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS chat_messages_conv_idx   ON chat_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS chat_conv_user_idx       ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS chat_conv_admin_idx      ON chat_conversations(admin_id);
CREATE INDEX IF NOT EXISTS chat_conv_updated_idx    ON chat_conversations(last_message_at DESC);

-- RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages      ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own conversation and messages
CREATE POLICY "Users manage own conversation" ON chat_conversations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users read own messages" ON chat_messages
  FOR SELECT USING (sender_id = auth.uid() OR EXISTS (
    SELECT 1 FROM chat_conversations WHERE id = chat_messages.conversation_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users insert own messages" ON chat_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users update own messages read status" ON chat_messages
  FOR UPDATE USING (sender_id = auth.uid() OR EXISTS (
    SELECT 1 FROM chat_conversations WHERE id = chat_messages.conversation_id AND user_id = auth.uid()
  ));

-- Admins can read all conversations and messages
CREATE POLICY "Admins read all conversations" ON chat_conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins manage all conversations" ON chat_conversations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins read all messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins insert messages" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins update messages" ON chat_messages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Helper functions
-- ============================================================

-- When a new message is inserted, update the conversation's last_message fields
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
  v_conv chat_conversations%ROWTYPE;
  v_is_admin BOOLEAN;
BEGIN
  SELECT * INTO v_conv FROM chat_conversations WHERE id = NEW.conversation_id;

  -- Check if sender is admin
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = NEW.sender_id AND role = 'admin') INTO v_is_admin;

  IF v_is_admin THEN
    UPDATE chat_conversations
    SET
      last_message_at       = NEW.created_at,
      last_message_preview  = LEFT(NEW.content, 100),
      last_message_sender   = 'admin',
      unread_user_count     = unread_user_count + 1
    WHERE id = NEW.conversation_id;
  ELSE
    UPDATE chat_conversations
    SET
      last_message_at       = NEW.created_at,
      last_message_preview  = LEFT(NEW.content, 100),
      last_message_sender   = 'user',
      unread_admin_count     = unread_admin_count + 1
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_conv_on_message ON chat_messages;
CREATE TRIGGER trigger_update_conv_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- When admin marks messages as read, reset counters
CREATE OR REPLACE FUNCTION mark_admin_read(conv_id UUID, reader_id UUID)
RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE id = reader_id AND role = 'admin') THEN
    UPDATE chat_messages SET is_read = TRUE
    WHERE conversation_id = conv_id AND sender_role = 'user' AND is_read = FALSE;
    UPDATE chat_conversations SET unread_admin_count = 0 WHERE id = conv_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_user_read(conv_id UUID, reader_id UUID)
RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM chat_conversations WHERE id = conv_id AND user_id = reader_id) THEN
    UPDATE chat_messages SET is_read = TRUE
    WHERE conversation_id = conv_id AND sender_role = 'admin' AND is_read = FALSE;
    UPDATE chat_conversations SET unread_user_count = 0 WHERE id = conv_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
