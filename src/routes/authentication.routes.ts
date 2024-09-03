import express from "express";
import { eq } from "drizzle-orm";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";

import { db } from "../database/connection";
import { users, credentials, challenges } from "../database/schema";
import constants from "../constants";
import { AuthenticatorTransportFuture } from "@simplewebauthn/server/script/deps";

const authentication = express.Router();

authentication.post("/start", async (request, response) => {
  const { email } = request.body;

  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    return response.status(400).json({ message: "Cannot authenticate this user" });
  }

  const passkeys = await db.select().from(credentials).where(eq(credentials.userId, user.id));

  const authenticationOptions = await generateAuthenticationOptions({
    timeout: 60_000,
    allowCredentials: passkeys.map((credential) => ({
      id: credential.id,
      transports: credential.transports as AuthenticatorTransportFuture[],
    })),
    userVerification: "required",
    rpID: request.hostname,
  });

  await db.insert(challenges).values({ value: authenticationOptions.challenge, userId: user.id }).execute();

  return response.json(authenticationOptions);
});

authentication.post("/complete", async (request, response) => {
  const { email, data } = request.body;

  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    return response.status(400).json({ message: "Cannot authenticate this user" });
  }

  const [challenge] = await db.select().from(challenges).where(eq(challenges.userId, user.id));

  if (!challenge) {
    return response.status(400).json({ message: "Cannot authenticate this user" });
  }

  const [credential] = await db.select().from(credentials).where(eq(credentials.id, data.rawId));

  if (!credential) {
    return response.status(400).json({ message: "Cannot authenticate this user" });
  }

  const auth = await verifyAuthenticationResponse({
    response: data,
    expectedChallenge: challenge.value,
    expectedOrigin: constants.acceptedOrigin,
    expectedRPID: request.hostname,
    authenticator: {
      credentialID: credential.id,
      credentialPublicKey: credential.credentialPublicKey as Uint8Array,
      counter: credential.counter,
      transports: credential.transports as AuthenticatorTransportFuture[],
    },
    requireUserVerification: true,
  });

  if (!auth.verified) {
    return response.status(400).json({ message: "Cannot authenticate this user" });
  }

  if (!!auth.authenticationInfo) {
    await db
      .update(credentials)
      .set({ counter: auth.authenticationInfo.newCounter })
      .where(eq(credentials.id, credential.id))
      .execute();
  }

  await db.delete(challenges).where(eq(challenges.value, challenge.value)).execute();

  return response.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
});

export default authentication;
