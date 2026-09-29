DELIMITER //

CREATE PROCEDURE sp_obtener_todos_roles()
BEGIN
    SELECT id, descripcion FROM gls_roles;
END //

CREATE PROCEDURE sp_insertar_rol(
    IN p_descripcion VARCHAR(128)
)
BEGIN
    INSERT INTO gls_roles (descripcion)
    VALUES (p_descripcion);
    SELECT LAST_INSERT_ID() AS nuevo_id;
END //

CREATE PROCEDURE sp_editar_rol(
    IN p_id INT,
    IN p_descripcion VARCHAR(128)
)
BEGIN
    UPDATE gls_roles
    SET descripcion = p_descripcion
    WHERE id = p_id;
END //

DELIMITER ;
