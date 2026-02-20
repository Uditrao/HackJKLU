// app/server/tia/route.ts   ← the handler we export from the API route
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import connectDB from "./mongoose";
import User from "./models/User";

const googleClientId = process.env.HACKJKLU_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.HACKJKLU_GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

export const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: googleClientId!,
      clientSecret: googleClientSecret!,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  // use Mongoose + Atlas: upsert user in events.signIn
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      try {
        await connectDB();
        if (!user?.email) return;
        await User.findOneAndUpdate(
          { email: user.email },
          {
            name: user.name,
            email: user.email,
            image: user.image,
            provider: account?.provider,
            providerId: account?.providerAccountId,
          },
          { upsert: true, new: true }
        );
      } catch (e) {
        // swallow DB errors to avoid blocking sign-in flow
        // you may log this in production
      }
    },
  },
  pages: { signIn: "/tia" },        // the login page you created
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };