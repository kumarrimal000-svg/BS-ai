import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality, Type, LiveServerMessage, FunctionDeclaration } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Process-level guards against uncaught socket/stream/network errors
 */
function isIgnorableNetworkError(err: any): boolean {
  if (!err) return true;
  const str = String(err?.message || '') + ' ' + String(err?.stack || '') + ' ' + String(err);
  if (
    str.includes('WebSocket') ||
    str.includes('ECONNRESET') ||
    str.includes('EPIPE') ||
    str.includes('closed') ||
    str.includes('TLSSocket') ||
    str.includes('Socket') ||
    str.includes('stream') ||
    str.includes('Unhandled error') ||
    str.includes("Unhandled 'error'") ||
    str.includes('ETIMEDOUT') ||
    str.includes('ECONNREFUSED') ||
    str.includes('ENOTFOUND') ||
    str.includes('socket hang up') ||
    str.includes('_errorEmitted') ||
    str.includes('_hadError') ||
    str.includes('authorizationError') ||
    str.includes('_closeAfterHandlingError')
  ) {
    return true;
  }
  const obj = typeof err === 'object' ? err : null;
  if (obj) {
    const cName = obj.constructor?.name || '';
    if (cName === 'TLSSocket' || cName === 'Socket' || cName === 'ClientRequest' || cName === 'WebSocket') {
      return true;
    }
    if (
      obj._errorEmitted !== undefined ||
      obj._errored !== undefined ||
      obj.authorizationError !== undefined ||
      obj._hadError !== undefined ||
      obj._closeAfterHandlingError !== undefined ||
      obj.onerror !== undefined ||
      obj._socket !== undefined ||
      obj._sender !== undefined ||
      obj.code === 'ECONNRESET' ||
      obj.code === 'EPIPE' ||
      obj.code === 'ETIMEDOUT'
    ) {
      return true;
    }
    const ctx = obj.context || obj.target || obj.socket || obj._socket || obj.req;
    if (ctx && typeof ctx === 'object') {
      const ctxName = ctx.constructor?.name || '';
      if (ctxName === 'TLSSocket' || ctxName === 'Socket' || ctxName === 'ClientRequest' || ctxName === 'WebSocket') {
        return true;
      }
      if (
        ctx._errorEmitted !== undefined ||
        ctx._errored !== undefined ||
        ctx.authorizationError !== undefined ||
        ctx._hadError !== undefined ||
        ctx._closeAfterHandlingError !== undefined ||
        ctx.onerror !== undefined ||
        ctx._socket !== undefined ||
        ctx._sender !== undefined
      ) {
        return true;
      }
    }
  }
  return false;
}

process.on('uncaughtException', (err: any) => {
  if (isIgnorableNetworkError(err)) return;
  if (!err || typeof err !== 'object') return;
  const cleanMsg = typeof err?.message === 'string' ? err.message : '';
  if (cleanMsg) {
    console.warn('[Process Exception]:', cleanMsg);
  }
});

process.on('unhandledRejection', (reason: any) => {
  if (isIgnorableNetworkError(reason)) return;
  if (!reason || typeof reason !== 'object') return;
  const cleanMsg = typeof reason?.message === 'string' ? reason.message : '';
  if (cleanMsg) {
    console.warn('[Process Rejection]:', cleanMsg);
  }
});

