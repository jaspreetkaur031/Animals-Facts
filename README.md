<div align="center">

# 🐾 Cute Animal API 

**A VaultFlow Integration Demo**

[![Node.js](https://img.shields.io/badge/Node.js-Backend-339933.svg?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-Server-000000.svg?style=for-the-badge&logo=express)](https://expressjs.com/)
[![VaultFlow](https://img.shields.io/badge/Secured_By-VaultFlow-646CFF.svg?style=for-the-badge)](https://github.com/yourusername/vaultflow)

<p>
  A functioning web server that consumes encrypted secrets completely dynamically. <b>Look closely: there is no <code>.env</code> file in this repository.</b>
</p>

</div>

---

## 🚀 About This Project

This project serves as the **Consumer Application Demo** for the VaultFlow Secrets Manager. It is a fully functional Node.js Express server with a built-in UI dashboard that fetches cute animal facts. 

However, instead of relying on insecure local `.env` files for its database URI and API keys, it uses the **VaultFlow Runtime Injector** to securely fetch, decrypt, and inject secrets directly into memory at boot time.

---

## ✨ Features

* 🚫 **Zero Local Secrets:** Absolutely no `.env` files, config maps, or hardcoded credentials.
* 💉 **Dynamic Runtime Injection:** Uses `vaultflow-inject.js` to securely pull AES-GCM encrypted secrets from the VaultFlow database and decrypt them locally in RAM.
* 🎨 **Interactive Dashboard:** A dark-mode, glassmorphism UI to visually verify that secrets were successfully injected and the API is authenticating properly.

---

## 🛠️ How to Run It Locally

### 1. Prerequisites
* [Node.js](https://nodejs.org/) installed on your machine.
* A running instance of the [VaultFlow Secrets Manager](https://github.com/yourusername/vaultflow) with an active project and environment.

### 2. Installation
Clone this repository and install the required dependencies (Express and Mongoose):

```bash
git clone [https://github.com/your-username/vaultflow-demo-api.git](https://github.com/your-username/vaultflow-demo-api.git)
cd vaultflow-demo-api
npm install

3. Connect to VaultFlow
Open the vaultflow-inject.js file and update the configuration block at the top with your specific VaultFlow project details:

const SUPABASE_URL = '[https://your-vaultflow-db.supabase.co](https://your-vaultflow-db.supabase.co)';
const SUPABASE_ANON_KEY = 'your-anon-key';
const PROJECT_ID = 'your-project-uuid'; 
const ENVIRONMENT_ID = 'your-environment-uuid';

4. Boot the Server
Do not run node server.js. To securely inject the secrets and start the app, wrap the execution in the injector script:

node vaultflow-inject.js

Expected Terminal Output:

🔒 VaultFlow Injector: Booting up...
📦 Found 2 encrypted secrets. Decrypting...
   ✅ Decrypted & Injected: ANIMAL_API_KEY
   ✅ Decrypted & Injected: MONGO_URI
🚀 Starting target application...
-----------------------------------
🐾 Cute Animal Server running on http://localhost:3000

Open http://localhost:3000 in your browser to see the live dashboard!

🗂️ Project Structure

├── public/
│   └── index.html         # The interactive dark-mode dashboard UI
├── server.js              # Express API (Requires injected secrets to run)
├── vaultflow-inject.js    # The VaultFlow SDK / Runtime Injector
└── package.json