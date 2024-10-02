-- Create the languages table first
CREATE TABLE languages (
    language_id SERIAL PRIMARY KEY,
    language_name VARCHAR(50) NOT NULL
);

-- Insert initial languages
INSERT INTO languages (language_name) VALUES ('English');
INSERT INTO languages (language_name) VALUES ('Spanish');
INSERT INTO languages (language_name) VALUES ('French');

-- Create the users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    age INT,
    gender VARCHAR(10),
    country VARCHAR(100),
    native_language_id INT,
    learning_language_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (native_language_id) REFERENCES languages(language_id),
    FOREIGN KEY (learning_language_id) REFERENCES languages(language_id)
);

-- Create the user_logins table
CREATE TABLE user_logins (
    login_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    login_date DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
