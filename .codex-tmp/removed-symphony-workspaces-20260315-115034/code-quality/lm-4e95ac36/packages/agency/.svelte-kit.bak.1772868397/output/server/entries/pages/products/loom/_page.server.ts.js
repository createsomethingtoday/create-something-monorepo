import { p as products } from "../../../../chunks/services.js";
import { error } from "@sveltejs/kit";
const load = async () => {
  const product = products.find((p) => p.id === "loom");
  if (!product) {
    throw error(404, "Product not found");
  }
  return { product };
};
export {
  load
};
