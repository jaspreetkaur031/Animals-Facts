const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { spawn } = require('child_process');

// --- YOUR VAULTFLOW CONFIGURATION ---
const SUPABASE_URL = 'https://ovwwdejrofvpsieutnsw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_K9_BPI6eruZ9PNY9JJZ7Mg_4yTd7NhH';

// In production, this should be an environment variable: process.env.MASTER_PASSPHRASE
const MASTER_PASSPHRASE = 'sm2-demo-master-passphrase';

const PROJECT_ID = 'b79ebf97-565b-4d93-958e-482363bd6321';
const ENVIRONMENT_ID = 'c075d901-453e-491b-99bb-4fbb1a1fbc4a';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Decrypts a stored secret string using standard PBKDF2 and AES-256-GCM.
 * The "Bug Replication Hack" has been removed for a clean presentation.
 */
// async function decryptSecret(encryptedData, passphrase) {
//     const [saltStr, ivStr, cipherStr] = encryptedData.split(':');

//     const saltBuffer = Buffer.from(saltStr, 'base64');
//     const iv = Buffer.from(ivStr, 'base64');
//     const ciphertext = Buffer.from(cipherStr, 'base64');

//     // Standard Key Derivation: Using the salt buffer directly as raw bytes
//     const keyMaterial = crypto.pbkdf2Sync(passphrase, saltBuffer, 100000, 32, 'sha256');

//     const decipher = crypto.createDecipheriv('aes-256-gcm', keyMaterial, iv);

//     const authTag = ciphertext.subarray(ciphertext.length - 16);
//     const data = ciphertext.subarray(0, ciphertext.length - 16);

//     decipher.setAuthTag(authTag);

//     let decrypted = decipher.update(data);
//     let finalBuffer = Buffer.concat([decrypted, decipher.final()]);

//     return finalBuffer.toString('utf8');
// }


async function decryptSecret(encryptedData, passphrase) {
    const [saltStr, ivStr, cipherStr] = encryptedData.split(':');

    // Convert Base64 strings back to Buffers
    const saltBuffer = Buffer.from(saltStr, 'base64');
    const ivBuffer = Buffer.from(ivStr, 'base64');
    const fullCiphertextBuffer = Buffer.from(cipherStr, 'base64');

    // 1. Derive the key using the exact same PBKDF2 parameters as the frontend
    const key = crypto.pbkdf2Sync(passphrase, saltBuffer, 100000, 32, 'sha256');

    // 2. Separate the Auth Tag (last 16 bytes) from the encrypted data
    const authTag = fullCiphertextBuffer.subarray(fullCiphertextBuffer.length - 16);
    const encryptedMessage = fullCiphertextBuffer.subarray(0, fullCiphertextBuffer.length - 16);

    // 3. Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
    decipher.setAuthTag(authTag);

    // 4. Decrypt
    let decrypted = decipher.update(encryptedMessage, 'binary', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

async function run() {
    console.log('🔒 VaultFlow Injector: Booting up...');

    // 1. Fetch encrypted secrets from Supabase
    const { data: secrets, error } = await supabase
        .from('secrets')
        .select('key_name, value')
        .eq('project_id', PROJECT_ID)
        .eq('environment_id', ENVIRONMENT_ID)
        .is('deleted_at', null);

    if (error) {
        console.error('❌ Failed to fetch secrets:', error.message);
        process.exit(1);
    }

    if (!secrets || secrets.length === 0) {
        console.error('⚠️ No secrets found for this environment!');
        process.exit(1);
    }

    console.log(`📦 Found ${secrets.length} secrets. Processing...`);

    // 2. Decrypt and inject into process.env
    const injectedEnv = { ...process.env };

    for (const secret of secrets) {
        try {
            let finalValue = secret.value;

            if (secret.value.includes(':') && secret.value.split(':').length === 3) {
                finalValue = await decryptSecret(secret.value, MASTER_PASSPHRASE);
                console.log(`   ✅ Decrypted & Injected: ${secret.key_name}`);
            } else {
                console.log(`   ⚠️ Injected Plain Text: ${secret.key_name}`);
            }

            injectedEnv[secret.key_name] = finalValue;
        } catch (err) {
            console.error(`   ❌ Failed to decrypt ${secret.key_name}. Reason: ${err.message}`);
        }
    }

    // 3. Start the actual server with the new secrets!
    console.log('🚀 Starting target application...\n-----------------------------------');

    const targetApp = spawn('node', ['server.js'], {
        env: injectedEnv,
        stdio: 'inherit'
    });

    targetApp.on('spawn', () => {
        console.log('\n  🐾 Animal Project is running at:');
        console.log('  ➜  Local:   http://localhost:3000/api/status\n');
    });
}

run();