
import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// --- Google OAuth Setup ---
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.metadata.readonly', 'https://www.googleapis.com/auth/userinfo.email'];
const TARGET_FOLDER_ID = '1fnsIX0uxDB7ZZih7hK2oYwNAFyoiYTZB';

import { SECTORS, INITIAL_DIKES, INITIAL_MEASUREMENTS, INITIAL_BUDGET, INITIAL_PROGRESS_ENTRIES } from "./constants";

const initialBudgetBySector: Record<string, any> = {};
SECTORS.forEach(sector => {
    initialBudgetBySector[sector.id] = JSON.parse(JSON.stringify(INITIAL_BUDGET));
});

// --- In-Memory State (Source of Truth) ---
let projectState = {
  measurements: INITIAL_MEASUREMENTS,
  progressEntries: INITIAL_PROGRESS_ENTRIES,
  dikes: INITIAL_DIKES,
  sectors: SECTORS,
  budgetBySector: initialBudgetBySector,
  budgetByDike: {},
  protocols: [],
  customColumns: [],
  lastUpdated: Date.now()
};

// --- WebSocket Server ---
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

const wss = new WebSocketServer({ server });

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  
  // Send initial state
  ws.send(JSON.stringify({ type: 'INIT_STATE', payload: projectState }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Handle different action types
      switch (message.type) {
        case 'UPDATE_STATE':
          projectState = { ...projectState, ...message.payload, lastUpdated: Date.now() };
          // Broadcast to all other clients
          broadcast(JSON.stringify({ type: 'STATE_UPDATED', payload: projectState }), ws);
          break;
        case 'SYNC_REQUEST':
          ws.send(JSON.stringify({ type: 'INIT_STATE', payload: projectState }));
          break;
      }
    } catch (e) {
      console.error("Error parsing WS message", e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

function broadcast(message: string, sender?: WebSocket) {
  clients.forEach(client => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// --- API Routes ---

// OAuth Routes
app.get('/api/auth/google/url', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  res.json({ url });
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    // In a real app, you'd store this in a secure session or DB
    // For this demo, we'll set it in a cookie (not ideal for production but works for the preview)
    res.cookie('google_tokens', JSON.stringify(tokens), { 
      httpOnly: true, 
      secure: true, 
      sameSite: 'none' 
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Autenticación exitosa. Esta ventana se cerrará automáticamente.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("OAuth Error", error);
    res.status(500).send("Error during authentication");
  }
});

// Drive Sync Routes
app.post('/api/drive/save', async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: "Not authenticated" });

  try {
    const tokens = JSON.parse(tokensStr);
    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Search for existing file in the target folder
    const response = await drive.files.list({
      q: `name = 'casma_project_data.json' and '${TARGET_FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    const fileMetadata = {
      name: 'casma_project_data.json',
      mimeType: 'application/json',
      parents: [TARGET_FOLDER_ID]
    };
    const media = {
      mimeType: 'application/json',
      body: JSON.stringify(req.body || projectState)
    };

    if (req.body) {
      projectState = { ...projectState, ...req.body, lastUpdated: Date.now() };
      broadcast(JSON.stringify({ type: 'STATE_UPDATED', payload: projectState }));
    }

    if (response.data.files && response.data.files.length > 0) {
      // Update existing
      const fileId = response.data.files[0].id!;
      await drive.files.update({
        fileId: fileId,
        media: media
      });
    } else {
      // Create new
      await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id'
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Drive Save Error", error);
    res.status(500).json({ error: "Failed to save to Drive" });
  }
});

app.get('/api/drive/load', async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: "Not authenticated" });

  try {
    const tokens = JSON.parse(tokensStr);
    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const response = await drive.files.list({
      q: `name = 'casma_project_data.json' and '${TARGET_FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
      const fileId = response.data.files[0].id!;
      const fileContent = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      });
      
      projectState = fileContent.data as any;
      broadcast(JSON.stringify({ type: 'INIT_STATE', payload: projectState }));
      res.json(projectState);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  } catch (error) {
    console.error("Drive Load Error", error);
    res.status(500).json({ error: "Failed to load from Drive" });
  }
});

app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: !!req.cookies.google_tokens });
});

// --- Vite Middleware ---
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}
