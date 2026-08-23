/* Entitlement — the one function that turns Skilled paid.

   Launch position (see LAUNCHER-AUTH-v1.md, "build the check, leave the gate
   open"): the check is wired into approve, poll and heartbeat, but the
   predicate currently answers yes for every signed-in account. There is no
   purchase flow yet; shipping this closed would lock out everyone.

   To go paid, this is the only thing that changes. Not the launcher, not the
   DLL, not the wire contract. Something like:

     const rec = await env.SKILLED.get(`ent:${userId}`, "json");
     return !!rec && (rec.until === null || rec.until > Date.now());

   written by whatever the payment webhook ends up being. Everything downstream
   — the no_license status on approve, the terminal no_license on poll, the
   ejecting heartbeat reason — already exists and is already handled by the
   client. */

// eslint-disable-next-line no-unused-vars
export async function hasEntitlement(env, userId) {
  return true;
}
