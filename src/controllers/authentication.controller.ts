import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server/script/deps";
import { eq } from "drizzle-orm";

import { db } from "../database/connection";
import { users, credentials, challenges } from "../database/schema";
import constants from "../constants";
import AppError from "../errors/AppError";

export default {
  startAuthentication: async (email: string) => {
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      throw new AppError("Cannot authenticate this user");
    }

    const passkeys = await db.select().from(credentials).where(eq(credentials.userId, user.id));

    const authenticationOptions = await generateAuthenticationOptions({
      rpID: constants.rpId,
      userVerification: "required",
      timeout: 60_000,
      allowCredentials: passkeys.map((credential) => {
        const transports = credential.transports as string;
        return {
          id: credential.id,
          transports: transports.split(",") as AuthenticatorTransportFuture[],
        };
      }),
    });

    await db
      .insert(challenges)
      .values({ value: authenticationOptions.challenge, userId: user.id })
      .execute();

    return authenticationOptions;
  },

  completeAuthentication: async (email: string, response: AuthenticationResponseJSON) => {
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      throw new AppError("Cannot authenticate this user");
    }

    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.userId, user.id));

    if (!challenge) {
      throw new AppError("Cannot authenticate this user");
    }

    const [credential] = await db
      .select()
      .from(credentials)
      .where(eq(credentials.id, response.rawId));

    if (!credential) {
      throw new AppError("Cannot authenticate this user");
    }

    const transports = credential.transports as string;

    const auth = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.value,
      expectedOrigin: constants.acceptedOrigin,
      expectedRPID: constants.rpId,
      authenticator: {
        credentialID: credential.id,
        credentialPublicKey: credential.credentialPublicKey as Uint8Array,
        counter: credential.counter,
        transports: transports.split(",") as AuthenticatorTransportFuture[],
      },
      requireUserVerification: true,
    });

    if (!auth.verified) {
      throw new AppError("Cannot authenticate this user");
    }

    if (auth.authenticationInfo) {
      await db
        .update(credentials)
        .set({ counter: auth.authenticationInfo.newCounter })
        .where(eq(credentials.id, credential.id))
        .execute();
    }

    await db.delete(challenges).where(eq(challenges.value, challenge.value)).execute();

    return { id: user.id, name: user.name, email: user.email };
  },
};
