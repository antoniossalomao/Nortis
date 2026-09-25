"use strict";

let toastTimer;

const elements = {
  toast: document.querySelector("#toast"),
  tabLogin: document.querySelector("#tabLogin"),
  tabRegister: document.querySelector("#tabRegister"),
  loginForm: document.querySelector("#loginForm"),
  registerForm: document.querySelector("#registerForm"),
  loginSubmit: document.querySelector("#loginSubmit"),
  registerSubmit: document.querySelector("#registerSubmit"),
};

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle("error", isError);
  elements.toast.classList.add("show");
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 3200);
}

function setFormSaving(form, button, saving) {
  form.setAttribute("aria-busy", String(saving));
  button.disabled = saving;
  if (saving) {
    button.dataset.idleLabel = button.textContent;
    button.textContent = "Enviando…";
  } else {
    button.textContent = button.dataset.idleLabel || button.textContent;
  }
}

function showTab(tab) {
  const isLogin = tab === "login";
  elements.tabLogin.setAttribute("aria-selected", String(isLogin));
  elements.tabRegister.setAttribute("aria-selected", String(!isLogin));
  elements.loginForm.hidden = !isLogin;
  elements.registerForm.hidden = isLogin;
}

async function handleLogin(event) {
  event.preventDefault();
  if (elements.loginForm.getAttribute("aria-busy") === "true") return;
  if (!elements.loginForm.reportValidity()) return;

  setFormSaving(elements.loginForm, elements.loginSubmit, true);
  try {
    await window.nortis.auth.login({
      email: document.querySelector("#loginEmail").value.trim(),
      password: document.querySelector("#loginPassword").value,
    });
    window.location.href = "index.html";
  } catch (error) {
    showToast(error.message, true);
    setFormSaving(elements.loginForm, elements.loginSubmit, false);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  if (elements.registerForm.getAttribute("aria-busy") === "true") return;
  if (!elements.registerForm.reportValidity()) return;

  setFormSaving(elements.registerForm, elements.registerSubmit, true);
  try {
    await window.nortis.auth.register({
      name: document.querySelector("#registerName").value.trim(),
      email: document.querySelector("#registerEmail").value.trim(),
      password: document.querySelector("#registerPassword").value,
    });
    window.location.href = "index.html";
  } catch (error) {
    showToast(error.message, true);
    setFormSaving(elements.registerForm, elements.registerSubmit, false);
  }
}

elements.tabLogin.addEventListener("click", () => showTab("login"));
elements.tabRegister.addEventListener("click", () => showTab("register"));
elements.loginForm.addEventListener("submit", handleLogin);
elements.registerForm.addEventListener("submit", handleRegister);

document.querySelectorAll("[data-toggle-password]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.querySelector(`#${button.dataset.togglePassword}`);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.classList.toggle("active", show);
    button.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
  });
});
