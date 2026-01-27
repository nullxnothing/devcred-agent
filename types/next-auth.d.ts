import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      twitterHandle?: string;
      totalScore?: number;
      isVerified?: boolean;
      rank?: number | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    twitterId?: string;
    twitterHandle?: string;
  }
}
