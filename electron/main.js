import { app, BrowserWindow, session } from "electron";
import path from "path";
import url from "url";

const isDev = !app.isPackaged;

async function createWindow() {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(process.cwd(), "electron/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });
  win.maximize();
  win.show();

  // Permitir cámara
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === "media") return callback(true);
      callback(false);
    }
  );

  if (isDev) {
    await win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    await win.loadURL(
      url.format({
        pathname: path.join(process.cwd(), "dist/index.html"),
        protocol: "file:",
        slashes: true,
      })
    );
  }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
