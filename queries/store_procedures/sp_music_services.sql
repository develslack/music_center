DELIMITER //

CREATE PROCEDURE sp_insertar_music(
    IN p_album_year VARCHAR(4),
    IN p_album_name VARCHAR(200),
    IN p_album_artist VARCHAR(200),
    IN p_album_genre VARCHAR(100),
    IN p_album_art VARCHAR(200),
    IN p_album_bio VARCHAR(200),
    IN p_album_path VARCHAR(200)
)
BEGIN
    INSERT INTO mc_music (album_year, album_name, album_artist, album_genre, album_art, album_bio, album_path)
    VALUES (album_year, p_album_name, p_album_artist, p_album_genre, p_album_art, p_album_bio, p_album_path);
    SELECT LAST_INSERT_ID() AS nuevo_id;
END //

CREATE PROCEDURE sp_editar_music(
    IN p_id INT,
    IN p_album_year VARCHAR(4),
    IN p_album_name VARCHAR(200),
    IN p_album_artist VARCHAR(200),
    IN p_album_genre VARCHAR(100),
    IN p_album_art VARCHAR(200),
    IN p_album_bio VARCHAR(200),
    IN p_album_path VARCHAR(200)
)
BEGIN
    UPDATE mc_music
    SET album_year = p_album_year, album_name = p_album_name, album_artist = p_album_artist, album_genre = p_album_genre, album_art = p_album_art, album_bio = p_album_bio, album_path = p_album_path
    WHERE id = p_id;
END //

DELIMITER ;
