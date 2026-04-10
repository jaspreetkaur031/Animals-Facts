const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// 1. Grab our secrets from the environment
const mongoUri = process.env.MONGO_URI;
const apiKey = process.env.ANIMAL_API_KEY;

// 2. Critical Failure Check
if (!mongoUri || !apiKey) {
    console.error("🚨 CRITICAL FAILURE 🚨: Secrets are missing!");
    console.error("I need MONGO_URI and ANIMAL_API_KEY to run. Please start me using the VaultFlow injector.");
    process.exit(1);
}

// 3. Try to connect to MongoDB using the secret URI
mongoose.connect(mongoUri)
    .then(() => console.log("🟢 Successfully connected to MongoDB!"))
    .catch(err => console.error("🔴 MongoDB connection error (Expected in demo mode)"));

// 4. ✨ THE FIX: Serve the HTML dashboard from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// 5. ✨ THE FIX: Move the JSON response to an API endpoint
app.get('/api/status', (req, res) => {
    const animalFacts = [
        "Sea otters hold hands while they sleep so they don't drift apart.",
        "Red pandas use their bushy tails as a blanket to keep warm.",
        "Quokkas are known as the happiest animals on Earth! 🦘",
        "A group of flamingos is called a 'flamboyance'. 🦩",
        "Baby elephants suck their trunks for comfort, just like humans suck their thumbs! 🐘"
    ];

    res.json({
        appStatus: "Active",
        message: "Secrets successfully injected via VaultFlow",
        databaseUrl: mongoUri,
        databaseState: mongoose.connection.readyState === 1 ? 'Connected 🟢' : 'Disconnected 🔴',
        apiKeyStatus: `Authenticated (${apiKey.substring(0, 4)}••••••••)`,
        fact: animalFacts[Math.floor(Math.random() * animalFacts.length)]
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🐾 Cute Animal Server running on http://localhost:${PORT}`);
});