import "server-only";
import { cache } from "react";

// One clock snapshot per request, passed to interactive forms for hydration.
export const requestTime = cache(async () => Date.now());
