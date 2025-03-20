const { spawn, execSync } = require('child_process');
const { join } = require('path');
const { existsSync } = require('fs');

// Set environment variable for development
process.env.NODE_ENV = 'development';
process.env.ELECTRON_START_URL = 'http://localhost:3000';

console.log('🚀 Starting PasteMax development server...');

// Function to run Vite dev server
function startViteDevServer() {
  console.log('📦 Starting Vite dev server...');
  
  // Check if Vite exists in node_modules
  const viteBinPath = join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!existsSync(viteBinPath)) {
    console.error('❌ Vite not found in node_modules. Please run npm install first.');
    process.exit(1);
  }

  // Start Vite in dev mode with host and port specified
  // Added --config option to use watch.ignored pattern for symbolic links
  const vite = spawn('node', [
    viteBinPath, 
    '--host', 'localhost', 
    '--port', '3000',
    '--config', './vite.dev.config.js' // Use a special config for dev mode
  ], {
    stdio: 'inherit',
    shell: true
  });

  vite.on('error', (err) => {
    console.error('❌ Failed to start Vite:', err);
    process.exit(1);
  });

  // Wait a moment for Vite to start before launching Electron
  setTimeout(() => {
    startElectron();
  }, 2000);

  return vite;
}

// Function to start Electron
function startElectron() {
  console.log('🔌 Starting Electron...');
  
  // Use the local electron from node_modules rather than relying on global install
  const electronPath = join(__dirname, 'node_modules', '.bin', 'electron');
  
  // Start Electron with properly resolved path
  const electron = spawn(electronPath, ['.'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      ELECTRON_START_URL: 'http://localhost:3000'
    }
  });

  electron.on('error', (err) => {
    console.error('❌ Failed to start Electron:', err);
    console.error('Make sure electron is installed: npm install electron --save-dev');
  });

  return electron;
}

// Handle cleanup when exiting
function cleanup(children) {
  children.forEach(child => {
    if (child && !child.killed) {
      child.kill();
    }
  });
}

// Create Vite dev config if it doesn't exist
function createViteDevConfig() {
  const fs = require('fs');
  const configPath = join(__dirname, 'vite.dev.config.js');
  
  if (!existsSync(configPath)) {
    console.log('📝 Creating Vite dev config file...');
    const configContent = `
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    watch: {
      // Avoid symbolic link issues
      ignored: ['**/node_modules/**', '**/autoMate/**', '**/.git/**'],
    },
  },
});
`;
    fs.writeFileSync(configPath, configContent);
    console.log('✅ Created Vite dev config file');
  }
}

// Main function
async function main() {
  try {
    // Check for Node.js dependencies
    try {
      console.log('🔍 Checking dependencies...');
      execSync('npm list electron vite', { stdio: 'ignore' });
    } catch (error) {
      console.log('⚠️ Some dependencies may be missing. Running npm install...');
      execSync('npm install', { stdio: 'inherit' });
    }

    // Create Vite dev config
    createViteDevConfig();

    // Start Vite and Electron
    const viteProcess = startViteDevServer();
    
    // Handle exit signals
    const exitHandler = () => {
      cleanup([viteProcess]);
      process.exit();
    };

    process.on('SIGINT', exitHandler);
    process.on('SIGTERM', exitHandler);
    process.on('exit', exitHandler);
    
  } catch (error) {
    console.error('❌ Development process failed:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 