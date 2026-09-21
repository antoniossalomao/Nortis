"use strict";

const fs = require("fs");
const path = require("path");
const { app, BrowserWindow, ipcMain } = require("electron");
const { openDatabase } = require("./db/connection");
const { createFinanceApi } = require("./db/finance");
const { createAuthApi } = require("./db/auth");

let currentUserId = null;
let financeApi = null;
let authApi = null;
let mainWindow = null;

function requireSession() {
  if (currentUserId === null) {
    throw new Error("Não autenticado.");
  }
  return currentUserId;
}

function migrateLegacyDatabase(newDbPath) {
  const oldDbPath = path.join(__dirname, "..", "data", "nortis.sqlite");
  if (!fs.existsSync(newDbPath) && fs.existsSync(oldDbPath)) {
    fs.mkdirSync(path.dirname(newDbPath), { recursive: true });
    fs.copyFileSync(oldDbPath, newDbPath);
  }
}

function registerIpcHandlers() {
  ipcMain.handle("auth:register", (event, data) => {
    currentUserId = authApi.register(data);
    return { id: currentUserId };
  });
  ipcMain.handle("auth:login", (event, data) => {
    currentUserId = authApi.login(data);
    return { id: currentUserId };
  });
  ipcMain.handle("auth:logout", () => {
    currentUserId = null;
  });

  ipcMain.handle("bootstrap", () => financeApi.bootstrap(requireSession()));
  ipcMain.handle("transactions:create", (event, data) => financeApi.createTransaction(requireSession(), data));
  ipcMain.handle("transactions:update", (event, id, data) => financeApi.updateTransaction(requireSession(), id, data));
  ipcMain.handle("transactions:remove", (event, id) => financeApi.deleteTransaction(requireSession(), id));

  ipcMain.handle("goals:create", (event, data) => financeApi.createGoal(requireSession(), data));
  ipcMain.handle("goals:update", (event, id, data) => financeApi.updateGoal(requireSession(), id, data));
  ipcMain.handle("goals:remove", (event, id) => financeApi.deleteGoal(requireSession(), id));
  ipcMain.handle("goals:contribute", (event, id, data) => financeApi.addGoalContribution(requireSession(), id, data));

  ipcMain.handle("backup:export", () => financeApi.exportBackup(requireSession()));
  ipcMain.handle("backup:import", (event, data) => financeApi.importBackup(requireSession(), data));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#0b0a08",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.loadFile(path.join(__dirname, "..", "src", "login.html"));
}

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath("userData"), "nortis.sqlite");
  migrateLegacyDatabase(dbPath);
  const db = openDatabase(dbPath);
  financeApi = createFinanceApi(db);
  authApi = createAuthApi(db);

  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
