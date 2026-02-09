-- FinSight Pro 用户表结构
-- 兼容现有硬编码用户 admin@example.com

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'analyst',
  permissions TEXT[] DEFAULT ARRAY['read', 'write'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- 插入5个用户账号
-- 注意：第一个用户保留为 admin@example.com 以兼容现有客户
-- 密码哈希使用 bcrypt 生成

-- 用户1: admin@example.com / admin123 (兼容现有用户)
INSERT INTO users (email, password_hash, name, role, permissions) VALUES
('admin@example.com', '$2a$10$rQEY7xzV8WxZqZqZqZqZqOzZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', 'Admin User', 'admin', ARRAY['read', 'write', 'delete', 'admin'])
ON CONFLICT (email) DO NOTHING;

-- 用户2-5: 分析师账号
INSERT INTO users (email, password_hash, name, role, permissions) VALUES
('analyst1@finsight.internal', '$2a$10$analyst1HashPlaceholder', 'Analyst One', 'analyst', ARRAY['read', 'write']),
('analyst2@finsight.internal', '$2a$10$analyst2HashPlaceholder', 'Analyst Two', 'analyst', ARRAY['read', 'write']),
('analyst3@finsight.internal', '$2a$10$analyst3HashPlaceholder', 'Analyst Three', 'analyst', ARRAY['read', 'write']),
('analyst4@finsight.internal', '$2a$10$analyst4HashPlaceholder', 'Analyst Four', 'analyst', ARRAY['read', 'write'])
ON CONFLICT (email) DO NOTHING;

-- 注意：实际部署时需要替换密码哈希为真实的 bcrypt 哈希值
-- 可以使用 Node.js 生成：
-- const bcrypt = require('bcryptjs');
-- const hash = await bcrypt.hash('password', 10);
