import "dotenv/config";
import express from "express";
import supabaseRoutes from "./supabaseRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use("/api", supabaseRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:5000`);
});