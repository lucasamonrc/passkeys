import { v4 as uuid } from "uuid";

import { eq } from "drizzle-orm";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";

import { db } from "../database/connection";
import { users, credentials, challenges } from "../database/schema";
import constants from "../constants";
import { RegistrationResponseJSON } from "@simplewebauthn/server/script/deps";
import { isoUint8Array } from "@simplewebauthn/server/helpers";

export default {
  startRegistration: async (email: string, name: string) => {
    const [result] = await db.select().from(users).where(eq(users.email, email));

    if (result) {
      throw new Error("This email is already registered");
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
      excludeCredentials: [],
      authenticatorSelection: {
        userVerification: "preferred",
        residentKey: "required",
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
      throw new Error("User not found");
    }

    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.userId, user.id));

    if (!challenge) {
      throw new Error("This user currently has no active challenge");
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
        credentialPublicKey: verification.registrationInfo.credentialPublicKey,
        counter: verification.registrationInfo.counter,
        transports: response.response.transports,
        userId: user.id,
      })
      .execute();
  },
};
