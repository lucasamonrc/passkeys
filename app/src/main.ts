import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

interface PasskeysApp {
  api: {
    requestRegistrationOptions: (email: string, name: string) => Promise<any>;
    sendRegistrationResponse: (email: string, registrationResponse: unknown) => Promise<void>;
    requestAuthenticationOptions: (email: string) => Promise<any>;
    sendAuthenticationResponse: (
      email: string,
      authenticationResponse: unknown,
    ) => Promise<void>;
  };
  registration: {
    runWithLibrary: (event: SubmitEvent) => Promise<void>;
    runWebApi: (event: SubmitEvent) => Promise<void>;
  };
  authentication: {
    runWithLibrary: (event: SubmitEvent) => Promise<void>;
    runWebApi: (event: SubmitEvent) => Promise<void>;
  };
}

declare global {
  interface Window {
    app: PasskeysApp;
  }
}

// Form inputs
const registrationEmail = document.getElementById("registrationEmail") as HTMLInputElement;
const registrationName = document.getElementById("registrationName") as HTMLInputElement;
const authEmail = document.getElementById("authEmail") as HTMLInputElement;

window.app = {
  api: {
    requestRegistrationOptions: async (email: string, name: string) => {
      try {
        return await post("/api/registration/start", { email, name });
      } catch (error: any) {
        console.error(error);
        document.getElementById("message")!.innerHTML = error.message;
      }
    },

    sendRegistrationResponse: async (email: string, registrationResaponse: unknown) => {
      try {
        await post("/api/registration/complete", { email, data: registrationResaponse });
        document.getElementById("message")!.innerHTML = "User was registered successfully!";
      } catch (error: any) {
        console.error(error);
        document.getElementById("message")!.innerHTML = error.message;
      }
    },

    requestAuthenticationOptions: async (email: string) => {
      try {
        return await post("/api/authentication/start", { email });
      } catch (error: any) {
        console.error(error);
        document.getElementById("message")!.innerHTML = error.message;
      }
    },

    sendAuthenticationResponse: async (email: string, authenticationResponse: unknown) => {
      try {
        const data = await post("/api/authentication/complete", {
          email,
          data: authenticationResponse,
        });
        document.getElementById("profile")!.innerHTML = `
            <div><strong>ID:</strong> ${data.user.id}</div>
            <div><strong>E-mail:</strong> ${data.user.email}</div>
            <div><strong>Name:</strong> ${data.user.name}</div>`;
      } catch (error: any) {
        console.error(error);
        document.getElementById("message")!.innerHTML = error.message;
      }
    },
  },

  registration: {
    runWithLibrary: async (event: SubmitEvent) => {
      event.preventDefault();

      const email = registrationEmail.value;
      const name = registrationName.value;

      const options = await window.app.api.requestRegistrationOptions(email, name);

      if (!options) {
        return;
      }

      options.extensions = {
        credProps: true,
      };

      let registration;

      try {
        registration = await startRegistration(options);
      } catch (error: any) {
        console.error(error);
        document.getElementById("message")!.innerHTML = error.message;
      }

      await window.app.api.sendRegistrationResponse(email, registration);

      registrationEmail.value = "";
      registrationName.value = "";

      document.getElementById("message")!.innerHTML = "User was registered successfully!";
    },

    runWebApi: async (event: SubmitEvent) => {},
  },

  authentication: {
    runWithLibrary: async (event: SubmitEvent) => {
      event.preventDefault();

      const email = authEmail.value;

      const options = await window.app.api.requestAuthenticationOptions(email);

      if (!options) {
        return;
      }

      let authentication;
      try {
        authentication = await startAuthentication(options);
      } catch (error: any) {
        console.error(error);
        document.getElementById("message")!.innerHTML = error.message;
      }

      await window.app.api.sendAuthenticationResponse(email, authentication);

      authEmail.value = "";
    },

    runWebApi: async (event: SubmitEvent) => {},
  },
};

// Utility functions
function clearOutput() {
  document.getElementById("message")!.innerHTML = "";
  document.getElementById("profile")!.innerHTML = "";
}

async function post(url: string, payload: any) {
  clearOutput();

  const response = await fetch(url, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message);
  }

  if (response.status === 204) {
    return;
  }

  return await response.json();
}
