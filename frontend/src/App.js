import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [words, setWords] = useState([]);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const backendHost = process.env.REACT_APP_BACKEND_HOST;

  const fetchWords = async () => {
    try {
      const response = await axios.get('http://' + backendHost + ':5000/api/english/most-used-words');
      const wordsArray = response.data.split(',').map(word => word.trim()).filter(word => word !== ''); // Split the response into an array of words
      setWords(wordsArray);
      setShowFlashcards(true);
    } catch (error) {
      console.error('Error fetching words:', error);
    }
  };

  return (
    <div className="App">
      <h1>100 Most Used Words</h1>
      <button onClick={fetchWords} className="fetch-button">Show</button>
      {showFlashcards && (
        <div className="flashcards-container">
          {words.map((word, index) => (
            <div className="flashcard" key={index}>
              <div className="flashcard-content">
                {word}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;