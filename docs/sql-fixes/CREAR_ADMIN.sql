-- Crea un usuario administrador por defecto
-- Puedes cambiar el email y password si quieres

INSERT INTO admins (email, password, name, role)
VALUES ('admin@suma.com', 'admin123', 'Super Admin', 'admin');
