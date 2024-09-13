import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import { RegistrationResponseJSON } from "@simplewebauthn/server/script/deps";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

import { db } from "../database/connection";
import { users, credentials, challenges } from "../database/schema";
import constants from "../constants";
import AppError from "../errors/AppError";

export default {
  startRegistration: async (email: string, name: string) => {
    const [result] = await db.select().from(users).where(eq(users.email, email));

    if (result) {
      throw new AppError("This email is already registered");
    }

    const userId = uuid();

    await db.insert(users).values({ email, name, id: userId }).execute();

    const registrationOptions = await generateRegistrationOptions({
      rpName: constants.rpName,
      rpID: constants.rpId,
      userID: isoUint8Array.fromUTF8String(userId),
      userName: email,
      userDisplayName: name,
      timeout: 60_000,
      attestationType: "none",
      excludeCredentials: [], // This should be a list of existing credential IDs for that user. Prevents re-registration with the same device.
      authenticatorSelection: {
        userVerification: "preferred", // This is required for "passkeys"
        residentKey: "required", // This is required for "passkeys"
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    await db
      .insert(challenges)
      .values({ value: registrationOptions.challenge, userId })
      .execute();

    return registrationOptions;
  },

  completeRegistration: async (email: string, response: RegistrationResponseJSON) => {
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.userId, user.id));

    if (!challenge) {
      throw new AppError("This user currently has no active challenge", 401);
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.value,
      expectedOrigin: constants.acceptedOrigin,
      expectedRPID: constants.rpId,
      requireUserVerification: true,
    });

    if (!verification.verified) {
      throw new Error("Registration verification failed");
    }

    if (!verification.registrationInfo) {
      throw new Error("No registration info available");
    }

    await db
      .insert(credentials)
      .values({
        id: verification.registrationInfo.credentialID,
        credentialPublicKey: verification.registrationInfo.credentialPublicKey, //
        counter: verification.registrationInfo.counter,
        transports: response.response.transports,
        userId: user.id,
      })
      .execute();

    await db.delete(challenges).where(eq(challenges.value, challenge.value)).execute();
  },
};
