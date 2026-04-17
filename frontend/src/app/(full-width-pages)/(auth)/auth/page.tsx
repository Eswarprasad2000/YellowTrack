import AuthPage from "@/components/auth/AuthPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in or create your Yellow Track account",
};

export default function Auth() {
  return <AuthPage />;
}
