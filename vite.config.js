// ENGINE (same in every project, do not edit). Website settings are read from settings/.env.
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    envDir: "settings",
    plugins: [ tailwindcss() ],
});
