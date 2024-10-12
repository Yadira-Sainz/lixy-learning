const express = require('express');
const axios = require('axios');
const pool = require('./db'); 

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

app.post('/generate-image', async (req, res) => {
    const {  vocabulary_id, negative_prompt, samples, quality, guidance_scale, aspect_ratio, style } = req.body;
    if (!vocabulary_id) {
        return res.status(400).json({ error: 'El campo "vocabulary_id" es obligatorio.' });
    }
    try {
         // Realiza una consulta para obtener la definición de la tabla vocabulary basada en el vocabularyId proporcionado
         const result = await pool.query('SELECT id, word, definition FROM vocabulary WHERE id = $1', [vocabulary_id]);

         if (result.rows.length === 0) {
             return res.status(404).json({ error: 'Palabra no encontrada en la base de datos.' });
         }
 
         const { word, definition } = result.rows[0];
 
         // Construye el prompt utilizando la definición obtenida
         const prompt = `Generate an image representing the word: ${word}. Definition: ${definition}`;
 
         // Crear el cuerpo de la solicitud para la API de LimeWire
         const requestBody = {
             prompt,
             negative_prompt: negative_prompt || '',
             samples: samples || 1,
             quality: quality || 'LOW',
             guidance_scale: guidance_scale || 50,
             aspect_ratio,
             style: style || 'PHOTOREALISTIC'
         };
 
         // Realizar la solicitud a la API de LimeWire
         const response = await axios.post(
             'https://api.limewire.com/api/image/generation',
             requestBody,
             {
                 headers: {
                     'Content-Type': 'application/json',
                     'X-Api-Version': 'v1',
                     'Accept': 'application/json',
                     'Authorization': `Bearer ${process.env.LIMEWIRE_API_KEY}`
                 }
             }
         );
 
         // Obtener la URL de la imagen generada
         const image_url = response.data.image_url;
 
         // Guarda la URL de la imagen en la base de datos
         await pool.query(
             'UPDATE vocabulary SET image_url = $1 WHERE id = $2',
             [image_url, vocabulary_id]
         );
 
         // Enviar la respuesta al cliente junto con la información actualizada
         res.status(200).json({
             message: 'Image generated and saved successfully',
             vocabulary_id,
             word,
             definition,
             image_url
         });
     } catch (error) {
         console.error('Error al generar la imagen:', error.message);
 
         if (error.response) {
             res.status(error.response.status).json({ 
                 error: error.response.data.message || 'Error en la solicitud a LimeWire.'
             });
         } else {
             res.status(500).json({ error: 'Error al comunicarse con la API de LimeWire.' });
         }
     }
 });

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});