import express from "express";

import authenticationController from "../controllers/authentication.controller";

const authentication = express.Router();

authentication.post("/start", async (request, response) => {
  const { email } = request.body;
  const authenticationOptions = await authenticationController.startAuthentication(email);
  return response.json(authenticationOptions);
});

authentication.post("/complete", async (request, response) => {
  const { email, data } = request.body;
  const user = await authenticationController.completeAuthentication(email, data);
  return response.json({
    user,
  });
});

export default authentication;
