export default {
  acceptedOrigin: process.env.ACCEPTED_ORIGIN || [
    "http://localhost:3000",
    "http://localhost:3001",
  ],
  rpId: process.env.RP_ID || "localhost",
  rpName: "@lucasamonrc:passkeys",
};
