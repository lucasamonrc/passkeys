export default {
  rpName: "@lucasamonrc:passkeys",
  rpId: process.env.RP_ID || "localhost",
  acceptedOrigin: process.env.ACCEPTED_ORIGIN || [
    "http://localhost:3000",
    "http://localhost:3001",
  ],
};
