import express from "express";
import { eq } from "drizzle-orm";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import { v4 as uuid } from "uuid";

import { db } from "../database/connection";
import { users, credentials, challenges } from "../database/schema";
import constants from "../constants";

const registration = express.Router();

registration.post("/start", async (request, response) => {
  const { email, name } = request.body;

  const [result] = await db.select().from(users).where(eq(users.email, email));

  if (result) {
    return response.status(400).json({ message: "This email is already registered" });
  }

  const userId = uuid();

  await db.insert(users).values({ email, name, id: userId }).execute();

  const registrationOptions = await generateRegistrationOptions({
    rpName: constants.rpName,
    // You should replace this with the domain where your app runs, since mine can run locally and on fly.io I'll use the hostname for simplicity.
    rpID: request.hostname,
    userID: isoUint8Array.fromUTF8String(userId),
    userName: email,
    userDisplayName: name,
    timeout: 60_000,
    attestationType: "none",
    excludeCredentials: [],
    authenticatorSelection: {
      userVerification: "preferred",
      residentKey: "required",
    },
    supportedAlgorithmIDs: [-7, -257],
  });

  await db.insert(challenges).values({ value: registrationOptions.challenge, userId }).execute();

  return response.json(registrationOptions);
});

registration.post("/complete", async (request, response) => {
  const { email, data } = request.body;

  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    return response.status(400).json({ message: "User not found" });
  }

  const [challenge] = await db.select().from(challenges).where(eq(challenges.userId, user.id));

  if (!challenge) {
    return response.status(400).json({ message: "This user currently has no active challenge" });
  }

  const verification = await verifyRegistrationResponse({
    response: data,
    expectedChallenge: challenge.value,
    expectedOrigin: constants.acceptedOrigin,
    expectedRPID: request.hostname,
    requireUserVerification: true,
  });

  if (!verification.verified) {
    return response.status(400).json({ message: "Invalid registration" });
  }

  if (!verification.registrationInfo) {
    return response.status(400).json({ message: "No registration info available" });
  }

  await db
    .insert(credentials)
    .values({
      id: verification.registrationInfo.credentialID,
      credentialPublicKey: verification.registrationInfo.credentialPublicKey,
      counter: verification.registrationInfo.counter,
      transports: data.response.transports,
      userId: user.id,
    })
    .execute();

  await db.delete(challenges).where(eq(challenges.value, challenge.value)).execute();

  return response.status(204).send();
});

export default registration;
