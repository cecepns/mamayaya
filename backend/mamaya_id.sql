CREATE DATABASE IF NOT EXISTS mamaya_id_db;
USE mamaya_id_db;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager') NOT NULL DEFAULT 'manager',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL DEFAULT 'buah',
  min_stock INT NOT NULL DEFAULT 0,
  initial_stock INT NOT NULL DEFAULT 0,
  current_stock INT NOT NULL DEFAULT 0,
  purchase_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  category VARCHAR(120) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incoming_goods (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL,
  quantity INT NOT NULL,
  purchase_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  reference_no VARCHAR(120) NULL,
  notes TEXT NULL,
  transaction_date DATE NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_by BIGINT NULL,
  approved_by BIGINT NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_incoming_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_incoming_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_incoming_approved_by
    FOREIGN KEY (approved_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS outgoing_goods (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL,
  quantity INT NOT NULL,
  reference_no VARCHAR(120) NULL,
  notes TEXT NULL,
  transaction_date DATE NOT NULL,
  purchase_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_outgoing_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS stock_batches (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL,
  source_type ENUM('initial', 'incoming') NOT NULL,
  incoming_goods_id BIGINT NULL,
  initial_qty INT NOT NULL DEFAULT 0,
  remaining_qty INT NOT NULL DEFAULT 0,
  purchase_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  batch_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_batches_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_stock_batches_incoming
    FOREIGN KEY (incoming_goods_id) REFERENCES incoming_goods(id)
    ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS outgoing_allocations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  outgoing_goods_id BIGINT NOT NULL,
  stock_batch_id BIGINT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  purchase_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_outgoing_alloc_outgoing
    FOREIGN KEY (outgoing_goods_id) REFERENCES outgoing_goods(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_outgoing_alloc_batch
    FOREIGN KEY (stock_batch_id) REFERENCES stock_batches(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  action VARCHAR(80) NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes_sheets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL DEFAULT 'Catatan Utama',
  columns_json LONGTEXT NOT NULL,
  rows_json LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_incoming_product_date ON incoming_goods(product_id, transaction_date);
CREATE INDEX idx_incoming_status ON incoming_goods(status);
CREATE INDEX idx_outgoing_product_date ON outgoing_goods(product_id, transaction_date);
CREATE UNIQUE INDEX uk_stock_batches_incoming_goods ON stock_batches(incoming_goods_id);
CREATE INDEX idx_stock_batches_product_fifo ON stock_batches(product_id, batch_date, id);
CREATE INDEX idx_stock_batches_product_id ON stock_batches(product_id);
CREATE INDEX idx_stock_batches_product_source ON stock_batches(product_id, source_type);
CREATE INDEX idx_outgoing_alloc_outgoing ON outgoing_allocations(outgoing_goods_id);
CREATE INDEX idx_outgoing_alloc_batch ON outgoing_allocations(stock_batch_id);
CREATE INDEX idx_activity_created_at ON activity_logs(created_at);
CREATE INDEX idx_notes_sheets_created_at ON notes_sheets(created_at);

-- Default notes sheet
INSERT INTO notes_sheets (name, columns_json, rows_json)
VALUES (
  'Catatan Utama',
  '["Data","Hutang","Total","Dead"]',
  '[]'
);

-- Sample users (password: admin12345 / manager12345)
INSERT INTO users (name, email, password, role, is_active) VALUES
(
  'Admin Mamaya',
  'admin@mamaya.id',
  '$2b$10$KYfoWSueZ/bKVnIU1rGEI.OgEvRIag3oZLPF/70VDJHgmYomJGDH6',
  'admin',
  1
),
(
  'Manager Mamaya',
  'manager@mamaya.id',
  '$2b$10$YMBJibfNvvAfIl6sS8aNXOtCLxS3QFa71OSyAsqtixQHQBEZ7FjVW',
  'manager',
  1
);
