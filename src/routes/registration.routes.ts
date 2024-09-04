import express from "express";

import registrationController from "../controllers/registration.controller";

const registration = express.Router();

registration.post("/start", async (request, response) => {
  const { email, name } = request.body;

  const registrationOptions = await registrationController.startRegistration(email, name);

  return response.json(registrationOptions);
});

registration.post("/complete", async (request, response) => {
  const { email, data } = request.body;

  await registrationController.completeRegistration(email, data);

  return response.status(204).send();
});

export default registration;
