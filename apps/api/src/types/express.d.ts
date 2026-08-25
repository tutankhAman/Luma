declare global {
  // biome-ignore lint/style/noNamespace: Express module augmentation requires the global Express namespace
  namespace Express {
    interface Request {
      session?: {
        id: string;
        userId: string;
        expiresAt: Date;
      };
      user?: {
        id: string;
        name: string;
        email: string;
        role: string;
        emailVerified: boolean;
        image?: string | null;
      };
    }
  }
}

export {};
