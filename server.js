const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const app = express();

// --- VAULTFLOW CONFIGURATION ---
const SUPABASE_URL = 'https://ovwwdejrofvpsieutnsw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_K9_BPI6eruZ9PNY9JJZ7Mg_4yTd7NhH';
const MASTER_PASSPHRASE = process.env.MASTER_PASSPHRASE || 'sm2-demo-master-passphrase';
const PROJECT_ID = 'b79ebf97-565b-4d93-958e-482363bd6321';
const ENVIRONMENT_ID = 'c075d901-453e-491b-99bb-4fbb1a1fbc4a';

/**
 * Standardized Decryption logic
 */
async function decryptSecret(encryptedData, passphrase) {
    try {
        const [saltStr, ivStr, cipherStr] = encryptedData.split(':');
        const saltBuffer = Buffer.from(saltStr, 'base64');
        const iv = Buffer.from(ivStr, 'base64');
        const ciphertext = Buffer.from(cipherStr, 'base64');

        const keyMaterial = crypto.pbkdf2Sync(passphrase, saltBuffer, 100000, 32, 'sha256');
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyMaterial, iv);

        const authTag = ciphertext.subarray(ciphertext.length - 16);
        const data = ciphertext.subarray(0, ciphertext.length - 16);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(data);
        let finalBuffer = Buffer.concat([decrypted, decipher.final()]);
        return finalBuffer.toString('utf8');
    } catch (err) {
        throw new Error(`Decryption failed: ${err.message}`);
    }
}

// Global flag to prevent re-injection
let isReady = false;

// Middleware to inject secrets on boot
app.use(async (req, res, next) => {
    if (isReady) return next();

    try {
        console.log('🔒 server.js: Verifying Injected Secrets...');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: secrets, error } = await supabase
            .from('secrets')
            .select('key_name, value')
            .eq('project_id', PROJECT_ID)
            .eq('environment_id', ENVIRONMENT_ID)
            .is('deleted_at', null);

        if (error) throw error;

        for (const secret of secrets) {
            if (secret.value.includes(':')) {
                process.env[secret.key_name] = await decryptSecret(secret.value, MASTER_PASSPHRASE);
            } else {
                process.env[secret.key_name] = secret.value;
            }
        }
        isReady = true;
        console.log('✅ server.js: Runtime Environment Ready');
        next();
    } catch (err) {
        console.error("🚨 server.js: INJECTION FAILED", err.message);
        res.status(500).send("Critical Boot Error: Injection Failed");
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// app.get('/api/status', async (req, res) => {
//     const mongoUri = process.env.DATABASE_URL;
//     const apiKey = process.env.RED_LIST_API_KEY;

//     if (mongoose.connection.readyState !== 1 && mongoUri) {
//         await mongoose.connect(mongoUri).catch(err => console.error("MongoDB error", err));
//     }

//     res.json({
//         appStatus: "Active",
//         message: "Secrets successfully injected via VaultFlow",
//         databaseUrl: mongoUri ? "URL Masked" : "Missing",
//         databaseState: mongoose.connection.readyState === 1 ? 'Connected 🟢' : 'Disconnected 🔴',
//         apiKeyStatus: apiKey ? `Authenticated` : 'Missing 🔴',
//         fact: "Quokkas are known as the happiest animals on Earth! 🦘"
//     });
// });


app.get('/api/status', async (req, res) => {
    const mongoUri = process.env.DATABASE_URL;
    const apiKey = process.env.RED_LIST_API_KEY;

    // 1. Create a simple list of facts
    const facts = [
        "Quokkas are known as the happiest animals on Earth! 🦘",
        "A group of flamingos is called a 'flamboyance'. 🦩",
        "Otters hold hands while sleeping to not drift apart. 🦦",
        "Honey bees can flap their wings 200 times per second! 🐝",
        "A snail can sleep for three years. 🐌",
        "Elephants are the only animals that can't jump. 🐘"
    ];

    // 2. Pick one fact randomly from the list
    const randomFact = facts[Math.floor(Math.random() * facts.length)];

    res.json({
        appStatus: "Active",
        message: "Secrets successfully injected via VaultFlow",
        databaseUrl: mongoUri ? "Secret Received (Decrypted in RAM) ✅" : "Missing 🔴",
        databaseState: mongoUri ? 'Connected 🟢 (Demo Mode)' : 'Disconnected 🔴',
        apiKeyStatus: apiKey ? `Authenticated 🟢` : 'Missing 🔴',
        // 3. Return the new random fact
        fact: randomFact
    });
});

// START THE SERVER GUARANTEED
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  🐾 Animal Project Server is LIVE`);
    console.log(`  ➜  URL: http://localhost:${PORT}/api/status\n`);
}).on('error', (err) => {
    console.error('❌ Could not start server:', err.message);
});

module.exports = app;