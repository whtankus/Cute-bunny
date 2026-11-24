-- Close the legacy one-argument RPC overload.
-- The current client must use (partner_id, action), which enforces the
-- shared action allow-list and prevents bypassing the action-rotation guard.
revoke all on function public.record_bear_hug_action(uuid) from public, anon, authenticated;
