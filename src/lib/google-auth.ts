import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "@/integrations/supabase/client";

// Vercel does not serve Lovable's /~oauth endpoints. Start OAuth on the
// project's published host, but always return to the browser's own origin.
// That origin must be allowed in Cloud Auth's Redirect URLs.
const googleAuth = createLovableAuth({
  oauthBrokerUrl: "https://zilence-team.lovable.app/~oauth/initiate",
});

export async function signInWithGoogle() {
  const result = await googleAuth.signInWithOAuth("google", {
    redirect_uri: new URL("/auth", window.location.origin).href,
  });

  if (result.error || result.redirected) return result;

  const { error } = await supabase.auth.setSession(result.tokens);
  if (error) throw error;
  return result;
}