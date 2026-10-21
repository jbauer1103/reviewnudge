// Deletes the logged-in owner's account. Their business, customers and review
// requests are removed with it (the database cascades the delete).

import { withSupabase } from 'npm:@supabase/server@1';

// Lets the web version of the app call this function too.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

const handler = withSupabase({ auth: 'user' }, async (_req, ctx) => {
  const userId = ctx.userClaims?.id;
  if (!userId) {
    return json({ error: 'Please log in again.' }, 401);
  }
  // Only the caller's own account: the id comes from their verified login.
  const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error('Delete account failed', error.message);
    return json({ error: 'Couldn’t delete your account. Try again.' }, 500);
  }
  return json({ deleted: true });
});

export default {
  fetch(req: Request, ...rest: unknown[]) {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }
    // @ts-ignore: pass along whatever extra arguments Supabase gives us.
    return handler(req, ...rest);
  },
};
