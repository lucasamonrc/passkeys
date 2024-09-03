import express, { urlencoded, json } from "express";
import path from "path";

const port = process.env.PORT || 3000;
const app = express();

app.use(urlencoded({ extended: true }));
app.use(json());

app.use("/", express.static(path.join(__dirname, "../public")));

app.get("/health", (_, response) => {
  return response.status(200).json({ msg: "Server is up and running" });
});

app.listen(port, () => {
  console.log(`Server is listening at port ${port}`);
});
