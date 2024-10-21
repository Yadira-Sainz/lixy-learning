-- Create the languages table first
CREATE TABLE IF NOT exists languages (
    language_id SERIAL PRIMARY KEY,
    language_name VARCHAR(50) NOT NULL
);

-- Insert initial languages
INSERT INTO languages (language_name) VALUES ('English');
INSERT INTO languages (language_name) VALUES ('Spanish');
INSERT INTO languages (language_name) VALUES ('French');

-- Create the users table
CREATE TABLE IF NOT exists users (
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
CREATE TABLE IF NOT exists user_logins (
    login_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    login_date DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT exists categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL
);

-- Insertar las categorías iniciales en la tabla 'categories'
INSERT INTO categories (category_name)
VALUES
('Family'),
('Work/Business'),
('Education'),
('Food'),
('Travel/Places'),
('Health'),
('Hobbies/Leisure'),
('Nature/Environment'),
('Technology'),
('Grammar/Function Word');

-- Create the categories table first
CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL
);

-- Create the vocabulary table
CREATE TABLE IF NOT EXISTS vocabulary (
    vocabulary_id SERIAL PRIMARY KEY,
    word VARCHAR(255) NOT NULL,
    type VARCHAR(255),
    cefr VARCHAR(10),
    definition TEXT,
    example TEXT,
    category_id INT,  -- Foreign key referencing 'categories'
    image_url TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Familiarity_levels
CREATE TABLE IF NOT EXISTS familiarity_levels (
    familiarity_level_id SERIAL PRIMARY KEY,
    familiarity_name VARCHAR(50) NOT NULL
);

-- Insertar los niveles de familiaridad
INSERT INTO familiarity_levels (familiarity_name) 
VALUES ('New'), ('Recognized'), ('Familiar'), ('Learned'), ('Known');

-- Create the familiarity table
CREATE TABLE IF NOT EXISTS familiarity (
    familiarity_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    word_id INT NOT NULL,
    familiarity_level_id INT NOT NULL, -- Referencia a la tabla de niveles de familiaridad
    correct_answers INT DEFAULT 0,
    incorrect_answers INT DEFAULT 0,
    last_reviewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    next_review_date TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (word_id) REFERENCES vocabulary(vocabulary_id),
    FOREIGN KEY (familiarity_level_id) REFERENCES familiarity_levels(familiarity_level_id)
);
