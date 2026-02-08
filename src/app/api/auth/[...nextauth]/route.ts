
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        // Replace with your actual usernames and passwords
        const users = [
          { id: "1", name: "User One", username: "user1", password: "password123" },
          { id: "2", name: "User Two", username: "user2", password: "securepassword" },
        ];

        const user = users.find(
          (u) =>
            u.username === credentials?.username &&
            u.password === credentials?.password
        );

        if (user) {
          return { id: user.id, name: user.name, email: `${user.username}@example.com` };
        } else {
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin", // Custom sign-in page (we'll create this)
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
