-- Create the users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the login_attempts table
CREATE TABLE loginAttempts (
    attempt_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Crear la tabla de Idiomas
CREATE TABLE Language (
    Language_id SERIAL PRIMARY KEY,
    Language_name VARCHAR(50) NOT NULL,
);

-- Crear la tabla de Palabras
CREATE TABLE Word (
    Word_id SERIAL PRIMARY KEY,
    Word VARCHAR(100) NOT NULL,
    Word_meaning TEXT 
);

-- Crear la tabla de Oraciones
CREATE TABLE Sentences (
    Sentence_id SERIAL PRIMARY KEY,
    Sentence VARCHAR(255) NOT NULL
);

-- Crear la tabla de Temas
CREATE TABLE Themes (
    Theme_id SERIAL PRIMARY KEY,
    Theme_name VARCHAR(50) NOT NULL
);

-- Crear la tabla de Partes del Habla
CREATE TABLE PartsOfSpeech (
    Part_Speech_id SERIAL PRIMARY KEY,
    Part_name VARCHAR(50) NOT NULL
);

-- Crear la tabla de AudioPalabras
CREATE TABLE AudioWords (
    Audio_word_id SERIAL PRIMARY KEY,
    FileURL VARCHAR(255) NOT NULL
);

-- Crear la tabla de AudioOraciones
CREATE TABLE AudioSentences (
    Audio_sentence_id SERIAL PRIMARY KEY,
    FileURL VARCHAR(255) NOT NULL
);

-- Crear la tabla de Cuentos
CREATE TABLE Stories (
    Story_id SERIAL PRIMARY KEY,
    Title VARCHAR(255),
    Content TEXT,
    Theme_id INT,
    DifficultyLevel VARCHAR(50),
    FOREIGN KEY (Theme_id) REFERENCES Themes(Theme_id)
);

-- Crear la tabla de Traducciones de Cuentos
CREATE TABLE StoryTranslations (
    Story_translation_id SERIAL PRIMARY KEY,
    Story_id INT,
    Language_id INT,
    TranslatedContent TEXT,
    FOREIGN KEY (Story_id) REFERENCES Stories(Story_id),
    FOREIGN KEY (Language_id) REFERENCES Languages(Language_id)
);

-- Crear la tabla de Preguntas de Cuentos
CREATE TABLE StoryQuestions (
    Question_id SERIAL PRIMARY KEY,
    Story_id INT,
    Question_text TEXT,
    FOREIGN KEY (Story_id) REFERENCES Stories(Story_id)
);

-- Crear la tabla de Opciones de Preguntas de Cuentos
CREATE TABLE StoryQuestionOptions (
    Option_id SERIAL PRIMARY KEY,
    Question_id INT,
    OptionText TEXT,
    FOREIGN KEY (Question_id) REFERENCES StoryQuestions(Question_id)
);
-- Crear la tabla de Progreso de Cuentos del Usuario
CREATE TABLE UserStoryProgress (
    User_story_progress_id SERIAL PRIMARY KEY,
    User_id INT,
    Story_id INT,
    Read_count INT,
    Last_read_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Comprehension_score DECIMAL(5, 2),
    FOREIGN KEY (User_id) REFERENCES Users(User_id),
    FOREIGN KEY (Story_id) REFERENCES Stories(Story_id)
);

-- Crear la tabla de Flashcards
CREATE TABLE Flashcards (
    Flashcard_id SERIAL PRIMARY KEY,
    Word_id INT,
    Sentence_id INT,
    Theme_id INT,
    Part_Speech_id INT,
    Audio_word_id INT,
    Audio_sentence_id INT,
    FOREIGN KEY (Word_id) REFERENCES Words(Word_id),
    FOREIGN KEY (Sentence_id) REFERENCES Sentences(Sentence_id),
    FOREIGN KEY (Theme_id) REFERENCES Themes(Theme_id),
    FOREIGN KEY (Part_Speech_id) REFERENCES PartsOfSpeech(Part_Speech_id),
    FOREIGN KEY (Audio_word_id) REFERENCES AudioWords(Audio_word_id),
    FOREIGN KEY (Audio_sentence_id) REFERENCES AudioSentences(Audio_sentence_id)
);

-- Crear la tabla de Traducciones de Flashcards
CREATE TABLE FlashcardTranslations (
    Translation_id SERIAL PRIMARY KEY,
    Flashcard_id INT,
    Language_id INT,
    Translated_sentence TEXT,
    FOREIGN KEY (Flashcard_id) REFERENCES Flashcards(FlashcaFlashcard_id),
    FOREIGN KEY (Language_id) REFERENCES Languages(Language_id)
);

-- Crear la tabla de Progreso de Flashcards del Usuario
CREATE TABLE UserFlashcardProgress (
    User_flashcard_progress_id SERIAL PRIMARY KEY,
    User_id INT,
    Flashcard_id INT,
    First_Learning_Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Last_Review_Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    Review_Count INT,
    Correct_Responses INT,
    Incorrect_Responses INT,
    Familiarity_Score DECIMAL(5, 2),
    Next_DueDate DATE,
    Retention_Rate DECIMAL(5, 2),
    FOREIGN KEY (User_id) REFERENCES Users(User_id),
    FOREIGN KEY (Flashcard_id) REFERENCES Flashcards(Flashcard_id)
);

-- Create the user_progress table
CREATE TABLE userProgress (
    progress_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    User_flashcard_progress_id INT NOT NULL,
    User_story_progress_id INT NOT NULL,
    language VARCHAR(50) NOT NULL,
    level VARCHAR(50) NOT NULL,
    progress_percentage DECIMAL(5, 2) NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (User_flashcard_progress_id) REFERENCES UserFlashcardProgress(User_flashcard_progress_id),
    FOREIGN KEY (User_story_progress_id) REFERENCES UserStoryProgress(User_story_progress_id)
);
