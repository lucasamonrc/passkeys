import "express-async-errors";

import express, { urlencoded, json } from "express";
import path from "path";

import api from "./routes";
import exceptions from "./middleware/exceptions";

const port = process.env.PORT || 3000;
const app = express();

app.use(urlencoded({ extended: true }));
app.use(json());

app.use("/", express.static(path.join(__dirname, "../public")));
app.use("/api", api);

app.use(exceptions);

app.listen(port, () => {
  console.log(`Server is listening at port ${port}`);
});