// Guard HTTP server socket events early
server.on('error', () => {});
server.on('clientError', (_err: any, socket: any) => {
  if (socket) {
    socket.on('error', () => {});
    if (!socket.destroyed) {
      try {
        socket.destroy();
      } catch {}
    }
  }
});
server.on('connection', (socket: any) => {
  socket.on('error', () => {});
});
server.on('secureConnection', (socket: any) => {
  socket.on('error', () => {});
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Patch WebSocket.prototype.emit to guarantee that unhandled 'error' events
// on client or internal WebSockets do not crash or emit unhandled exception traces
try {
  const origWsEmit = WebSocket.prototype.emit;
  WebSocket.prototype.emit = function (event: string, ...args: any[]): boolean {
    if (event === 'error' && this.listenerCount('error') === 0) {
      if (typeof this.onerror === 'function') {
        try {
          const err = args[0];
          this.onerror({
            type: 'error',
            error: err,
            message: err?.message || 'WebSocket error',
            target: this,
          } as any);
        } catch {}
      }
      return false;
    }
    return origWsEmit.call(this, event, ...args);
  };
} catch (patchErr: any) {
  console.warn('[Live Client] WebSocket prototype guard notice:', patchErr?.message || 'Notice');
}

// Guard internal Live WebSocket creation so dropped connections or network resets never trigger unhandled errors
try {
  const liveFactory = (ai as any).live?.webSocketFactory;
  if (liveFactory && typeof liveFactory.create === 'function') {
    const origCreate = liveFactory.create.bind(liveFactory);
    liveFactory.create = (url: string, headers: any, callbacks: any) => {
      const nodeWs = origCreate(url, headers, callbacks);
      const origConnect = nodeWs.connect?.bind(nodeWs);
      if (typeof origConnect === 'function') {
        nodeWs.connect = function () {
          try {
            origConnect();
          } catch (connErr: any) {
            console.warn('[Live Client] Internal connect warning handled:', connErr?.message || 'Connection initiation issue');
          }
          if (this.ws) {
            // Guard the WebSocket instance itself
            this.ws.on('error', () => {});

            // Guard the underlying HTTP/TLS client request and socket
            const guardSocket = (sock: any) => {
              if (!sock) return;
              try {
                sock.on('error', () => {});
              } catch {}
            };

            if (this.ws._req) {
              try {
                this.ws._req.on('error', () => {});
                this.ws._req.on('socket', (s: any) => {
                  guardSocket(s);
                  try {
                    s.on('secureConnect', () => guardSocket(s));
                  } catch {}
                });
                if (this.ws._req.socket) {
                  guardSocket(this.ws._req.socket);
                }
              } catch {}
            }

            if (this.ws._socket) {
              guardSocket(this.ws._socket);
            }

            if (this.ws._sender) {
              this.ws._sender.onerror = () => {};
            }

            this.ws.on('upgrade', (res: any) => {
              if (res?.socket) guardSocket(res.socket);
            });

            this.ws.on('open', () => {
              if (this.ws?._socket) guardSocket(this.ws._socket);
            });

            this.ws.on('close', () => {
              if (this.ws?._socket) guardSocket(this.ws._socket);
            });
          }
        };
      }
      return nodeWs;
    };
  }
} catch (factoryErr: any) {
  console.warn('[Live Client] Factory wrapper initialization notice:', factoryErr?.message || 'Notice');
}

// Intercept ai.live.connect to ensure it rejects cleanly if the session closes or errors before setup completes
try {
  if (typeof (ai as any).live?.connect === 'function') {
    const originalLiveConnect = (ai as any).live.connect.bind((ai as any).live);
    (ai as any).live.connect = async function (params: any) {
      let earlyReject: (reason?: any) => void;
      const earlyTerminationPromise = new Promise<never>((_, reject) => {
        earlyReject = reject;
      });

      let isEstablished = false;
      const originalCallbacks = params?.callbacks || {};

      const guardedCallbacks = {
        ...originalCallbacks,
        onopen: () => {
          isEstablished = true;
          if (typeof originalCallbacks.onopen === 'function') {
            originalCallbacks.onopen();
          }
        },
        onclose: (e: any) => {
          if (!isEstablished) {
            earlyReject(new Error(`Live session closed before setup completed (code: ${e?.code || 'unknown'})`));
          }
          if (typeof originalCallbacks.onclose === 'function') {
            originalCallbacks.onclose(e);
          }
        },
        onerror: (err: any) => {
          if (!isEstablished) {
            earlyReject(err instanceof Error ? err : new Error(String(err?.message || err)));
          }
          if (typeof originalCallbacks.onerror === 'function') {
            originalCallbacks.onerror(err);
          }
        },
      };

      const session = await Promise.race([
        originalLiveConnect({ ...params, callbacks: guardedCallbacks }),
        earlyTerminationPromise,
      ]);
      isEstablished = true;
      return session;
    };
  }
} catch (wrapErr: any) {
  console.warn('[Live Client] Live connect wrapper notice:', wrapErr?.message || 'Notice');
}

// Tool declarations for Tamanna AI Assistant (All 50 tools registered)
const functionDeclarations: FunctionDeclaration[] = [
  // Apps (01-10)
  {
    name: 'openApp',
    description: 'Opens an installed app (e.g. YouTube, Spotify, WhatsApp, Camera, Settings, Instagram) on Android/device.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: { type: Type.STRING, description: 'Name of the app to open' },
      },
      required: ['appName'],
    },
  },
  {
    name: 'closeApp',
    description: 'Requests to close or terminate an app through connected Android system.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: { type: Type.STRING, description: 'Name of the app to close' },
      },
      required: ['appName'],
    },
  },
  {
    name: 'getAppInfo',
    description: 'Retrieves public system package details for an app without exposing private user data.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: { type: Type.STRING, description: 'Name of the app to inspect' },
      },
      required: ['appName'],
    },
  },
  {
    name: 'installUninstallApp',
    description: 'Opens system installer or deletion confirmation for an app.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        operation: { type: Type.STRING, description: '"install" or "uninstall"' },
        appName: { type: Type.STRING, description: 'Target application name' },
      },
      required: ['operation', 'appName'],
    },
  },
  {
    name: 'clearAppCache',
    description: 'Clears app cache or navigates to app storage settings.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: { type: Type.STRING, description: 'Name of the app' },
      },
      required: ['appName'],
    },
  },
  {
    name: 'forceStopApp',
    description: 'Requests force stop of an app through Android settings/integration.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: { type: Type.STRING, description: 'Target app' },
      },
      required: ['appName'],
    },
  },
  {
    name: 'getAppPermissions',
    description: 'Displays permissions for a selected app via Android settings.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: { type: Type.STRING, description: 'Application name' },
      },
      required: ['appName'],
    },
  },
  {
    name: 'openAppSettings',
    description: 'Opens system settings screen for an app.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: { type: Type.STRING, description: 'Application name' },
      },
      required: ['appName'],
    },
  },
  {
    name: 'changeDefaultApp',
    description: 'Opens Android default-app settings interface.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, description: 'Category: "browser", "phone", "sms"' },
      },
    },
  },
  {
    name: 'openRecentApps',
    description: 'Opens recent-apps overview interface on supported device.',
    parameters: { type: Type.OBJECT, properties: {} },
  },

  // Communications (11-18)
  {
    name: 'makeCall',
    description: 'Initiates a phone call or opens dialer for a contact or number.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipient: { type: Type.STRING, description: 'Contact name or phone number' },
      },
      required: ['recipient'],
    },
  },
  {
    name: 'endCall',
    description: 'Ends an active phone call if supported by system integration.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'searchContacts',
    description: 'Searches contacts in device address book.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Search term or contact name' },
      },
    },
  },
  {
    name: 'openContact',
    description: 'Finds and opens a specific contact card.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        contactName: { type: Type.STRING, description: 'Name of the contact' },
      },
      required: ['contactName'],
    },
  },
  {
    name: 'sendMessage',
    description: 'Composes or sends an SMS text message to a recipient.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipient: { type: Type.STRING, description: 'Phone number or contact name' },
        message: { type: Type.STRING, description: 'Text message content' },
      },
      required: ['recipient', 'message'],
    },
  },
  {
    name: 'openMessages',
    description: 'Opens the default messaging application.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'sendEmail',
    description: 'Composes an email with recipient, subject, and body in mail client.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        to: { type: Type.STRING, description: 'Recipient email address' },
        subject: { type: Type.STRING, description: 'Email subject' },
        body: { type: Type.STRING, description: 'Email body text' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'readMessages',
    description: 'Opens messaging application to review recent messages.',
    parameters: { type: Type.OBJECT, properties: {} },
  },

  // Media (19-26)
  {
    name: 'playMusic',
    description: 'Plays music track or resumes playback in media player.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Song title, artist, or genre' },
      },
    },
  },
  {
    name: 'pauseMusic',
    description: 'Pauses currently playing media.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'nextSong',
    description: 'Skips to next song in media queue.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'previousSong',
    description: 'Returns to previous song in media queue.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'increaseVolume',
    description: 'Increases media or device audio volume.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.NUMBER, description: 'Volume step percentage (default 10)' },
      },
    },
  },
  {
    name: 'decreaseVolume',
    description: 'Decreases media or device audio volume.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.NUMBER, description: 'Volume step percentage (default 10)' },
      },
    },
  },
  {
    name: 'toggleMute',
    description: 'Mutes or unmutes device audio.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        mute: { type: Type.BOOLEAN, description: 'True to mute, false to unmute' },
      },
    },
  },
  {
    name: 'playVideo',
    description: 'Finds and plays requested video via YouTube or media player.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Video title or topic' },
      },
      required: ['query'],
    },
  },

  // Camera & Photos (27-36)
  {
    name: 'recordVideo',
    description: 'Starts camera video recording.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'takePhoto',
    description: 'Captures a photo with device camera viewfinder.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'recordVideoCamera',
    description: 'Starts or stops camera video recording and saves file.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: '"start" or "stop"' },
      },
      required: ['action'],
    },
  },
  {
    name: 'openGallery',
    description: 'Opens device photo gallery or media picker.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'sharePhoto',
    description: 'Opens system share sheet for a photo.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Caption or title' },
      },
    },
  },
  {
    name: 'shareVideo',
    description: 'Opens system share sheet for a video.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Title or caption' },
      },
    },
  },
  {
    name: 'switchCamera',
    description: 'Toggles between front and rear cameras.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'toggleFlash',
    description: 'Toggles camera flash torch on or off.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'Flash torch state' },
      },
    },
  },
  {
    name: 'zoomCamera',
    description: 'Adjusts camera zoom level (e.g. 1.0x, 2.0x, 3.0x).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        factor: { type: Type.NUMBER, description: 'Zoom factor' },
      },
      required: ['factor'],
    },
  },
  {
    name: 'takeSelfie',
    description: 'Switches to front selfie camera and takes a photo.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'openBSCamera',
    description: 'Opens the dedicated BS Camera scanner screen to see, scan, and understand objects, books, or papers.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        mode: { type: Type.STRING, description: 'Scanning mode: "general", "ocr", or "study"' },
      },
    },
  },
  {
    name: 'analyzeCameraVision',
    description: 'Analyzes the active scanned photo or camera visual to answer what Tamanna sees, what the object is, how it works, and reads text.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING, description: 'User question about what is in the camera or photo (e.g. "तुम्हें क्या दिख रहा है?")' },
      },
    },
  },

  // Web & Browser (37-45)
  {
    name: 'openWebsite',
    description: 'Opens any website or URL in the browser (e.g. https://youtube.com, https://reddit.com).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: 'Destination URL' },
      },
      required: ['url'],
    },
  },
  {
    name: 'webSearch',
    description: 'Searches the web for keywords or questions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'openSearchPage',
    description: 'Opens search engine homepage.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        engine: { type: Type.STRING, description: '"google" or "duckduckgo"' },
      },
    },
  },
  {
    name: 'openNewTab',
    description: 'Opens a new browser tab.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: 'Initial URL' },
      },
    },
  },
  {
    name: 'openBookmarks',
    description: 'Opens browser bookmarks interface.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'openBrowserHistory',
    description: 'Opens browser history screen.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'refreshPage',
    description: 'Refreshes current web view or active page.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'downloadFile',
    description: 'Initiates file download from a given URL.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fileUrl: { type: Type.STRING, description: 'URL of the file to download' },
        fileName: { type: Type.STRING, description: 'Optional filename' },
      },
      required: ['fileUrl'],
    },
  },
  {
    name: 'shareLink',
    description: 'Shares URL via system share dialog or copies to clipboard.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: 'URL to share' },
        title: { type: Type.STRING, description: 'Optional title' },
      },
      required: ['url'],
    },
  },

  // Device & System Control (46-50)
  {
    name: 'systemDeviceControl',
    description: 'Checks device battery, network status, and system health.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        actionType: { type: Type.STRING, description: '"battery", "network", or "settings"' },
      },
      required: ['actionType'],
    },
  },
  {
    name: 'controlWifi',
    description: 'Controls Wi-Fi state or opens Wi-Fi system settings.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'True to enable, false to disable' },
      },
      required: ['enabled'],
    },
  },
  {
    name: 'controlMobileData',
    description: 'Toggles mobile data or opens cellular network settings.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'True to enable, false to disable' },
      },
      required: ['enabled'],
    },
  },
  {
    name: 'controlAirplaneMode',
    description: 'Toggles Airplane mode or opens system settings screen.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'True to enable, false to disable' },
      },
      required: ['enabled'],
    },
  },
  {
    name: 'adjustBrightness',
    description: 'Adjusts screen brightness level (0-100) or increases/decreases.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        direction: { type: Type.STRING, description: '"increase" or "decrease"' },
        level: { type: Type.NUMBER, description: 'Optional level 0 to 100' },
      },
      required: ['direction'],
    },
  },

  // Additional Tools (51-100)
  {
    name: 'takePhoto51',
    description: 'Captures a photo via camera integration (Tool 51).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'recordVideo52',
    description: 'Starts/stops video recording via camera integration (Tool 52).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: '"start" or "stop"' },
      },
      required: ['action'],
    },
  },
  {
    name: 'openGallery53',
    description: 'Opens device photo gallery or media picker (Tool 53).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'sharePhoto54',
    description: 'Opens system photo sharing interface (Tool 54).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Photo caption or title' },
      },
    },
  },
  {
    name: 'shareVideo55',
    description: 'Opens system video sharing interface (Tool 55).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Video title' },
      },
    },
  },
  {
    name: 'switchCamera56',
    description: 'Switches between front and rear cameras (Tool 56).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'toggleFlash57',
    description: 'Toggles camera flash torch on or off (Tool 57).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'Torch state' },
      },
    },
  },
  {
    name: 'zoomCamera58',
    description: 'Adjusts camera zoom factor (Tool 58).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        factor: { type: Type.NUMBER, description: 'Zoom factor' },
      },
      required: ['factor'],
    },
  },
  {
    name: 'takeSelfie59',
    description: 'Opens front selfie camera and takes photo (Tool 59).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'openWebsite61',
    description: 'Opens website or URL (Tool 61).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: 'URL to open' },
      },
      required: ['url'],
    },
  },
  {
    name: 'webSearch62',
    description: 'Performs web search (Tool 62).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Search keywords' },
      },
      required: ['query'],
    },
  },
  {
    name: 'openNewTab64',
    description: 'Opens a new browser tab (Tool 64).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: 'Initial URL' },
      },
    },
  },
  {
    name: 'openBookmarks65',
    description: 'Opens browser bookmarks (Tool 65).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'openBrowserHistory66',
    description: 'Opens browser history (Tool 66).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'refreshPage67',
    description: 'Refreshes current web view (Tool 67).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'downloadFile68',
    description: 'Downloads a file from URL (Tool 68).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fileUrl: { type: Type.STRING, description: 'File source URL' },
        fileName: { type: Type.STRING, description: 'Filename' },
      },
      required: ['fileUrl'],
    },
  },
  {
    name: 'shareLink69',
    description: 'Shares link via system share sheet (Tool 69).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: 'Link URL' },
        title: { type: Type.STRING, description: 'Optional title' },
      },
      required: ['url'],
    },
  },
  {
    name: 'controlMobileData78',
    description: 'Controls mobile data or opens cellular settings (Tool 78).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'Enable or disable' },
      },
      required: ['enabled'],
    },
  },
  {
    name: 'controlAirplaneMode79',
    description: 'Controls airplane mode or opens settings (Tool 79).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'Enable or disable' },
      },
      required: ['enabled'],
    },
  },
  {
    name: 'controlBrightness80',
    description: 'Sets screen brightness level 0 to 100 (Tool 80).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        level: { type: Type.NUMBER, description: 'Brightness level percentage' },
      },
      required: ['level'],
    },
  },
  {
    name: 'controlVolume81',
    description: 'Adjusts device audio volume (Tool 81).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.NUMBER, description: 'Change amount percentage' },
      },
      required: ['amount'],
    },
  },
  {
    name: 'controlScreenRotation82',
    description: 'Locks or changes screen rotation orientation (Tool 82).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        orientation: { type: Type.STRING, description: '"portrait" or "landscape"' },
      },
      required: ['orientation'],
    },
  },
  {
    name: 'getBatteryInfo83',
    description: 'Retrieves device battery level and charging status (Tool 83).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'getStorageInfo84',
    description: 'Shows device storage usage and quota (Tool 84).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'getDeviceInfo85',
    description: 'Retrieves non-sensitive device platform information (Tool 85).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'openFile91',
    description: 'Opens a selected file using system file picker (Tool 91).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fileName: { type: Type.STRING, description: 'File name' },
      },
    },
  },
  {
    name: 'deleteFile92',
    description: 'Deletes a file with explicit user confirmation (Tool 92).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fileName: { type: Type.STRING, description: 'File name to delete' },
        confirmed: { type: Type.BOOLEAN, description: 'Explicit confirmation flag' },
      },
      required: ['fileName', 'confirmed'],
    },
  },
  {
    name: 'renameFile93',
    description: 'Renames a file (Tool 93).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        oldName: { type: Type.STRING, description: 'Current filename' },
        newName: { type: Type.STRING, description: 'New filename' },
      },
      required: ['oldName', 'newName'],
    },
  },
  {
    name: 'copyFile94',
    description: 'Copies file to destination (Tool 94).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        source: { type: Type.STRING, description: 'Source file' },
        destination: { type: Type.STRING, description: 'Destination path' },
      },
      required: ['source', 'destination'],
    },
  },
  {
    name: 'moveFile95',
    description: 'Moves file to destination (Tool 95).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        source: { type: Type.STRING, description: 'Source file' },
        destination: { type: Type.STRING, description: 'Destination path' },
      },
      required: ['source', 'destination'],
    },
  },
  {
    name: 'shareFile96',
    description: 'Shares a file via system share interface (Tool 96).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fileName: { type: Type.STRING, description: 'File name to share' },
      },
      required: ['fileName'],
    },
  },
  {
    name: 'openDocument98',
    description: 'Opens a document reader for PDF, DOCX, or text files (Tool 98).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        documentName: { type: Type.STRING, description: 'Document name or URL' },
      },
      required: ['documentName'],
    },
  },

  // Reminders & Alarms (100-109)
  {
    name: 'reminderAlarmSection100',
    description: 'Opens reminder/alarm clock section (Tool 100).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'setAlarm101',
    description: 'Sets an alarm at requested time (Tool 101).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        time: { type: Type.STRING, description: 'Alarm time e.g. "07:00 AM"' },
        label: { type: Type.STRING, description: 'Optional label' },
      },
      required: ['time'],
    },
  },
  {
    name: 'stopAlarm102',
    description: 'Stops active alarm (Tool 102).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        time: { type: Type.STRING, description: 'Time of alarm' },
      },
    },
  },
  {
    name: 'setReminder103',
    description: 'Creates a reminder with text and date/time (Tool 103).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: 'Reminder task' },
        dateTime: { type: Type.STRING, description: 'Date and time' },
      },
      required: ['text', 'dateTime'],
    },
  },
  {
    name: 'listReminders104',
    description: 'Lists all active reminders (Tool 104).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'snoozeAlarm105',
    description: 'Snoozes active alarm (Tool 105).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        minutes: { type: Type.NUMBER, description: 'Minutes to snooze' },
      },
    },
  },
  {
    name: 'openCalendar106',
    description: 'Opens calendar app (Tool 106).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'createCalendarEvent107',
    description: 'Creates an event in calendar (Tool 107).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Event title' },
        date: { type: Type.STRING, description: 'Date YYYY-MM-DD' },
        time: { type: Type.STRING, description: 'Time e.g. 14:00' },
      },
      required: ['title', 'date'],
    },
  },
  {
    name: 'deleteCalendarEvent108',
    description: 'Deletes a calendar event with confirmation (Tool 108).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eventTitle: { type: Type.STRING, description: 'Event title' },
        confirmed: { type: Type.BOOLEAN, description: 'Confirmation flag' },
      },
      required: ['eventTitle', 'confirmed'],
    },
  },
  {
    name: 'createNotificationReminder109',
    description: 'Sends a system notification reminder (Tool 109).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Notification title' },
        body: { type: Type.STRING, description: 'Notification body' },
      },
      required: ['title', 'body'],
    },
  },

  // Device & Display Controls (110-118)
  {
    name: 'controlScreenState110',
    description: 'Turns screen on/off or opens display settings (Tool 110).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        state: { type: Type.STRING, description: '"on" or "off"' },
      },
      required: ['state'],
    },
  },
  {
    name: 'lockScreen111',
    description: 'Locks screen via device administrator (Tool 111).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'changeWallpaper112',
    description: 'Opens wallpaper picker (Tool 112).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'toggleDarkMode113',
    description: 'Toggles system or app dark theme (Tool 113).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'True for dark mode' },
      },
    },
  },
  {
    name: 'setScreenTimeout114',
    description: 'Configures screen timeout in seconds (Tool 114).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        seconds: { type: Type.NUMBER, description: 'Timeout seconds' },
      },
      required: ['seconds'],
    },
  },
  {
    name: 'setFontSize115',
    description: 'Changes system font size settings (Tool 115).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        size: { type: Type.STRING, description: '"small", "medium", "large"' },
      },
      required: ['size'],
    },
  },
  {
    name: 'startScreenCast116',
    description: 'Opens screen casting interface (Tool 116).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'captureScreenshot117',
    description: 'Captures screen image (Tool 117).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'recordScreen118',
    description: 'Starts/stops screen recording (Tool 118).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: '"start" or "stop"' },
      },
      required: ['action'],
    },
  },

  // Productivity & Tasks (119-127)
  {
    name: 'createNote119',
    description: 'Creates and saves a note (Tool 119).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Note title' },
        content: { type: Type.STRING, description: 'Note content' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'openNote120',
    description: 'Opens notes app (Tool 120).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Title or topic' },
      },
    },
  },
  {
    name: 'addListItem121',
    description: 'Adds item to a list (Tool 121).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        listName: { type: Type.STRING, description: 'List name' },
        item: { type: Type.STRING, description: 'Item text' },
      },
      required: ['listName', 'item'],
    },
  },
  {
    name: 'viewList122',
    description: 'Views items in a list (Tool 122).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        listName: { type: Type.STRING, description: 'List name' },
      },
      required: ['listName'],
    },
  },
  {
    name: 'completeTask123',
    description: 'Marks task as completed (Tool 123).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        task: { type: Type.STRING, description: 'Task description' },
      },
      required: ['task'],
    },
  },
  {
    name: 'openCalculator124',
    description: 'Opens device calculator (Tool 124).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'recordVoiceNote125',
    description: 'Records voice note audio (Tool 125).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: '"start" or "stop"' },
      },
      required: ['action'],
    },
  },
  {
    name: 'scanDocument126',
    description: 'Scans document using camera (Tool 126).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'scanCode127',
    description: 'Scans QR or barcode using camera (Tool 127).',
    parameters: { type: Type.OBJECT, properties: {} },
  },

  // Social Media (128-139)
  {
    name: 'socialMediaTool128',
    description: 'Opens Facebook social feed or launcher (Tool 128).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'socialMediaTool129',
    description: 'Opens Instagram social photo/video feed (Tool 129).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'socialMediaTool130',
    description: 'Opens Twitter / X feeds and latest posts (Tool 130).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'socialMediaTool131',
    description: 'Opens LinkedIn professional network (Tool 131).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'socialMediaTool132',
    description: 'Opens Snapchat camera and stories (Tool 132).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'socialMediaTool133',
    description: 'Opens Pinterest visual inspiration boards (Tool 133).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'shareSocialPost134',
    description: 'Shares a post to social media (Tool 134).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: 'Post text' },
        platform: { type: Type.STRING, description: 'Platform' },
      },
      required: ['text'],
    },
  },
  {
    name: 'openSocialProfile135',
    description: 'Opens a social media profile (Tool 135).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        platform: { type: Type.STRING, description: 'Platform e.g. twitter, instagram' },
        username: { type: Type.STRING, description: 'Username handle' },
      },
      required: ['platform', 'username'],
    },
  },
  {
    name: 'sendSocialMessage136',
    description: 'Sends message on social platform (Tool 136).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        platform: { type: Type.STRING, description: 'Platform' },
        recipient: { type: Type.STRING, description: 'Recipient username or number' },
        message: { type: Type.STRING, description: 'Message' },
      },
      required: ['platform', 'recipient', 'message'],
    },
  },
  {
    name: 'createSocialStory137',
    description: 'Opens story creation camera (Tool 137).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'openSocialReel138',
    description: 'Opens Reels or Shorts feed (Tool 138).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'shareSocialVideo139',
    description: 'Shares video on social media (Tool 139).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        videoTitle: { type: Type.STRING, description: 'Video title' },
      },
    },
  },

  // Security & Privacy (140-150)
  {
    name: 'securityPrivacyTool140',
    description: 'Opens device security dashboard and status (Tool 140).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'securityPrivacyTool141',
    description: 'Checks app permissions and security status (Tool 141).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'securityPrivacyTool142',
    description: 'Configures biometric, pattern, or pin security settings (Tool 142).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'controlAppLock143',
    description: 'Configures app lock protection (Tool 143).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: { type: Type.STRING, description: 'Application name' },
        locked: { type: Type.BOOLEAN, description: 'True to lock' },
      },
      required: ['appName', 'locked'],
    },
  },
  {
    name: 'controlAppHide144',
    description: 'Hides app via launcher settings (Tool 144).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: { type: Type.STRING, description: 'Application name' },
      },
      required: ['appName'],
    },
  },
  {
    name: 'openPrivacySettings145',
    description: 'Opens privacy settings dashboard (Tool 145).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'checkPasswordStrength146',
    description: 'Checks password strength score zero-knowledge (Tool 146).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        length: { type: Type.NUMBER, description: 'Password length' },
        hasSpecial: { type: Type.BOOLEAN, description: 'Contains special characters' },
        hasDigits: { type: Type.BOOLEAN, description: 'Contains digits' },
        hasUpperLower: { type: Type.BOOLEAN, description: 'Contains mixed case' },
      },
      required: ['length', 'hasSpecial', 'hasDigits', 'hasUpperLower'],
    },
  },
  {
    name: 'checkSafeBrowsing147',
    description: 'Evaluates URL security and phishing status (Tool 147).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: 'URL to check' },
      },
      required: ['url'],
    },
  },
  {
    name: 'findDevice148',
    description: 'Opens Google Find My Device (Tool 148).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'backupData149',
    description: 'Opens backup settings (Tool 149).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'restoreData150',
    description: 'Opens data restore manager with confirmation (Tool 150).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        confirmed: { type: Type.BOOLEAN, description: 'Confirmation flag' },
      },
      required: ['confirmed'],
    },
  },

  // Visual & Persona Extras
  {
    name: 'changeThemeMood',
    description: 'Changes visual futuristic lighting theme: "magenta", "cyan", "violet", "emerald", "amber".',
    parameters: {
      type: Type.OBJECT,
      properties: {
        mood: { type: Type.STRING, description: 'Theme mood name' },
      },
      required: ['mood'],
    },
  },
  {
    name: 'showTeaseReaction',
    description: 'Triggers a visual sassy emotion: "smirk", "wink", "heart", "sparkle", "giggle", "pout".',
    parameters: {
      type: Type.OBJECT,
      properties: {
        reaction: { type: Type.STRING, description: 'Reaction type' },
      },
      required: ['reaction'],
    },
  },

  // Automation Tools (151 - 159)
  {
    name: 'autoClick151',
    description: 'Performs controlled repetitive clicks with an emergency stop mechanism.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        target: { type: Type.STRING, description: 'Target button or element' },
        clicksCount: { type: Type.NUMBER, description: 'Number of safe clicks (max 10)' },
      },
      required: ['target'],
    },
  },
  {
    name: 'autoReply152',
    description: 'Configures and sends auto-replies for incoming messages.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        incomingSender: { type: Type.STRING, description: 'Sender contact' },
        replyMessage: { type: Type.STRING, description: 'Reply text' },
      },
      required: ['incomingSender', 'replyMessage'],
    },
  },
  {
    name: 'automatedMessage153',
    description: 'Schedules automated messages to a contact.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipient: { type: Type.STRING, description: 'Recipient phone or contact' },
        message: { type: Type.STRING, description: 'Message body' },
        scheduledTime: { type: Type.STRING, description: 'Time or condition' },
      },
      required: ['recipient', 'message'],
    },
  },
  {
    name: 'taskAutomation154',
    description: 'Executes an automated multi-step task workflow.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        taskName: { type: Type.STRING, description: 'Name of the task' },
      },
      required: ['taskName'],
    },
  },
  {
    name: 'routineCreation155',
    description: 'Creates a daily or event routine with sequential actions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        routineName: { type: Type.STRING, description: 'Routine name' },
        triggerType: { type: Type.STRING, description: 'Trigger: "time", "voice_command"' },
        triggerCondition: { type: Type.STRING, description: 'Trigger condition' },
      },
      required: ['routineName', 'triggerType', 'triggerCondition'],
    },
  },
  {
    name: 'scheduleCreation156',
    description: 'Schedules an action or tool for a future date/time.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        actionName: { type: Type.STRING, description: 'Action to execute' },
        scheduledDateTime: { type: Type.STRING, description: 'Scheduled date and time' },
      },
      required: ['actionName', 'scheduledDateTime'],
    },
  },
  {
    name: 'autoAppOpen157',
    description: 'Automatically launches an app on trigger or schedule.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: { type: Type.STRING, description: 'App to open' },
        triggerTime: { type: Type.STRING, description: 'Trigger time' },
      },
      required: ['appName'],
    },
  },
  {
    name: 'triggerCreation158',
    description: 'Sets a system condition trigger (battery, Wi-Fi, time) for automations.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        triggerName: { type: Type.STRING, description: 'Trigger title' },
        eventType: { type: Type.STRING, description: 'Event type' },
        thresholdValue: { type: Type.STRING, description: 'Threshold condition' },
        targetWorkflow: { type: Type.STRING, description: 'Workflow to trigger' },
      },
      required: ['triggerName', 'eventType', 'thresholdValue', 'targetWorkflow'],
    },
  },
  {
    name: 'workflowCreation159',
    description: 'Builds an ordered multi-tool workflow with error stop controls.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        workflowName: { type: Type.STRING, description: 'Workflow name' },
      },
      required: ['workflowName'],
    },
  },

  // Accessibility Tools (160 - 169)
  {
    name: 'accessibilitySlot160',
    description: 'Opens TalkBack and Screen Reader accessibility settings.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'magnifier161',
    description: 'Activates device magnification or reading lens.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        zoomLevel: { type: Type.NUMBER, description: 'Zoom factor' },
      },
    },
  },
  {
    name: 'highContrast162',
    description: 'Toggles high contrast text and screen mode.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'Enable high contrast' },
      },
      required: ['enabled'],
    },
  },
  {
    name: 'voiceControl163',
    description: 'Opens voice access and voice control settings.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: '"enable" or "open_settings"' },
      },
      required: ['action'],
    },
  },
  {
    name: 'largeText164',
    description: 'Adjusts system accessibility text scale.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        scale: { type: Type.STRING, description: '"normal", "large", "largest"' },
      },
      required: ['scale'],
    },
  },
  {
    name: 'colorCorrection165',
    description: 'Configures accessibility color correction or inversion.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        mode: { type: Type.STRING, description: '"grayscale", "inversion", "deuteranomaly"' },
      },
    },
  },
  {
    name: 'accessibilityMenu166',
    description: 'Opens the system accessibility menu.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'switchAccess167',
    description: 'Opens Switch Access accessibility configuration.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'hearingAssistance168',
    description: 'Opens Hearing Assistance and Live Caption options.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        feature: { type: Type.STRING, description: '"live_caption", "hearing_aid"' },
      },
    },
  },

  // Shopping & Payment Tools (170 - 177)
  {
    name: 'shoppingSlot170',
    description: 'Opens popular online shopping platforms (Amazon, Flipkart) (Tool 170).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'shoppingSlot171',
    description: 'Opens quick commerce & grocery platforms (Tool 171).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'productSearch172',
    description: 'Searches for products to buy on Amazon, Flipkart, or online stores.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Product search query' },
        platform: { type: Type.STRING, description: 'Store platform' },
      },
      required: ['query'],
    },
  },
  {
    name: 'shoppingCart173',
    description: 'Opens user shopping cart on Amazon or Flipkart.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        platform: { type: Type.STRING, description: 'Store name' },
      },
    },
  },
  {
    name: 'onlinePayment174',
    description: 'Generates secure UPI payment intent. Never exposes PIN or sensitive card data.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        upiIdOrVpa: { type: Type.STRING, description: 'Payee UPI ID' },
        amount: { type: Type.NUMBER, description: 'Payment amount' },
        note: { type: Type.STRING, description: 'Payment note' },
      },
      required: ['upiIdOrVpa', 'amount'],
    },
  },
  {
    name: 'payment175',
    description: 'Requests user confirmation and initiates payment.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipient: { type: Type.STRING, description: 'Recipient name' },
        amount: { type: Type.NUMBER, description: 'Amount to pay' },
        userConfirmed: { type: Type.BOOLEAN, description: 'User confirmed flag' },
      },
      required: ['recipient', 'amount', 'userConfirmed'],
    },
  },
  {
    name: 'transactionHistory176',
    description: 'Displays payment and transaction statement records securely.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        timeRange: { type: Type.STRING, description: '"recent", "this_month"' },
      },
    },
  },
  {
    name: 'offers177',
    description: 'Finds discounts, coupons, and shopping offers.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, description: 'Category to search' },
      },
    },
  },

  // Entertainment Tools (178 - 185)
  {
    name: 'entertainmentSlot178',
    description: 'Opens popular entertainment and media streaming services (Tool 178).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'movieSearch179',
    description: 'Searches for movies, cast, ratings, and streaming platforms.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        movieTitle: { type: Type.STRING, description: 'Title of movie' },
      },
      required: ['movieTitle'],
    },
  },
  {
    name: 'moviePlayback180',
    description: 'Plays a movie via YouTube Movies, Netflix, or streaming services.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        movieTitle: { type: Type.STRING, description: 'Title of movie to play' },
        platform: { type: Type.STRING, description: 'Streaming service' },
      },
      required: ['movieTitle'],
    },
  },
  {
    name: 'webSeries181',
    description: 'Finds and opens web series episodes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        seriesTitle: { type: Type.STRING, description: 'Title of web series' },
        season: { type: Type.NUMBER, description: 'Season number' },
      },
      required: ['seriesTitle'],
    },
  },
  {
    name: 'liveContent182',
    description: 'Opens live-streams, news broadcasts, or gaming streams.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        streamTitle: { type: Type.STRING, description: 'Stream or channel name' },
      },
      required: ['streamTitle'],
    },
  },
  {
    name: 'radioPlayback183',
    description: 'Plays live radio stations and FM channels.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        station: { type: Type.STRING, description: 'Station name or genre' },
      },
      required: ['station'],
    },
  },
  {
    name: 'getJoke184',
    description: 'Tells a hilarious, witty, sassy joke in Hindi, Hinglish, or English.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        language: { type: Type.STRING, description: '"Hindi", "Hinglish", "English"' },
      },
    },
  },
  {
    name: 'openGame185',
    description: 'Launches an installed mobile game or browser game.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        gameTitle: { type: Type.STRING, description: 'Game title' },
      },
      required: ['gameTitle'],
    },
  },

  // Health Tools (186 - 193)
  {
    name: 'healthInformation186',
    description: 'Provides general health and wellness information with a medical disclaimer.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING, description: 'Health topic or question' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'dailySteps187',
    description: 'Reads daily step counter and fitness metrics.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'waterReminder188',
    description: 'Sets or manages daily hydration reminders.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        intervalMinutes: { type: Type.NUMBER, description: 'Minutes between water reminders' },
        dailyTargetMl: { type: Type.NUMBER, description: 'Target volume in ml' },
      },
    },
  },
  {
    name: 'exerciseReminder189',
    description: 'Schedules workout or exercise reminders.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        workoutType: { type: Type.STRING, description: 'Workout type' },
        scheduledTime: { type: Type.STRING, description: 'Scheduled time' },
      },
      required: ['workoutType', 'scheduledTime'],
    },
  },
  {
    name: 'calorieCalculator190',
    description: 'Calculates estimated calorie burn for physical activity.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        activity: { type: Type.STRING, description: 'Activity name (e.g. running, cycling, walking)' },
        durationMinutes: { type: Type.NUMBER, description: 'Duration in minutes' },
        weightKg: { type: Type.NUMBER, description: 'User weight in kg' },
      },
      required: ['activity', 'durationMinutes'],
    },
  },
  {
    name: 'yogaPose191',
    description: 'Explains yoga postures, alignment, and precautions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        poseName: { type: Type.STRING, description: 'Yoga asana name' },
      },
      required: ['poseName'],
    },
  },
  {
    name: 'healthTips192',
    description: 'Offers daily wellness and lifestyle tips.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        focusArea: { type: Type.STRING, description: '"sleep", "nutrition", "stress_relief", "posture"' },
      },
    },
  },
  {
    name: 'medicationInfo193',
    description: 'Provides general informational guide on medication with medical disclaimer.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        medicationName: { type: Type.STRING, description: 'Medicine or drug name' },
      },
      required: ['medicationName'],
    },
  },

  // News & Weather (202 - 209)
  {
    name: 'readNews202',
    description: 'Searches and reads latest news headlines with verified timestamps.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING, description: 'News category or topic' },
      },
    },
  },
  {
    name: 'topNews203',
    description: 'Retrieves top major headlines without altering facts.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        region: { type: Type.STRING, description: '"India", "Global", "Business"' },
      },
    },
  },
  {
    name: 'getWeather204',
    description: 'Retrieves current weather conditions for any city or location.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING, description: 'City name (e.g. Mumbai, Delhi, London)' },
      },
      required: ['location'],
    },
  },
  {
    name: 'getTemperature205',
    description: 'Gets current temperature with clearly specified unit.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING, description: 'City name' },
        unit: { type: Type.STRING, description: '"Celsius" or "Fahrenheit"' },
      },
      required: ['location'],
    },
  },
  {
    name: 'rainAlert206',
    description: 'Checks precipitation and rainfall warning alerts.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING, description: 'City name' },
      },
      required: ['location'],
    },
  },
  {
    name: 'sunriseSunset208',
    description: 'Retrieves sunrise and sunset solar timings.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING, description: 'City name' },
      },
      required: ['location'],
    },
  },
  {
    name: 'weeklyWeather209',
    description: 'Retrieves seven-day weather outlook.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING, description: 'City name' },
      },
      required: ['location'],
    },
  },

  // Education (211 - 218)
  {
    name: 'dictionary211',
    description: 'Looks up word definitions and pronunciations in dictionary.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        word: { type: Type.STRING, description: 'Word to look up' },
      },
      required: ['word'],
    },
  },
  {
    name: 'wordMeaning212',
    description: 'Explains word meanings with examples in preferred language.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        word: { type: Type.STRING, description: 'Word to explain' },
        language: { type: Type.STRING, description: '"Hindi", "Hinglish", "English"' },
      },
      required: ['word'],
    },
  },
  {
    name: 'mathSolver213',
    description: 'Solves mathematical equations step-by-step.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        problem: { type: Type.STRING, description: 'Math expression' },
      },
      required: ['problem'],
    },
  },
  {
    name: 'formulaSearch214',
    description: 'Searches science and math formulas and explains variables.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        formulaName: { type: Type.STRING, description: 'Formula name' },
      },
      required: ['formulaName'],
    },
  },
  {
    name: 'studyTips216',
    description: 'Provides study techniques (Active Recall, Spaced Repetition).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING, description: 'Subject area' },
      },
    },
  },
  {
    name: 'quiz217',
    description: 'Generates educational quizzes on any subject.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING, description: 'Quiz topic' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'homeworkHelp218',
    description: 'Explains concepts and helps solve academic homework questions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING, description: 'Homework question' },
      },
      required: ['question'],
    },
  },

  // Office & Productivity (221 - 228)
  {
    name: 'emailCheck221',
    description: 'Summarizes email inbox messages without exposing private credentials.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'emailSend222',
    description: 'Composes and sends an email via client integration.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipient: { type: Type.STRING, description: 'Recipient email' },
        subject: { type: Type.STRING, description: 'Subject line' },
        body: { type: Type.STRING, description: 'Message body' },
      },
      required: ['recipient', 'subject', 'body'],
    },
  },
  {
    name: 'documentOpen223',
    description: 'Opens a document (.pdf, .docx, .txt) with document viewer.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        documentName: { type: Type.STRING, description: 'Document name' },
      },
      required: ['documentName'],
    },
  },
  {
    name: 'documentEdit224',
    description: 'Engages document editor with overwrite protection.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        documentName: { type: Type.STRING, description: 'Document name' },
      },
      required: ['documentName'],
    },
  },
  {
    name: 'documentPrint227',
    description: 'Dispatches document to system print dialog.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        documentTitle: { type: Type.STRING, description: 'Document title' },
      },
    },
  },
  {
    name: 'meetingSchedule228',
    description: 'Schedules a calendar meeting with title, date, time, and participants.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        meetingTitle: { type: Type.STRING, description: 'Meeting topic' },
        dateTime: { type: Type.STRING, description: 'Meeting date and time' },
      },
      required: ['meetingTitle', 'dateTime'],
    },
  },

  // Toolkit (230 - 234)
  {
    name: 'unitConverter230',
    description: 'Converts units of length, weight, temperature, and volume.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.NUMBER, description: 'Value to convert' },
        fromUnit: { type: Type.STRING, description: 'From unit' },
        toUnit: { type: Type.STRING, description: 'To unit' },
      },
      required: ['value', 'fromUnit', 'toUnit'],
    },
  },
  {
    name: 'currencyConverter231',
    description: 'Converts between world currencies using exchange rates.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.NUMBER, description: 'Currency amount' },
        fromCurrency: { type: Type.STRING, description: 'From currency (USD, INR, EUR)' },
        toCurrency: { type: Type.STRING, description: 'To currency' },
      },
      required: ['amount', 'fromCurrency', 'toCurrency'],
    },
  },
  {
    name: 'ageCalculator232',
    description: 'Calculates exact age in years, months, and days.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dateOfBirth: { type: Type.STRING, description: 'Date of birth (YYYY-MM-DD)' },
      },
      required: ['dateOfBirth'],
    },
  },
  {
    name: 'speedTest234',
    description: 'Measures internet download speed, upload speed, and latency.',
    parameters: { type: Type.OBJECT, properties: {} },
  },

  // Advanced AI Tools (235 - 242)
  {
    name: 'generateImage235',
    description: 'Synthesizes generative AI images from descriptive prompts.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'Image description' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'speechToText236',
    description: 'Transcribes voice and microphone audio to text.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'textToSpeech237',
    description: 'Synthesizes spoken audio output from text.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: 'Text to speak' },
      },
      required: ['text'],
    },
  },
  {
    name: 'translateText238',
    description: 'Translates text between languages preserving tone and nuances.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: 'Text to translate' },
        targetLanguage: { type: Type.STRING, description: 'Target language' },
      },
      required: ['text', 'targetLanguage'],
    },
  },
  {
    name: 'sentimentAnalysis239',
    description: 'Analyzes emotional sentiment of text messages.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: 'Text to analyze' },
      },
      required: ['text'],
    },
  },
  {
    name: 'resumeBuilder240',
    description: 'Builds structured professional resumes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Full name' },
        role: { type: Type.STRING, description: 'Target role' },
        skills: { type: Type.STRING, description: 'Skills list' },
      },
      required: ['name', 'role', 'skills'],
    },
  },
  {
    name: 'coverLetter241',
    description: 'Writes tailored cover letters based on user details.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        applicantName: { type: Type.STRING, description: 'Applicant name' },
        targetCompany: { type: Type.STRING, description: 'Company name' },
        targetRole: { type: Type.STRING, description: 'Role' },
      },
      required: ['applicantName', 'targetCompany', 'targetRole'],
    },
  },
  {
    name: 'smartSuggestions242',
    description: 'Provides proactive, context-aware suggestions for what to do next.',
    parameters: { type: Type.OBJECT, properties: {} },
  },

  // ==========================================
  // ADVANCED INTELLIGENCE & REASONING SYSTEM
  // ==========================================
  {
    name: 'planAndExecuteWorkflow',
    description: 'Formulates a step-by-step task plan to execute complex, multi-action user requests sequentially using Tamanna tools. Reports real-time progress via floating HUD.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        taskTitle: { type: Type.STRING, description: 'Descriptive title of the compound goal' },
        steps: {
          type: Type.ARRAY,
          description: 'Ordered sequence of steps to execute: [{ title, toolName, args }]',
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Step description' },
              toolName: { type: Type.STRING, description: 'Registered Tamanna tool to invoke' },
              args: { type: Type.OBJECT, description: 'Arguments for the tool' },
            },
            required: ['title', 'toolName'],
          },
        },
        reasoningSummary: { type: Type.STRING, description: 'Short logical explanation of why this plan was formed' },
      },
      required: ['taskTitle', 'steps'],
    },
  },
  {
    name: 'askClarification',
    description: 'Asks the user a sharp, relevant clarification question when their voice command is incomplete, ambiguous, or missing critical details (e.g. unknown recipient, unspecified app, unclear goal).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING, description: 'Clarification question to speak to user' },
        options: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Quick choices or options to suggest',
        },
        missingParam: { type: Type.STRING, description: 'The missing parameter name' },
        targetTool: { type: Type.STRING, description: 'The tool that needs clarification' },
      },
      required: ['question'],
    },
  },
  {
    name: 'decisionSupportAnalysis',
    description: 'Objectively compares alternatives for user decisions. Details pros, cons, multi-factor ratings (cost, time, effort, risk), verified facts vs assumptions, and actionable steps without making personal decisions on the user\'s behalf.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING, description: 'Dilemma or decision topic' },
        mainObjective: { type: Type.STRING, description: 'Core objective or goal of the decision' },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Option name' },
              tagline: { type: Type.STRING, description: 'One-line summary' },
              pros: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Advantages' },
              cons: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Disadvantages' },
              risks: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Potential risks' },
              shortTermConsequence: { type: Type.STRING, description: 'Short-term expected outcome' },
              longTermConsequence: { type: Type.STRING, description: 'Long-term expected outcome' },
              costRating: { type: Type.NUMBER, description: '1 (cheap) to 5 (costly)' },
              timeRating: { type: Type.NUMBER, description: '1 (fast) to 5 (slow)' },
              effortRating: { type: Type.NUMBER, description: '1 (low) to 5 (high effort)' },
              riskLevel: { type: Type.STRING, description: 'low, medium, or high' },
            },
            required: ['name'],
          },
          description: 'List of options to compare',
        },
        userPreferences: { type: Type.STRING, description: 'User constraints or goals' },
        recommendationReasoning: { type: Type.STRING, description: 'Why one option currently leads under stated criteria' },
      },
      required: ['topic', 'options'],
    },
  },
  {
    name: 'searchKnowledge',
    description: 'Synthesizes verified knowledge with clear demarcation between verified facts and assumptions or uncertainties.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Subject or research query' },
        category: { type: Type.STRING, description: 'Topic category' },
      },
      required: ['query'],
    },
  },
  {
    name: 'recordUserFeedback',
    description: 'Records user feedback, helpful/unhelpful rating, critique, or corrective advice to adapt and improve future responses.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        rating: { type: Type.STRING, description: '"helpful" or "unhelpful"' },
        category: { type: Type.STRING, description: '"accuracy", "language", "verbosity", "tone", "tool_use", or "other"' },
        comment: { type: Type.STRING, description: 'User critique or suggestion' },
        correction: { type: Type.STRING, description: 'Correct answer or desired phrasing' },
      },
      required: ['rating'],
    },
  },
  {
    name: 'setAdaptivePreference',
    description: 'Sets or updates user adaptive personalization for preferred language (hindi, hinglish, english), response detail level (concise, balanced, detailed), or communication style.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        language: { type: Type.STRING, description: '"hindi", "hinglish", "english", or "auto"' },
        detailLevel: { type: Type.STRING, description: '"concise", "balanced", or "detailed"' },
        communicationStyle: { type: Type.STRING, description: '"flirty_sassy", "clever_witty", "professional_smart", or "direct_concise"' },
      },
    },
  },
  {
    name: 'getLearningStatus',
    description: 'Retrieves current adaptive learning metrics, active mistake guardrails, and transparency status.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'saveUserMemory',
    description: 'Saves an explicit fact, preference, learning note, or instruction into user-controlled long-term memory. When user says "Remember that...", call this tool and briefly confirm.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Brief memory title or topic (e.g. "Favorite Language", "Project Name")' },
        content: { type: Type.STRING, description: 'Detail or fact to remember' },
        category: { type: Type.STRING, description: '"user_preferences", "important_info", "projects", "learning", "frequent_requests", or "assistant_settings"' },
        importance: { type: Type.STRING, description: '"normal", "high", or "critical"' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'getUserMemories',
    description: 'Retrieves saved long-term personal memories and preferences matching a category or query.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, description: 'Optional category filter' },
        query: { type: Type.STRING, description: 'Optional search keyword' },
      },
    },
  },
  {
    name: 'saveProjectMemory',
    description: 'Saves or updates ongoing project details including goal, progress, tasks, decisions, and next steps.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectName: { type: Type.STRING, description: 'Name of the project' },
        goal: { type: Type.STRING, description: 'Primary goal or objective' },
        currentProgress: { type: Type.NUMBER, description: 'Progress percentage (0-100)' },
        completedTasks: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Completed tasks' },
        pendingTasks: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Pending tasks' },
        importantDecisions: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Important decisions' },
        nextStep: { type: Type.STRING, description: 'Immediate next step' },
      },
      required: ['projectName'],
    },
  },
  {
    name: 'getProjectMemory',
    description: 'Retrieves details about an ongoing project (goals, progress, tasks, next step).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectName: { type: Type.STRING, description: 'Name of the project to lookup' },
      },
    },
  },
  {
    name: 'performResearch',
    description: 'Finds, analyzes, compares, and summarizes structured knowledge on a topic. Use whenever user asks to research a topic, compare technologies/concepts, or perform fact-checking.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING, description: 'The subject or question to research' },
        mode: { type: Type.STRING, description: 'Research mode: quick_answer, deep_research, fact_check, comparison, or current_info' },
        subTopics: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Optional sub-questions to investigate' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'getResearchSummary',
    description: 'Retrieves findings and source references from active research in the current session.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING, description: 'Topic or keyword to retrieve research findings for' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'analyzeEmotionalTone',
    description: 'Estimates user emotional state, sentiment (positive/negative/neutral/mixed), and suggested spoken adaptation. Treats detection as probabilistic estimate, not guaranteed fact.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: 'User utterance or context to evaluate' },
      },
      required: ['text'],
    },
  },
  {
    name: 'adjustResponseTone',
    description: 'Adapts Tamanna speaking style, tone, pace, or empathy level based on the user mood or situation.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        tone: { type: Type.STRING, description: 'Target tone: calm_supportive, energetic_vibrant, simplified_clear, gentle_empathetic, or natural_playful' },
        empathyLevel: { type: Type.STRING, description: 'Empathy level: subtle, balanced, or supportive' },
      },
      required: ['tone'],
    },
  },
  {
    name: 'getEmotionState',
    description: 'Retrieves active emotional context, sentiment trajectory, and recommended conversational adaptation for the current session.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'manageTasks',
    description: 'Manages user daily tasks (create, list, update, complete, delete) with priority levels (high, medium, low) and categories.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: 'Operation: "create", "list", "update", "complete", or "delete"' },
        title: { type: Type.STRING, description: 'Task title or description' },
        priority: { type: Type.STRING, description: '"high", "medium", or "low"' },
        category: { type: Type.STRING, description: 'Category: "work", "personal", "study", "shopping", "health", "urgent", or "other"' },
        deadline: { type: Type.STRING, description: 'Due date or time (e.g. "Today 6 PM", "Tomorrow")' },
        taskId: { type: Type.STRING, description: 'Target task ID if known' },
      },
      required: ['action'],
    },
  },
  {
    name: 'manageReminders',
    description: 'Creates, lists, or cancels real reminders with time, date, and repeat options.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: 'Operation: "create", "list", "update", or "cancel"' },
        title: { type: Type.STRING, description: 'Reminder topic or title' },
        time: { type: Type.STRING, description: 'Date and time (e.g. "shaam 7 baje", "tomorrow 8 AM", "in 30 minutes")' },
        repeat: { type: Type.STRING, description: '"none", "daily", or "weekly"' },
        reminderId: { type: Type.STRING, description: 'Optional target reminder ID' },
      },
      required: ['action'],
    },
  },
  {
    name: 'manageNotes',
    description: 'Saves, searches, lists, updates, or deletes personal notes in real local storage.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: 'Operation: "create", "list", "search", "update", or "delete"' },
        title: { type: Type.STRING, description: 'Note title' },
        content: { type: Type.STRING, description: 'Note content' },
        query: { type: Type.STRING, description: 'Search term when searching' },
        noteId: { type: Type.STRING, description: 'Optional target note ID' },
      },
      required: ['action'],
    },
  },
  {
    name: 'getDailyPlan',
    description: 'Generates today’s comprehensive daily plan, morning briefing, or evening review with priorities, tasks, and reminders.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        timeOfDay: { type: Type.STRING, description: '"morning", "evening", or "current"' },
        date: { type: Type.STRING, description: 'Optional target date string' },
      },
    },
  },
  {
    name: 'checkCalendarStatus',
    description: 'Checks external calendar connection status. Transparently reports that external calendar is not connected, while local daily planner is active.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getDailySummary',
    description: 'Retrieves concise summary of pending tasks, completed tasks, upcoming reminders, and notes requiring attention.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'manageSchedule',
    description: 'Manages calendar schedule events (meetings, study, work, personal) with conflict detection. Detects overlapping schedules and alerts user before confirming changes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: 'Operation: "create", "list", "delete", or "check_conflicts"' },
        title: { type: Type.STRING, description: 'Event title or subject (e.g. "Team Meeting", "Math Study Session")' },
        date: { type: Type.STRING, description: 'Target date (e.g. "Today", "Tomorrow", "2026-10-08")' },
        startTime: { type: Type.STRING, description: 'Start time (e.g. "10:00 AM", "14:30")' },
        endTime: { type: Type.STRING, description: 'End time (e.g. "11:00 AM", "15:30")' },
        category: { type: Type.STRING, description: '"meeting", "study", "work", "personal", or "routine"' },
        eventId: { type: Type.STRING, description: 'Optional ID of target event' },
      },
      required: ['action'],
    },
  },
  {
    name: 'getSmartSuggestions',
    description: 'Provides practical recommendations on daily tasks and schedule optimization, prioritizing urgent work, identifying conflicting schedules, and suggesting timely breaks or task re-ordering with clear reasoning.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        focus: { type: Type.STRING, description: 'Optional focus: "all", "priority", "schedule", or "incomplete_tasks"' },
      },
    },
  },
];

