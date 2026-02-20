// this is the official NextAuth API endpoint used by `signIn()` and other
// client helpers.  We delegate the logic to the handler defined inside the
// tia folder so that your assignment stays contained there.

import { handler } from "../../../server/tia/route";

// re-export for both GET and POST as required by NextAuth
export { handler as GET, handler as POST };
