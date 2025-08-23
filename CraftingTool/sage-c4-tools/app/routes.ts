import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("claim-stakes", "routes/claim-stakes.tsx"),
    route("crafting-hab", "routes/crafting-hab.tsx"),
    route("recipes", "routes/recipes.tsx"),
] satisfies RouteConfig;