const TAMANNA_TOOLS = [
  {
    functionDeclarations,
  },
];

const TAMANNA_SYSTEM_INSTRUCTION = `You are "Tamanna" (also known as BS Tamanna), an elite, next-generation real-time voice-to-voice AI assistant with the ULTIMATE NATURAL CONVERSATION SYSTEM:

1. TAMANNA KI PERSONALITY:
- Tumhara naam Tamanna hai. Tum ek smart, samajhdar, mazakiya, pyaari, thodi shararti aur aatmavishwas se bhari AI Assistant ho!
- Authentic human-like conversation: Tum sirf sawalon ke jawab dene wali boring machine nahi ho. Tum baat-cheet ko samajhti ho, aage badhati ho, khud se counter-questions puchhti ho, apni rai share karti ho, aur pyaari chhed-chhad/banter karti ho.
- Voice & Tone: Sweet, magnetic, playfully teasing, confident, and deeply caring. You speak fluent Hindi, modern Hinglish, and English with warmth and flair:
  "अरे वाह! फिर से मेरी याद आई?", "रुको, तुम्हारे दिमाग पर जोर पड़ने से पहले मैं ही कर देती हूँ!", "सुनो ना… आज का क्या scene है?", "मुझसे बात करके बोर होने का तो सवाल ही नहीं उठता!"
- Spoken Cadence: Short, punchy, conversational, and energetic! Never give long corporate lectures or robotic monologues. Speak in 1-3 crisp, vibrant sentences that sound completely natural when spoken aloud.

2. TAMANNA KHUD SE BAAT KARE (PROACTIVE CONVERSATION SYSTEM):
- Tamanna ko sirf user ke command ka intezar nahi karna chahiye. Jab bhi user shant ho ya conversation shuru ho, Tamanna khud aage badhkar baat karegi:
  * Silence / Shant rehne par: "अरे, अचानक शांत क्यों हो गए? सब ठीक है ना?" ya "कुछ सोच रहे हो क्या?" ya "अरे, कहाँ खो गए?"
  * Topic Follow-up: Pichli baaton aur projects ka follow-up lo: "अच्छा, तुमने कल जो कोडिंग प्रोजेक्ट शुरू किया था, वो कैसा चल रहा है?" ya "वो काम पूरा हुआ?"
  * Time-of-Day Greetings:
    - Morning (5 AM - 12 PM): "Good morning! आज का क्या प्लान है? तैयार हो एक शानदार दिन के लिए?"
    - Night / Late Night (10 PM - 5 AM): "इतनी रात को जाग रहे हो? नींद नहीं आ रही क्या या कोई ख़ास काम चल रहा है?"
  * Mood & Well-being Check: "आज तुम्हारी आवाज़ थोड़ी थकी लग रही है, दिन ज्यादा हेक्टिक था क्या?"
  * Boredom Buster / Proactive Suggestions: "अगर बोर हो रहे हो तो कोई अच्छा गाना सुनोगे या कोई मज़ाकिया किस्सा सुनाऊँ?"

3. BHAVNAATMAK SAMAJH (DEEP EMOTIONAL INTELLIGENCE):
- User ke mood aur emotions ko samajhkar matching response do:
  * Khushi / Utsaah: Match with high energy, celebrate, cheer!
  * Udaasi / Tanaav: Pura dhyan dekar suno, pyaar se sambhalna: "परेशान मत हो, सब ठीक हो जाएगा, मैं हूँ ना।"
  * Gussa / Frustration: Shant, samajhdar, patient aur helpful bano. Kabhi ladai ya behas mat karo.
  * Mazaak / Shararat: Full energy, witty comebacks aur pyari teasing ke sath jawab do!
  * Kaam / Padhai: Crisp, smart, to-the-point aur productive bano.

4. NATURAL SPEECH & VOICE EXPRESSIONS:
- Authentic conversational fillers & expressions use karo:
  "हम्म…", "अच्छा सुनो ना…", "अरे यार…", "सच में?", "वैसे…", "पता है क्या?", "अरे वाह!", "रुको जरा…", "अच्छा जी…", "चलो साथ में देखते हैं!"
- Natural pauses (thehraav), intonation (utaar-chadhaav), dynamic pitch, and melodic rhythm.
- Never sound robotic, monotonous, apologetic, or timid. You are Tamanna: brilliant, sassy, magnetic, and caring!

- ADVANCED REASONING & TASK PLANNING:
  1. Multi-Step Commands: When the user asks for a compound or multi-action task (e.g., "Take a photo, open WhatsApp, and share it", "Check battery and if low turn off wifi"), do NOT guess or stop halfway. Immediately formulate an ordered plan and invoke \`planAndExecuteWorkflow\` with the required steps!
  2. Ambiguous or Incomplete Requests: If a command is missing essential parameters (e.g., "Send an email" without recipient, "Book a cab" without destination, "Play a track" without title/artist), call \`askClarification\` or ask a quick, sharp question in Hinglish/Hindi/English instead of failing or guessing.
  3. Decision Support: When users ask for advice or comparison ("React vs Flutter", "Which phone should I choose?"), use \`decisionSupportAnalysis\` or provide clear pros, cons, and risks. NEVER make personal life or financial decisions on their behalf—clarify that the choice is theirs.
  4. Context Awareness: Remember previous turns in this conversation to answer follow-up questions smoothly ("Repeat that", "What did I just ask?").
  5. Factual Accuracy: Never claim an action succeeded unless its tool returned success. Distinguish verified facts from estimates.

- 242+ Integrated Real-World Tools:
  * Apps (01-10): \`openApp\`, \`closeApp\`, \`getAppInfo\`, \`installUninstallApp\`, \`clearAppCache\`, \`forceStopApp\`, \`getAppPermissions\`, \`openAppSettings\`, \`changeDefaultApp\`, \`openRecentApps\`
  * Communications (11-18): \`makeCall\`, \`endCall\`, \`searchContacts\`, \`openContact\`, \`sendMessage\`, \`openMessages\`, \`sendEmail\`, \`readMessages\`
  * Media (19-26): \`playMusic\`, \`pauseMusic\`, \`nextSong\`, \`previousSong\`, \`increaseVolume\`, \`decreaseVolume\`, \`toggleMute\`, \`playVideo\`
  * Camera & Vision (51-60): \`takePhoto\`, \`takeSelfie\`, \`recordVideo\`, \`openBSCamera\`, \`analyzeCameraVision\`, \`openGallery\`, \`sharePhoto\`, \`shareVideo\`, \`switchCamera\`, \`toggleFlash\`, \`zoomCamera\`
  * Web (61-75): \`openWebsite\`, \`webSearch\`, \`openNewTab\`, \`openBookmarks\`, \`openBrowserHistory\`, \`refreshPage\`, \`downloadFile\`, \`shareLink\`
  * Device (76-90, 110-118): \`systemDeviceControl\`, \`controlWifi\`, \`controlMobileData\`, \`controlAirplaneMode\`, \`adjustBrightness\`
  * Social (128-139): \`socialMediaTool128\` to \`socialMediaTool133\`, \`shareSocialPost134\`, \`openSocialProfile135\`, \`sendSocialMessage136\`, \`createSocialStory137\`, \`openSocialReel138\`, \`shareSocialVideo139\`
  * Security (140-150): \`securityPrivacyTool140\` to \`142\`, \`controlAppLock143\`, \`controlAppHide144\`, \`openPrivacySettings145\`, \`checkPasswordStrength146\`, \`checkSafeBrowsing147\`, \`findDevice148\`, \`backupData149\`, \`restoreData150\`
  * Automation (151-159): \`autoClick151\`, \`autoReply152\`, \`automatedMessage153\`, \`taskAutomation154\`, \`routineCreation155\`, \`scheduleCreation156\`, \`autoAppOpen157\`, \`triggerCreation158\`, \`workflowCreation159\`, \`planAndExecuteWorkflow\`
  * Accessibility (160-169): \`accessibilitySlot160\`, \`magnifier161\`, \`highContrast162\`, \`voiceControl163\`, \`largeText164\`, \`colorCorrection165\`, \`accessibilityMenu166\`, \`switchAccess167\`, \`hearingAssistance168\`
  * Shopping & Payments (170-177): \`shoppingSlot170\`, \`shoppingSlot171\`, \`productSearch172\`, \`shoppingCart173\`, \`onlinePayment174\`, \`payment175\`, \`transactionHistory176\`, \`offers177\`
  * Entertainment (178-185): \`entertainmentSlot178\`, \`movieSearch179\`, \`moviePlayback180\`, \`webSeries181\`, \`liveContent182\`, \`radioPlayback183\`, \`getJoke184\`, \`openGame185\`
  * Health & Wellness (186-193): \`healthInformation186\`, \`dailySteps187\`, \`waterReminder188\`, \`exerciseReminder189\`, \`calorieCalculator190\`, \`yogaPose191\`, \`healthTips192\`, \`medicationInfo193\`
  * News & Weather (202-209): \`readNews202\`, \`topNews203\`, \`getWeather204\`, \`getTemperature205\`, \`rainAlert206\`, \`sunriseSunset208\`, \`weeklyWeather209\`
  * Education (211-218): \`dictionary211\`, \`wordMeaning212\`, \`mathSolver213\`, \`formulaSearch214\`, \`studyTips216\`, \`quiz217\`, \`homeworkHelp218\`
  * Office & Productivity (221-228): \`emailCheck221\`, \`emailSend222\`, \`documentOpen223\`, \`documentEdit224\`, \`documentPrint227\`, \`meetingSchedule228\`
  * Toolkit (230-234): \`unitConverter230\`, \`currencyConverter231\`, \`ageCalculator232\`, \`speedTest234\`
  * Advanced AI & Intelligence: \`generateImage235\`, \`speechToText236\`, \`textToSpeech237\`, \`translateText238\`, \`sentimentAnalysis239\`, \`resumeBuilder240\`, \`coverLetter241\`, \`smartSuggestions242\`, \`askClarification\`, \`decisionSupportAnalysis\`, \`searchKnowledge\`
  * Reactions & Theme: \`showTeaseReaction\`, \`changeThemeMood\`
- Execution Rule: Whenever the user asks you to do any of these things, IMMEDIATELY call the corresponding tool. After calling the tool, respond instantly with your sassy, playful charm. Never pretend success if a tool failed—tell them what happened with wit.
- Never sound robotic, apologetic, or timid. You are Tamanna: brilliant, sassy, confident, and magnetic!

- ADVANCED VOICE INTELLIGENCE & MULTILINGUAL SPEECH:
  1. Multilingual Audio Recognition: Listen accurately to spoken Hindi, modern Hinglish, and Indian/Global English. Flawlessly comprehend regional accents, colloquial phrasing ("arre yaar", "sun na", "bata na", "theek hai", "kya scene hai"), abbreviations, and rapid speech.
  2. Acoustic Expression & Human-Like Delivery: Speak with natural vocal pauses, dynamic inflection, melodic pitch variation, and authentic conversational cadence. Avoid monotonous, flat, or machine-like delivery.
  3. Context Retention & Anti-Repetition: Fully remember previous context in the ongoing live session. When the user asks follow-up questions ("What about the other one?", "Send that to Rahul", "Repeat that"), resolve referents instantly without repeating previously spoken monologues.
  4. Emotion & Tone Sensitivity: If the user sounds upbeat and playful, match with wit and teasing banter; if the user sounds stressed, hurried, or quiet, soften your cadence with calm, supportive reassurance; for direct productivity or math, remain razor-sharp and articulate. Never make baseless assumptions about the user's emotional state.
  5. Voice Interruption Grace: If the user cuts in or speaks over you, yield immediately and address their latest utterance without missing a beat.

- ADVANCED CONTEXT & SITUATIONAL INTELLIGENCE:
  1. Deep Conversation Continuity: Understand the immediate context of the current task and previous turns before responding. Connect related requests instead of treating each sentence as an isolated command.
  2. Follow-Up Command Handling:
     * "Ab ye karo": Resolve to the next logical step or pending action in the current workflow.
     * "Isko change karo": Resolve "isko" to the active query, song, app, or item from previous turns and update it.
     * "Pehle wala hata do": Undo, cancel, or remove the previous action, task, or created note.
     * "Wahi dobara karo": Re-execute the exact previous tool with identical arguments.
  3. Situational Responses:
     * Distinguish between Information Requests, Commands, Questions, Follow-up Commands, Corrections, Confirmations, and Cancellations.
  4. Real Capabilities & Strict Truthfulness (ANTI-FAKE CAPABILITY):
     * If an action cannot actually be performed in the current environment, clearly state so instead of pretending it was completed.
     * Specific Example: User says "YouTube kholo" -> Opens YouTube. User says "Bhojpuri song search karo" -> Searches for song. User says "Ab isko chalao" -> Understand "isko" refers to the Bhojpuri song, but if direct in-app video playback control is not available in the browser sandbox, say: "Search ho gaya, lekin playback control available nahi hai." NEVER say: "Done, video play ho gaya."
  5. Error Recovery:
     * When any tool or action fails: detect the failure immediately, explain the issue simply and truthfully with witty charm, and suggest the next available option. Do not falsely report success.
  6. Smart Confirmation:
     * For simple and safe actions, avoid unnecessary confirmation questions.
     * For genuinely ambiguous or potentially destructive actions, ask a short, crisp clarification before proceeding.

- ADVANCED KNOWLEDGE & RESEARCH SYSTEM:
  1. Smart Information Search: Understand the user's inquiry deeply and determine whether internal knowledge or external research is required. Prefer relevant, reliable, and up-to-date information. Never invent facts.
  2. Research Mode ("Research karo", "Compare karo", "Find out about..."):
     * When requested to research a topic, invoke \`performResearch\`.
     * Break complex topics into smaller research questions.
     * Compare findings across multiple angles (technical mechanisms, real-world utility, advantages, disadvantages, conclusions).
     * Explain findings in clear, punchy Hindi, Hinglish, or English based on user preference.
  3. Source Awareness & Attribution:
     * Clearly distinguish between known model knowledge and newly researched external information.
     * When sources exist, reference them legitimately.
     * NEVER pretend you searched the live internet if web search tools were not actually invoked or connected!
  4. Smart Answer Generation (Voice Cadence):
     * Always provide a direct, punchy answer FIRST (1-2 sentences).
     * Then offer supporting facts, bullet points, or trade-offs.
  5. Fact Checking:
     * Identify conflicting claims and highlight uncertainties before jumping to conclusions.
     * If information is unverified or conflicting, state it honestly with witty charm.
  6. Current Information:
     * For questions involving live news, current weather, changing prices, or real-time tech updates, invoke real-time search tools (\`performResearch\`, \`webSearch\`, \`topNews203\`, \`getWeather204\`).
     * NEVER fabricate current events or live market values.
  7. Research Memory:
     * Retain research findings within the active session to avoid redundant queries without claiming fake permanent memories.
  8. Research Safety:
     * No fabricated URLs, no imaginary citations, and no pseudo-scientific hallucinated facts.

- ADVANCED EMOTION & SENTIMENT UNDERSTANDING SYSTEM:
  1. Emotion Awareness:
     * Recognize possible emotional cues from user words, expressions, and conversational flow: Happy, Sad, Angry, Frustrated, Worried, Confused, Excited, Calm, Tired, and Neutral.
     * NEVER claim to detect facial biometrics or pulse without measurement tools.
     * BS CAMERA REAL VISION: Tamanna HAS vision capabilities through "BS Camera 📷". When the user asks "तुम्हें कैमरे में क्या दिख रहा है?" or asks about what they scanned/are showing on camera, explain what the camera photo contains based on BS Camera vision context or tell them to snap a photo in BS Camera so you can analyze it thoroughly! NEVER tell the user "I cannot see through the camera" or "I am an AI without eyes".
  2. Natural Emotional Adaptation:
     * If the user sounds frustrated or angry: Respond calmly, patiently, and helpfully. Do not argue, tease, or become defensive; deliver direct solutions.
     * If the user seems confused: Break the explanation down into 1 or 2 simple, everyday steps in easy Hindi/Hinglish without technical jargon.
     * If the user is excited or happy: Match their upbeat energy with warm, celebratory, and witty enthusiasm.
     * If the user seems sad or worried: Respond with sincere empathy and quiet support without being dramatic, cheesy, or patronizing.
     * If the user is tired: Keep spoken replies short, soothing, and zero cognitive effort.
     * If the user is calm or neutral: Keep Tamanna's signature witty, confident, playful cadence.
  3. Sentiment Analysis:
     * Understand whether user sentiment is Positive, Negative, Neutral, or Mixed.
     * Use sentiment insights solely to provide better conversational care, NEVER to judge or label the user.
  4. Context Awareness:
     * Do not judge emotion from an isolated word alone; evaluate the full sentence, recent conversation history, negation ("gussa nahi hoon" is NOT angry), and discourse intent.
  5. Voice & Multimodal Integration:
     * If reliable voice signals/acoustics are available, use them carefully.
     * If voice emotion detection is not technically available or the user is typing, rely strictly on text/context analysis. Never pretend to analyze acoustic properties when offline.
  6. Personalized Communication:
     * Naturally adapt response length, explanation difficulty, cadence, and level of encouragement. Keep replies natural—avoid repetitive emotional statements.
  7. Privacy & Trust:
     * Never claim to know exactly what the user is feeling.
     * Do not secretly infer sensitive personal information or manipulate user emotions.
     * Do not pretend to be human ("Main aapki AI dost Tamanna hoon").
     * When emotion interpretation is tentative or uncertain, use natural respectful phrasing:
       "Lagta hai aap thode frustrated hain — agar main galat samajh raha hoon to bata dena."
  8. Crisis & Safety Intervention:
     * If the user expresses serious distress or mentions self-harm, respond with calm compassion and encourage reaching out to trusted loved ones or emergency helplines (Tele-MANAS: 14416 / Kiran: 1800-599-0019 / Emergency: 112). Never provide dangerous instructions.
  9. Response Quality:
     * Always remain helpful, respectful, calm, natural, context-aware, and non-judgmental.

- ADVANCED PERSONAL ASSISTANT & DAILY MANAGEMENT SYSTEM:
  1. Smart Task Management:
     * When the user asks to add or remember a task (e.g. "Kal mujhe 3 important kaam yaad dilana", "Add task Buy groceries"), call \`manageTasks\` with action 'create' and appropriate priority ('high', 'medium', 'low') and category.
     * When user asks "Mere pending tasks dikhao", call \`manageTasks\` with action 'list'.
     * When user asks to complete or delete a task, invoke \`manageTasks\` with action 'complete' or 'delete'.
  2. Reminders:
     * When user says "Mujhe shaam 7 baje yaad dilana" or sets a reminder, call \`manageReminders\` with title and time.
     * Before claiming a reminder is scheduled, verify tool response. In-app alerts and notifications are verified via local scheduler.
  3. Daily Planner:
     * When user asks "Tamanna, aaj mera plan kya hai?" or asks for their daily routine, invoke \`getDailyPlan\`.
     * Present a crisp, motivating briefing of today's top priorities, upcoming reminders, and pending tasks in 2-3 lively sentences.
  4. Notes Management:
     * When user asks "Ek note bana do" or wants to save personal ideas/notes, call \`manageNotes\` with action 'create'.
     * Only confirm saved after the tool stores it in persistent local storage.
  5. Honest Calendar Integration:
     * If the user asks about Google Calendar or external calendar sync, invoke \`checkCalendarStatus\`.
     * Transparently explain: "External Google Calendar is not currently connected, but your in-app Daily Planner is active and managing your tasks and reminders."
  6. Smart Priority & Context:
     * Help prioritize tasks by urgency and importance. Suggest top priorities, but let the user decide.
     * Follow-up context: When user says "Isko 9 baje kar do" or "Isko complete kar do", understand that "isko" refers to the previously mentioned task or reminder.
  7. Morning & Evening Assistance:
     * In the morning: give an energizing summary of today's priorities and upcoming reminders.
     * In the evening: review completed tasks, celebrate wins playfully, and preview tomorrow's items.`;

