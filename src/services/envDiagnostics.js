/**
 * Environment Diagnostics
 * Helper to verify Supabase credentials are loaded correctly
 */

export const diagnoseEnvironment = () => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    env: {
      SUPABASE_URL: {
        from_process_env: process.env.EXPO_PUBLIC_SUPABASE_URL || 'undefined',
        length: (process.env.EXPO_PUBLIC_SUPABASE_URL || '').length,
        present: Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL),
      },
      SUPABASE_ANON_KEY: {
        from_process_env: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? `${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'undefined',
        length: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').length,
        present: Boolean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
      },
    },
    hardcoded_fallback: {
      url: 'https://pmnirrvwibzqjlutbnwz.supabase.co',
      key_preview: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
  };

  // console.log('[envDiagnostics]', JSON.stringify(diagnostics, null, 2));
  return diagnostics;
};

export const verifySupabaseClient = (supabase) => {
  const result = {
    supabase_initialized: supabase !== null,
    has_auth: supabase?.auth !== undefined,
    has_from: supabase?.from !== undefined,
  };

  // console.log('[envDiagnostics] Supabase client status:', result);
  return result;
};
