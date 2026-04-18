-- Runs after load-data.sh (alphabetic order in docker-entrypoint-initdb.d).
-- Patches rows that still have empty definitions (e.g. DB restored from old CSV).
-- Safe on fresh installs: updates 0 rows if vocabulary.csv already filled.

UPDATE vocabulary SET definition = 'to be equal to something in meaning, importance, or effect; especially to amount to'
WHERE vocabulary_id = 215 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'to be formed from the things or people mentioned; to consist of/in'
WHERE vocabulary_id = 1046 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'allowed by or in accordance with a constitution'
WHERE vocabulary_id = 1057 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'opposite in nature, direction, or meaning; completely different'
WHERE vocabulary_id = 1089 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'to prevent somebody from having something they need or want'
WHERE vocabulary_id = 1369 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'to obtain a quality, feeling, etc. from something; to come from a source'
WHERE vocabulary_id = 1372 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'to give a lot of your time, energy, attention, etc. to somebody/something'
WHERE vocabulary_id = 1412 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'the number 8'
WHERE vocabulary_id = 1645 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'the number 18'
WHERE vocabulary_id = 1646 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'the number 80'
WHERE vocabulary_id = 1647 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'a person who makes films, especially as a job'
WHERE vocabulary_id = 2002 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'the number 40'
WHERE vocabulary_id = 2116 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'the number 4'
WHERE vocabulary_id = 2125 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'the number 14'
WHERE vocabulary_id = 2126 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'the process by which countries and economies around the world become more connected and interdependent'
WHERE vocabulary_id = 2234 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'a building with glass walls and a glass roof, used for growing plants that need protection from the weather'
WHERE vocabulary_id = 2283 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'the basic systems and services such as transport, power, water, and communications that a country or organization uses'
WHERE vocabulary_id = 2596 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'a chemical element (symbol Pb), a heavy soft grey metal; or the position ahead of others in a race or group'
WHERE vocabulary_id = 2842 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'connected with soldiers, war, or fighting'
WHERE vocabulary_id = 3077 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'the number 19'
WHERE vocabulary_id = 3350 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'a shallow metal container used for cooking food on a cooker'
WHERE vocabulary_id = 3583 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'an amount of money paid regularly by a government or company to a person who has retired or is unable to work'
WHERE vocabulary_id = 3653 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'to treat raw material, food, etc. in order to prepare it for use; to deal with documents, requests, etc. officially'
WHERE vocabulary_id = 3914 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'to need or depend on somebody/something'
WHERE vocabulary_id = 4188 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'a line of things or people next to each other; a line of seats in a theatre, plane, etc.'
WHERE vocabulary_id = 4357 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'used in for the sake of to mean for the good or benefit of somebody/something'
WHERE vocabulary_id = 4390 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'the number 17'
WHERE vocabulary_id = 4513 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'the number 70'
WHERE vocabulary_id = 4514 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'the number 16'
WHERE vocabulary_id = 4623 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'the number 60'
WHERE vocabulary_id = 4624 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'to send somebody a written message using a mobile phone'
WHERE vocabulary_id = 5104 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'the number 13'
WHERE vocabulary_id = 5146 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'the number 30'
WHERE vocabulary_id = 5147 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'used to refer to a particular person, thing, or situation that is close to you or happening now'
WHERE vocabulary_id = 5150 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'the number 20'
WHERE vocabulary_id = 5320 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'on; used in more formal language with the same meaning as on in many phrasal verbs'
WHERE vocabulary_id = 5389 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'air moving across the surface of the Earth as a result of natural forces'
WHERE vocabulary_id = 5611 AND NULLIF(TRIM(definition), '') IS NULL;

UPDATE vocabulary SET definition = 'used to show that you agree with something or accept what somebody says (informal)'
WHERE vocabulary_id = 5681 AND NULLIF(TRIM(definition), '') IS NULL;

DELETE FROM familiarity WHERE word_id = 5700;
DELETE FROM vocabulary WHERE vocabulary_id = 5700 AND NULLIF(TRIM(word), '') IS NULL;
