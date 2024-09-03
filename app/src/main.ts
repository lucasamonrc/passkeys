import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

// Output
const messageDiv = document.getElementById("message") as HTMLDivElement;
const profileDiv = document.getElementById("profile") as HTMLDivElement;

// Forms
const registrationForm = document.getElementById("signup-form") as HTMLFormElement;
const verificationForm = document.getElementById("signin-form") as HTMLFormElement;

// Form inputs
const inputEmailSignup = document.getElementById("email-signup") as HTMLInputElement;
const inputNameSignup = document.getElementById("name-signup") as HTMLInputElement;
const inputEmailSignin = document.getElementById("email-signin") as HTMLInputElement;

// Event listeners
verificationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = inputEmailSignup.value;
  const name = inputNameSignup.value;

  try {
    let response = await fetch("/api/signup/start", {
      body: JSON.stringify({ email, name }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    let data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    data.extensions = {
      credProps: true,
    };

    const registration = await startRegistration(data);

    response = await fetch("/api/signup/finish", {
      body: JSON.stringify({ email, data: registration }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message);
    }

    clearForms();
    messageDiv.innerHTML = "User was registered successfully!";
  } catch (error: any) {
    console.error(error);
    messageDiv.innerHTML = error.message;
  }
});

verificationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = inputEmailSignin.value;

  try {
    let response = await fetch("/api/signin/start", {
      body: JSON.stringify({ email }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    let data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    const authentication = await startAuthentication(data);

    response = await fetch("/api/signin/finish", {
      body: JSON.stringify({ email, data: authentication }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    clearForms();
    profileDiv.innerHTML = `
        <div><strong>ID:</strong> ${data.user.id}</div>
        <div><strong>E-mail:</strong> ${data.user.email}</div>
        <div><strong>Name:</strong> ${data.user.name}</div>`;
  } catch (error: any) {
    console.error(error);
    messageDiv.innerHTML = error.message;
  }
});

// Utility functions
function clearForms() {
  registrationForm.reset();
  verificationForm.reset();
}