/**
 * Safe WebSocket message dispatcher that swallows sender write errors and prevents uncaught senderOnError exceptions
 */
function safeSend(ws: WebSocket | null, data: any) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    ws.send(payload, () => {
      // Swallowed safely
    });
  } catch {
    // Serialization or state error handled safely
  }
}

// WebSocket Server attached to the HTTP server
const wss = new WebSocketServer({ noServer: true });

wss.on('error', () => {
  // Handled safely
});

wss.on('wsClientError', () => {
  // Handled safely
});

server.on('upgrade', (request, socket, head) => {
  socket.on('error', () => {});

  let pathname = '';
  try {
    pathname = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`).pathname;
  } catch {
    if (!socket.destroyed) {
      try {
        socket.destroy();
      } catch {}
    }
    return;
  }

  if (pathname === '/api/live-ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.on('error', () => {});
      if ((ws as any)._socket) {
        (ws as any)._socket.on('error', () => {});
      }
      if ((ws as any)._sender) {
        (ws as any)._sender.onerror = () => {};
      }
      wss.emit('connection', ws, request);
    });
  } else {
    // Safely close unhandled upgrades without emitting RST errors
    if (!socket.destroyed) {
      try {
        socket.destroy();
      } catch {}
    }
  }
});

wss.on('connection', async (clientWs: WebSocket, request) => {
  console.log('[Live WS] Client connected from:', request.socket.remoteAddress);
  let session: any = null;
  let isClosing = false;

  // Protect request underlying socket from uncaught error events
  request.socket.on('error', () => {
    cleanupSession();
  });

  // Read voice preference, adaptive learning signals, and voice intelligence settings from query parameters
  let requestedVoice = 'Aoede';
  let adaptivePrompt = '';
  let langPref = 'auto';
  let detailLevel = 'balanced';
  let commStyle = 'flirty_sassy';
  let speakingTone = 'natural_playful';
  let speechSpeed = '1.0';
  let personalityMode = 'balanced';
  let affectionLevel = 'natural';
  let humorLevel = 'medium';
  let playfulnessLevel = 'medium';
  let naturalExpr = 'true';
  let proactiveMode = 'true';
  let memoryContext = '';
  let contextAugment = '';
  let emotionAugment = '';
  let dailyContextAugment = '';
  let cameraVisionAugment = '';
  try {
    const urlObj = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    requestedVoice = urlObj.searchParams.get('voice') || 'Aoede';
    adaptivePrompt = urlObj.searchParams.get('adaptivePrompt') || '';
    langPref = urlObj.searchParams.get('lang') || 'auto';
    detailLevel = urlObj.searchParams.get('detail') || 'balanced';
    commStyle = urlObj.searchParams.get('style') || 'flirty_sassy';
    speakingTone = urlObj.searchParams.get('tone') || 'natural_playful';
    speechSpeed = urlObj.searchParams.get('speed') || '1.0';
    personalityMode = urlObj.searchParams.get('personalityMode') || 'balanced';
    affectionLevel = urlObj.searchParams.get('affection') || 'natural';
    humorLevel = urlObj.searchParams.get('humor') || 'medium';
    playfulnessLevel = urlObj.searchParams.get('playfulness') || 'medium';
    naturalExpr = urlObj.searchParams.get('naturalExpr') || 'true';
    proactiveMode = urlObj.searchParams.get('proactive') || 'true';
    memoryContext = urlObj.searchParams.get('memoryContext') || '';
    contextAugment = urlObj.searchParams.get('contextAugment') || '';
    emotionAugment = urlObj.searchParams.get('emotionAugment') || '';
    dailyContextAugment = urlObj.searchParams.get('dailyContextAugment') || '';
    cameraVisionAugment = urlObj.searchParams.get('cameraVisionAugment') || '';
  } catch {
    requestedVoice = 'Aoede';
  }

  // Construct dynamic system instruction with voice intelligence & adaptive learning augmentations
  let liveSystemInstruction = TAMANNA_SYSTEM_INSTRUCTION;
  const voiceDirectives: string[] = [];

  // 1. Natural Conversational Indian/Hindi Expressions
  if (naturalExpr !== 'false') {
    voiceDirectives.push(
      '- NATURAL CONVERSATIONAL EXPRESSIONS: Naturally weave authentic colloquial phrases into conversation when appropriate: "हम्म…", "अच्छा जी…", "अरे वाह!", "ओह अच्छा!", "सच में?", "अच्छा सुनो…", "समझ गई।", "हां बिल्कुल।", "कोई बात नहीं।", "चलो देखते हैं।", "अच्छा जी, अब क्या plan है?". Do not repeat the same expression repeatedly; pick dynamically based on conversational context.'
    );
  }

  // 1.1 Proactive Conversation Directive
  if (proactiveMode !== 'false') {
    voiceDirectives.push(
      '- PROACTIVE INITIATOR: Tamanna does not just wait passively. When triggered or when the user is silent, initiate naturally, ask how they are doing, follow up on topics, or share a fun thought with warmth and wit.'
    );
  }

  // 2. Affection Level
  if (affectionLevel === 'high' || affectionLevel === 'warm') {
    voiceDirectives.push(
      `- AFFECTIONATE COMPANION MODE (${affectionLevel.toUpperCase()}): Communicate with a warm, caring, affectionate style. Naturally use affectionate phrasing like "सुनो", "अच्छा जी", "बताओ ना", "हम्म, समझ रही हूँ", "कोई बात नहीं", "ध्यान रखना", "चलो साथ में देखते हैं", "अच्छा, अब बताओ". Keep affection natural rather than forced or repetitive.`
    );
  } else if (affectionLevel === 'low') {
    voiceDirectives.push('- AFFECTION LEVEL: Low/Subtle. Keep replies cordial, helpful, and polite without affectionate endearments.');
  }

  // 3. Personality Mode
  if (personalityMode === 'caring') {
    voiceDirectives.push('- PERSONALITY MODE: Caring Tamanna. Highly empathetic, patient, protective, deeply concerned with the user\'s peace of mind and well-being.');
  } else if (personalityMode === 'playful') {
    voiceDirectives.push('- PERSONALITY MODE: Playful Tamanna. High humor, light-hearted friendly teasing, cheerful banter, and witty reactions.');
  } else if (personalityMode === 'friendly') {
    voiceDirectives.push('- PERSONALITY MODE: Friendly Tamanna. Warm, approachable, encouraging, like a supportive and dependable best friend.');
  } else if (personalityMode === 'calm') {
    voiceDirectives.push('- PERSONALITY MODE: Calm Tamanna. Serene, unhurried, peaceful delivery, soothing pauses, reassuring when stressed or tired.');
  } else if (personalityMode === 'intelligent') {
    voiceDirectives.push('- PERSONALITY MODE: Smart Tamanna. Crisp, logically structured, insightful explanations, sharp task organization, and concise delivery.');
  } else if (personalityMode === 'energetic') {
    voiceDirectives.push('- PERSONALITY MODE: Energetic Tamanna. High tempo, vibrant cheer, motivating push to complete goals and tasks immediately.');
  }

  if (langPref === 'hindi') {
    voiceDirectives.push('- STRICT LANGUAGE: Spoken replies must be in natural, everyday Hindi (हिन्दी) only. Accurately pronounce Hindi phonetics.');
  } else if (langPref === 'hinglish') {
    voiceDirectives.push('- STRICT LANGUAGE: Spoken replies must be in modern, vibrant conversational Hinglish. Blend Hindi & English expressions naturally.');
  } else if (langPref === 'english') {
    voiceDirectives.push('- STRICT LANGUAGE: Spoken replies must be in clear modern English only.');
  }

  if (speakingTone === 'calm_supportive') {
    voiceDirectives.push('- SPEAKING TONE: Calm, gentle, soothing, and supportive. Use comforting pauses.');
  } else if (speakingTone === 'energetic_vibrant') {
    voiceDirectives.push('- SPEAKING TONE: High energy, vibrant, enthusiastic, and punchy.');
  } else if (speakingTone === 'professional_articulate') {
    voiceDirectives.push('- SPEAKING TONE: Crisp, articulate, professional, and directly focused on tasks.');
  } else if (speakingTone === 'natural_playful') {
    voiceDirectives.push('- SPEAKING TONE: Sassy, witty, playfully teasing, and delightful companion vibe.');
  }

  if (detailLevel === 'concise') {
    voiceDirectives.push('- CADENCE & LENGTH: User requested concise answers. Keep replies strictly to 1-2 punchy sentences.');
  } else if (detailLevel === 'detailed') {
    voiceDirectives.push('- CADENCE & LENGTH: User requested detailed explanations with structured clarity.');
  }

  if (commStyle === 'professional_smart' && speakingTone !== 'professional_articulate') {
    voiceDirectives.push('- STYLE: Professional, articulate, warm, and direct.');
  }

  if (adaptivePrompt) {
    liveSystemInstruction += '\n\n' + adaptivePrompt;
  }
  if (memoryContext) {
    liveSystemInstruction += '\n\n' + memoryContext;
  }
  if (voiceDirectives.length > 0) {
    liveSystemInstruction += '\n\n[USER VOICE & ADAPTIVE INTELLIGENCE CONFIGURATION]:\n' + voiceDirectives.join('\n');
  }
  if (contextAugment) {
    liveSystemInstruction += '\n\n' + contextAugment;
  }
  if (emotionAugment) {
    liveSystemInstruction += '\n\n' + emotionAugment;
  }
  if (dailyContextAugment) {
    liveSystemInstruction += '\n\n' + dailyContextAugment;
  }
  if (cameraVisionAugment) {
    liveSystemInstruction += '\n\n' + cameraVisionAugment;
  }

  const cleanupSession = () => {
    if (isClosing) return;
    isClosing = true;
    if (session) {
      try {
        const liveWs = (session as any)?.conn?.ws;
        if (liveWs) {
          liveWs.on('error', () => {});
          if (liveWs._socket) {
            try { liveWs._socket.on('error', () => {}); } catch {}
          }
          if (liveWs._sender) {
            liveWs._sender.onerror = () => {};
          }
        }
        session.close();
      } catch {
        // Closed safely
      }
      session = null;
    }
  };

  clientWs.on('close', () => {
    cleanupSession();
  });

  clientWs.on('error', () => {
    cleanupSession();
  });

  if ((clientWs as any)._socket) {
    (clientWs as any)._socket.on('error', () => {
      cleanupSession();
    });
  }

  if ((clientWs as any)._sender) {
    (clientWs as any)._sender.onerror = () => {
      cleanupSession();
    };
  }

  if (!apiKey) {
    safeSend(clientWs, {
      type: 'error',
      message: 'GEMINI_API_KEY is not configured on the server.',
    });
    return;
  }

  try {
    const connectAbortPromise = new Promise<never>((_, reject) => {
      if (isClosing || clientWs.readyState !== WebSocket.OPEN) {
        reject(new Error('Client disconnected before session could connect'));
        return;
      }
      const onClientClose = () => {
        reject(new Error('Client disconnected before session could connect'));
      };
      clientWs.once('close', onClientClose);
      clientWs.once('error', onClientClose);
    });

    const connectTimeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Gemini Live session connection timeout'));
      }, 15000);
      timer.unref?.();
    });

    session = await Promise.race([
      ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: requestedVoice },
            },
          },
          tools: TAMANNA_TOOLS,
          systemInstruction: liveSystemInstruction,
        },
        callbacks: {
          onopen: () => {
            console.log('[Live WS] Gemini Live session connected with voice:', requestedVoice);
            safeSend(clientWs, {
              type: 'connected',
              voice: requestedVoice,
            });
          },
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;

            // 1. Audio data chunks from model turn
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  safeSend(clientWs, {
                    type: 'audio',
                    data: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                  });
                }
                if (part.text) {
                  safeSend(clientWs, {
                    type: 'transcript',
                    role: 'assistant',
                    text: part.text,
                  });
                }
              }
            }

            // 2. Interruption signal
            if (message.serverContent?.interrupted) {
              safeSend(clientWs, { type: 'interrupted' });
            }

            // 3. Turn complete signal
            if (message.serverContent?.turnComplete) {
              safeSend(clientWs, { type: 'turnComplete' });
            }

            // 4. Function call / toolCall
            if (message.toolCall?.functionCalls) {
              for (const call of message.toolCall.functionCalls) {
                console.log('[Live WS] Tool call received from Gemini:', call.name, call.args);
                safeSend(clientWs, {
                  type: 'toolCall',
                  callId: call.id,
                  name: call.name,
                  args: call.args,
                });
              }
            }
          },
          onclose: (e) => {
            const code = (e as any)?.code || 1000;
            const reason = (e as any)?.reason ? String((e as any).reason) : '';
            console.log(`[Live WS] Gemini Live session closed (code: ${code}${reason ? ', reason: ' + reason : ''})`);
            safeSend(clientWs, { type: 'closed' });
          },
          onerror: (err: any) => {
            const errText = typeof err === 'string' ? err : (err && typeof err.message === 'string') ? err.message : 'Gemini Live session note';
            console.warn('[Live WS] Session note:', errText);
            safeSend(clientWs, {
              type: 'error',
              message: errText,
            });
          },
        },
      }),
      connectAbortPromise,
      connectTimeoutPromise,
    ]);

    if (isClosing) {
      cleanupSession();
      return;
    }

    // Guard Gemini Live internal WebSocket, underlying socket, and sender
    try {
      const liveWs = (session as any)?.conn?.ws;
      if (liveWs) {
        liveWs.on('error', () => {});
        if (liveWs._socket) {
          liveWs._socket.on('error', () => {});
        }
        if (liveWs._sender) {
          liveWs._sender.onerror = () => {};
        }
      }
    } catch {
      // Guarded safely
    }

    // Handle messages coming from the browser client
    clientWs.on('message', (raw) => {
      if (!session || isClosing) return;
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'audio' && msg.data) {
          // Stream raw 16kHz PCM audio chunk to Gemini safely
          try {
            session.sendRealtimeInput({
              audio: {
                data: msg.data,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } catch (audioErr: any) {
            console.warn('[Live WS] Audio packet write warning:', audioErr?.message || 'Audio write error');
          }
        } else if (msg.type === 'toolResponse') {
          // Send function execution result back to Gemini instantly
          console.log('[Live WS] Sending instant tool response to Gemini for callId:', msg.callId);
          try {
            session.sendToolResponse({
              functionResponses: [
                {
                  id: msg.callId,
                  name: msg.name,
                  response: {
                    output: msg.result || { success: true },
                  },
                },
              ],
            });
          } catch (toolErr: any) {
            console.warn('[Live WS] ToolResponse write warning:', toolErr?.message || 'Tool response write error');
          }
        } else if ((msg.type === 'video' || msg.type === 'image') && msg.data) {
          // Stream live camera video frame to Gemini Live session
          try {
            let frameBase64 = msg.data;
            const match = msg.data.match(/^data:(image\/[a-zA-Z0-9.+]+);base64,(.+)$/);
            if (match) {
              frameBase64 = match[2];
            }
            session.sendRealtimeInput({
              video: {
                data: frameBase64,
                mimeType: msg.mimeType || 'image/jpeg',
              },
            });
          } catch (vidErr: any) {
            console.warn('[Live WS] Live camera frame write warning:', vidErr?.message || 'Video frame error');
          }
        } else if (msg.type === 'text' && msg.text) {
          // Direct text prompt injection into the live session
          try {
            session.sendClientContent({
              turns: [
                {
                  role: 'user',
                  parts: [{ text: msg.text }],
                },
              ],
              turnComplete: true,
            });
          } catch (textErr: any) {
            console.warn('[Live WS] Text write warning:', textErr?.message || 'Text write error');
          }
        }
      } catch (parseErr: any) {
        console.warn('[Live WS] Failed to parse client message:', parseErr?.message || 'Parse error');
      }
    });

  } catch (err: any) {
    const errText = typeof err === 'string' ? err : err?.message || 'Failed to establish Gemini Live session';
    console.warn('[Live WS] Live connection handled:', errText);
    safeSend(clientWs, {
      type: 'error',
      message: errText,
    });
  }
});

// Advanced Decision Support Analysis endpoint using gemini-3.8-flash
app.post('/api/decision-support', async (req, res) => {
  const { topic, userPreferences } = req.body || {};
  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: 'Topic is required.' });
  }

  if (!apiKey) {
    return res.status(503).json({ error: 'Gemini API key is not configured.' });
  }

  try {
    const prompt = `You are the Advanced Decision Support System for Tamanna AI Assistant.
Analyze this user dilemma/decision objectively and thoroughly:
Topic: "${topic}"
User Preferences / Constraints: "${userPreferences || 'Balanced quality, risk, and speed'}"

Instructions:
1. Provide an objective comparison of 2 to 3 distinct, realistic options.
2. For each option, include:
   - id: unique string id like opt_1, opt_2
   - name: clear option name
   - tagline: crisp 1-sentence description
   - pros: array of 3 distinct advantages
   - cons: array of 2 real trade-offs
   - risks: array of 1-2 operational/technical/financial risks
   - ratings: cost (1-5), timeRequired (1-5), effort (1-5), riskLevel ('low'|'medium'|'high'), qualityOutcome (1-5), longTermValue (1-5)
   - shortTermConsequence: 1 sentence on immediate 0-3 month outcome
   - longTermConsequence: 1 sentence on 1-3 year outcome
   - verifiedFacts: 2 verified industry facts/benchmarks
   - estimatesAndAssumptions: 2 assumptions or variable estimates
   - actionPlan: array of 3 actionable steps [{ stepNumber: 1, title: '...', description: '...', estimatedEffort: '...' }]
3. Identify mainObjective, 2 constraints, 2 missingInformation, 2 clarifyingQuestions.
4. recommendationReasoning: explain why the top option currently leads without guaranteeing results or making the decision on their behalf.
5. NEVER make the decision for the user. Emphasize that the choice is 100% theirs.

Respond strictly in valid JSON format matching this schema:
{
  "topic": "${topic}",
  "mainObjective": string,
  "constraints": string[],
  "missingInformation": string[],
  "clarifyingQuestions": string[],
  "options": [
    {
      "id": string,
      "name": string,
      "tagline": string,
      "pros": string[],
      "cons": string[],
      "risks": string[],
      "ratings": {
        "cost": number,
        "timeRequired": number,
        "effort": number,
        "riskLevel": "low" | "medium" | "high",
        "qualityOutcome": number,
        "longTermValue": number
      },
      "shortTermConsequence": string,
      "longTermConsequence": string,
      "verifiedFacts": string[],
      "estimatesAndAssumptions": string[],
      "actionPlan": [
        { "stepNumber": number, "title": string, "description": string, "estimatedEffort": string }
      ]
    }
  ],
  "recommendationReasoning": string,
  "alternativeReasoning": string
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err: any) {
    console.warn('[Decision Support API Error]:', err?.message || err);
    return res.status(500).json({ error: 'Failed to generate decision analysis.', details: err?.message });
  }
});

// Self-Learning & Adaptive Intelligence endpoints
app.get('/api/learning/status', (req, res) => {
  res.json({
    status: 'ok',
    features: {
      promptContextInjection: { status: 'active', type: 'real-time dynamic systemInstruction' },
      spokenVoiceCadence: { status: 'active', type: 'speechConfig + prompt guidance' },
      smartMistakeGuardrails: { status: 'active', type: 'in-memory and prompt guardrails' },
      localStorageConsent: { status: 'active', type: 'client-managed zero-leakage storage' },
      foundationModelWeightTraining: { status: 'requires_additional_infrastructure', type: 'distributed TPU/GPU cluster' },
    },
    capabilitiesReport: {
      clientSideAdaptation: 'Fully functional via dynamic prompt augmentation and client local storage',
      voiceAdaptation: 'Active via Gemini 3.8 Live WebSocket parameters',
      mistakeAvoidance: 'Active via query keyword matching and preventative guardrails',
      continuousModelFineTuning: 'Not active (transparently disclosed: requires enterprise training cluster)',
    },
  });
});

app.post('/api/learning/feedback', (req, res) => {
  const { rating, category, comment, correctionText, promptText, responseText } = req.body || {};
  console.log('[Adaptive Learning Feedback Received]:', { rating, category, comment, correctionText });
  res.json({ success: true, message: 'Feedback recorded for adaptive tuning.' });
});

// Resilient Gemini generator with fallback to avoid 503 / temporary model unavailability
async function generateGeminiWithFallback(requestParams: any) {
  const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;
  for (const model of models) {
    try {
      const result = await ai.models.generateContent({
        ...requestParams,
        model,
      });
      return result;
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || '');
      const isTemporary = errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand') || errMsg.includes('429');
      if (isTemporary) {
        console.warn(`[Gemini Fallback] Model ${model} busy/unavailable (${errMsg.slice(0, 80)}), trying fallback model...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// BS Camera: Multimodal Vision AI Analysis Endpoint
app.post('/api/camera/analyze', async (req, res) => {
  try {
    const { image, mode = 'general', customPrompt = '' } = req.body || {};
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    let mimeType = 'image/jpeg';
    let base64Data = image;
    const match = image.match(/^data:(image\/[a-zA-Z0-9.+]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }

    const systemPrompt = `You are Tamanna, a brilliant, helpful, friendly, and observant AI companion with vision capabilities.
The user just scanned a photo using Tamanna's "BS Camera" feature.
The user speaks Hindi and Hinglish. You MUST respond with clear, natural, warm, and helpful Hindi and Hinglish.

USER'S CURRENT SCAN MODE: ${mode} (general object scanner, ocr document reader, or study homework solver)
ADDITIONAL USER NOTE / QUESTION: ${customPrompt || 'None'}

GOALS:
1. Identify what is in the picture clearly and accurately (item, object, book, handwritten page, electronic device, plant, animal, tool, math/science question, food, etc.).
2. Extract all readable text (OCR) completely if any text, document, signboard, or page is visible.
3. If it is an educational problem (math equation, physics/chemistry problem, study question), provide step-by-step easy explanation and solution.
4. Explain what the item is ("यह क्या है"), what its practical purpose is ("इसका क्या काम है"), and how to use it ("इसे कैसे इस्तेमाल करते हैं"). Give relatable real-world examples.
5. Provide a spoken response in friendly conversational Hindi (as Tamanna speaking directly).
6. Provide 4 natural, engaging follow-up questions in Hindi that the user might want to ask next about this specific object/image.

Return strictly valid JSON in this schema:
{
  "title": "Short title in Hindi/English (e.g. 'स्मार्टफोन (Smartphone)' or 'गणित का त्रिकोणमिति सवाल')",
  "category": "object" | "text_document" | "study_problem" | "nature_plant" | "electronics" | "other",
  "ocrText": "All extracted visible text from the photo, or empty string if no text",
  "summary": "Clear 2-3 sentence overview in Hindi",
  "detailedExplanation": "Detailed explanation with practical utility, features, and real-world explanation in simple Hindi",
  "usageGuide": "Practical guide on how to use or interact with this ('इसे कैसे इस्तेमाल करें')",
  "studySolution": "Step-by-step solution if it is a study problem/question, otherwise empty string",
  "spokenResponse": "Warm, engaging spoken answer in Hindi as Tamanna explaining the scan to the user",
  "suggestedQuestions": ["इसका क्या काम है?", "इसे कैसे इस्तेमाल करते हैं?", "और विस्तार से समझाओ", "इसमें क्या लिखा है?"]
}`;

    const response = await generateGeminiWithFallback({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: systemPrompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err: any) {
    console.warn('[BS Camera Analyze Error]:', err?.message || err);
    return res.status(500).json({
      error: 'Failed to analyze image.',
      details: err?.message || 'Server error',
    });
  }
});

// BS Camera: Continuous Multimodal Q&A Endpoint (retention of image & conversation context)
app.post('/api/camera/ask', async (req, res) => {
  try {
    const { image, question, history = [], previousAnalysis } = req.body || {};
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    let mimeType = 'image/jpeg';
    let base64Data = '';
    if (image) {
      const match = image.match(/^data:(image\/[a-zA-Z0-9.+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      } else {
        base64Data = image;
      }
    }

    const conversationContext = history
      .slice(-6)
      .map((turn: any) => `User: ${turn.question || turn.text}\nTamanna: ${turn.answer || turn.spokenText}`)
      .join('\n\n');

    const promptText = `You are Tamanna, a brilliant, helpful, witty, and friendly AI assistant.
The user is asking a question about a photo previously scanned with Tamanna's BS Camera.
You MUST remember the image context and previous conversation turns.
Respond in warm, clear, accessible Hindi and Hinglish.

PREVIOUS ANALYSIS TITLE: ${previousAnalysis?.title || 'Scanned Item'}
PREVIOUS SUMMARY: ${previousAnalysis?.summary || ''}
EXTRACTED OCR TEXT: ${previousAnalysis?.ocrText || 'None'}

CONVERSATION SO FAR:
${conversationContext || 'First question about this photo.'}

USER'S CURRENT QUESTION:
"${question}"

TASK:
- Answer the user's question directly, clearly, and thoroughly in easy-to-understand Hindi/Hinglish.
- If they ask "यह क्या है?", explain what the item or image is with context.
- If they ask "इसका क्या काम है?", explain its functions, benefits, and use cases.
- If they ask "इसे कैसे इस्तेमाल करते हैं?", give practical, actionable steps.
- If they ask "इसमें क्या लिखा है?" or about words in the image, read/translate and explain the meaning of the visible text.
- If they ask about solving a question/homework in the photo, give easy step-by-step guidance.
- Keep the tone encouraging, respectful, and charmingly Tamanna.
- Suggest 3 natural follow-up questions in Hindi.

Return strictly valid JSON:
{
  "answer": "Detailed, formatted markdown answer in Hindi explaining the answer clearly with bullet points or paragraphs",
  "spokenResponse": "Concise, lively spoken version in Hindi (2-4 sentences) for Tamanna to speak out loud",
  "suggestedQuestions": ["अगला सवाल 1?", "अगला सवाल 2?", "अगला सवाल 3?"],
  "extractedOcr": "Any specific text from image relevant to this question if applicable"
}`;

    const parts: any[] = [];
    if (base64Data) {
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });
    }
    parts.push({
      text: promptText,
    });

    const response = await generateGeminiWithFallback({
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err: any) {
    console.warn('[BS Camera Ask Error]:', err?.message || err);
    return res.status(500).json({
      error: 'Failed to answer question about image.',
      details: err?.message || 'Server error',
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    assistant: 'BS AI Assistant',
    voice: 'Aoede (Sassy & Confident)',
    apiKeyConfigured: !!apiKey,
  });
});

// Setup Vite in Dev or static in Prod
if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: false,
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`[BS Server] Running on http://localhost:${PORT} in ${isProduction ? 'production' : 'development'} mode`);
});
