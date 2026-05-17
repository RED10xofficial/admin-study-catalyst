-- Default admin: admin@example.com / Admin123! (run seed:generate to change; then yarn seed:remote)
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, membership_type, is_active, created_at, updated_at)
VALUES ('X8F3O5n90aOdUA5PIMJhU', 'Admin', 'admin@example.com', 'oR7xqpH/6jYGmCp8CZ/pXA==:ZsultmiHHZrZq2lcnsII9PtwbX3hCJkSUuw0tDkYOp0=', 'admin', 'normal', 1, '2026-05-03T04:23:22.256Z', '2026-05-03T04:23:22.256Z');
