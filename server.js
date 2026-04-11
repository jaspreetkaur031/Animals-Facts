const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const app = express();

// --- VAULTFLOW CONFIGURATION ---
const SUPABASE_URL = 'https://ovwwdejrofvpsieutnsw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_K9_BPI6eruZ9PNY9JJZ7Mg_4yTd7NhH';
const MASTER_PASSPHRASE = 'sm2-demo-master-passphrase';
const PROJECT_ID = 'b79ebf97-565b-4d93-958e-482363bd6321';
const ENVIRONMENT_ID = 'c075d901-453e-491b-99bb-4fbb1a1fbc4a';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let secretsInjected = false;

// Decryption function with the Bug Replication Hack
async function decryptSecret(encryptedData, passphrase) {
    const [saltStr, ivStr, cipherStr] = encryptedData.split(':');
    const saltBuffer = Buffer.from(saltStr, 'base64');
    const iv = Buffer.from(ivStr, 'base64');
    const ciphertext = Buffer.from(cipherStr, 'base64');

    const buggySaltString = saltBuffer.join(',');
    const actualSaltUsed = Buffer.from(buggySaltString, 'utf8');

    const keyMaterial = crypto.pbkdf2Sync(passphrase, actualSaltUsed, 100000, 32, 'sha256');
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyMaterial, iv);

    const authTag = ciphertext.subarray(ciphertext.length - 16);
    const data = ciphertext.subarray(0, ciphertext.length - 16);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(data);
    let finalBuffer = Buffer.concat([decrypted, decipher.final()]);

    return finalBuffer.toString('utf8');
}

// Injector Logic
async function injectVaultFlowSecrets() {
    if (secretsInjected) return; // Only run on cold starts

    console.log('🔒 VaultFlow Injector: Booting up...');
    const { data: secrets, error } = await supabase
        .from('secrets')
        .select('key_name, value')
        .eq('project_id', PROJECT_ID)
        .eq('environment_id', ENVIRONMENT_ID)
        .is('deleted_at', null);

    if (error || !secrets || secrets.length === 0) {
        throw new Error('Failed to fetch secrets or no secrets found.');
    }

    for (const secret of secrets) {
        let finalValue = secret.value;
        if (secret.value.includes(':') && secret.value.split(':').length === 3) {
            finalValue = await decryptSecret(secret.value, MASTER_PASSPHRASE);
        }
        process.env[secret.key_name] = finalValue;
    }
    secretsInjected = true;
    console.log('✅ VaultFlow Secrets Injected successfully!');
}

// 1. Serverless Middleware: Ensure secrets are loaded before hitting any routes
app.use(async (req, res, next) => {
    try {
        await injectVaultFlowSecrets();
        next();
    } catch (err) {
        console.error("🚨 CRITICAL FAILURE:", err.message);
        res.status(500).json({ error: "VaultFlow Injection Failed", details: err.message });
    }
});

// 2. Serve the HTML dashboard
app.use(express.static(path.join(__dirname, 'public')));

// 3. API Endpoint
app.get('/api/status', async (req, res) => {
    const mongoUri = process.env.MONGO_URI;
    const apiKey = process.env.ANIMAL_API_KEY;

    // Connect to MongoDB on-the-fly for serverless if not already connected
    if (mongoose.connection.readyState !== 1 && mongoUri) {
        await mongoose.connect(mongoUri).catch(err => console.error("MongoDB error", err));
    }

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
        apiKeyStatus: apiKey ? `Authenticated (${apiKey.substring(0, 4)}••••••••)` : 'Missing 🔴',
        fact: animalFacts[Math.floor(Math.random() * animalFacts.length)]
    });
});

// Export the app for Vercel's serverless environment
module.exports = app;