import express from "express";

import registration from "./registration.routes";
import authentication from "./authentication.routes";

const routes = express.Router();

routes.use("/registration", registration);
routes.use("/authentication", authentication);

export default routes;
