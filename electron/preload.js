"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nortis", {
  auth: {
    register: (data) => ipcRenderer.invoke("auth:register", data),
    login: (data) => ipcRenderer.invoke("auth:login", data),
    logout: () => ipcRenderer.invoke("auth:logout"),
    me: () => ipcRenderer.invoke("auth:me"),
  },
  bootstrap: () => ipcRenderer.invoke("bootstrap"),
  transactions: {
    create: (data) => ipcRenderer.invoke("transactions:create", data),
    update: (id, data) => ipcRenderer.invoke("transactions:update", id, data),
    remove: (id) => ipcRenderer.invoke("transactions:remove", id),
  },
  goals: {
    create: (data) => ipcRenderer.invoke("goals:create", data),
    update: (id, data) => ipcRenderer.invoke("goals:update", id, data),
    remove: (id) => ipcRenderer.invoke("goals:remove", id),
    contribute: (id, data) => ipcRenderer.invoke("goals:contribute", id, data),
  },
  backup: {
    export: () => ipcRenderer.invoke("backup:export"),
    import: (data) => ipcRenderer.invoke("backup:import", data),
  },
});
