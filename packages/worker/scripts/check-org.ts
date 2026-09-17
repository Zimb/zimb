const r = await fetch('https://api.github.com/orgs/Zimb-app');
console.log('status:', r.status);
const j = await r.json();
console.log(JSON.stringify(j, null, 2));
