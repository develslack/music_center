DELIMITER //

CREATE PROCEDURE sp_insertar_genre(
    IN p_genre VARCHAR(100)
)
BEGIN
    INSERT INTO mc_genre (genre)
    VALUES (genre);
    SELECT LAST_INSERT_ID() AS nuevo_id;
END //

CREATE PROCEDURE sp_editar_genre(
    IN p_id INT,
    IN p_genre VARCHAR(100)
)
BEGIN
    UPDATE mc_genre
    SET genre = p_genre
    WHERE id = p_id;
END //

DELIMITER ;
