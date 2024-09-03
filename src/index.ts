import express, { urlencoded, json } from "express";
import path from "path";

import api from "./routes";

const port = process.env.PORT || 3000;
const app = express();

app.use(urlencoded({ extended: true }));
app.use(json());

app.use("/", express.static(path.join(__dirname, "../public")));

app.use("/api", api);

app.listen(port, () => {
  console.log(`Server is listening at port ${port}`);
});
