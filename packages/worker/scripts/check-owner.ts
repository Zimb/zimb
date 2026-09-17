// Check if the user "Zimb" is the owner of org "Zimb-app"
// Requires the Zimb PAT — but we don't have one in .dev.vars, so we use
// unauthenticated requests + public org data.
const r1 = await fetch('https://api.github.com/orgs/Zimb-app', {
  headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'zimb' },
});
const org = await r1.json();
console.log('Org login:', org.login);
console.log('Org name:', org.name);
console.log('Created at:', org.created_at);

// Try the "members" endpoint (public listing, requires the org to expose public members)
const r2 = await fetch('https://api.github.com/orgs/Zimb-app/public_members', {
  headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'zimb' },
});
const members = await r2.json();
console.log('\nPublic members of Zimb-app:');
console.log(JSON.stringify(members, null, 2));
