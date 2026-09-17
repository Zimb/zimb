/**
 * i18n.ts — Tiny inline translator for bot comments.
 *
 * Used by:
 *   - bountyRenderer (when rendering the bounty body in the user's language)
 *   - issueCommentHandler (when replying to @zimb-bot commands)
 *
 * For now supports en + fr. Adding a language = adding a translation map.
 */

type Lang = 'en' | 'fr' | 'es' | 'de';

type Dict = Record<string, string>;
type TranslationKey =
  | 'bounty.assigned' | 'bounty.repo' | 'bounty.branch' | 'bounty.afterInvite'
  | 'bounty.timer' | 'bounty.beta' | 'bounty.alreadyClaimed' | 'bounty.alreadyClaimedByOther'
  | 'bounty.noBountyLabel' | 'bounty.notOpen' | 'bounty.provisioningFailed' | 'bounty.recorded'
  | 'status.title' | 'status.line'
  | 'unclaim.released' | 'unclaim.notYours' | 'unclaim.noActive'
  | 'help.text' | 'dispute.opened'
  | 'error.notFound' | 'error.badRequest' | 'error.invalidSignature';

const TRANSLATIONS: Record<Lang, Dict> = {
  en: {
    'bounty.assigned': "✅ **Assigned to @{user}** on ticket {ticket}",
    'bounty.repo': '**Repo:** {repo}',
    'bounty.branch': '**Branch:** `{branch}`',
    'bounty.afterInvite': 'After accepting the collaborator invite:',
    'bounty.timer': '> 🕒 Timer: 45 min. After that the claim expires and other seniors can take over.',
    'bounty.beta': '> 💡 This is a beta project — contributions are voluntary and unpaid at this stage. You\'ll get full credit on the README contributors list when the PR merges.',
    'bounty.alreadyClaimed': '✅ You\'re already assigned to {ticket}. Push access is still active.',
    'bounty.alreadyClaimedByOther': 'This ticket is already claimed by **{user}** until {expires}.',
    'bounty.noBountyLabel': 'Only `bounty`-labeled issues can be claimed. Ask the maintainer to add the label.',
    'bounty.notOpen': 'This issue is already closed.',
    'bounty.provisioningFailed': 'GitHub provisioning failed: {error}. The claim was NOT recorded.',
    'bounty.recorded': 'Your claim has been recorded in our tracker.',

    'status.title': '**Ticket {ticket}**',
    'status.line': '- {key}: `{value}`',

    'unclaim.released': '✅ @{user} released claim on {ticket}. Push access revoked.',
    'unclaim.notYours': 'Only {user} can release this claim.',
    'unclaim.noActive': 'No active claim on {ticket}.',

    'help.text':
      'Available commands:\n' +
      '- `@zimb-bot claim` — claim this bounty (requires `bounty` label)\n' +
      '- `@zimb-bot status` — show ticket status\n' +
      '- `@zimb-bot unclaim` — release your claim\n' +
      '- `@zimb-bot dispute <reason>` — open a dispute\n',

    'dispute.opened': 'Dispute received with reason: {reason}.\nA reviewer will be assigned shortly.',

    'error.notFound': 'No matching Zimb ticket for this issue.',
    'error.badRequest': 'Invalid JSON',
    'error.invalidSignature': 'X-Hub-Signature-256 mismatch',
  },
  fr: {
    'bounty.assigned': '✅ **Assigné à @{user}** sur le ticket {ticket}',
    'bounty.repo': '**Dépôt :** {repo}',
    'bounty.branch': '**Branche :** `{branch}`',
    'bounty.afterInvite': "Après avoir accepté l'invitation de collaborateur :",
    'bounty.timer': '> 🕒 Chrono : 45 min. Après cela, la réclamation expire et d\'autres seniors peuvent prendre le relais.',
    'bounty.beta': '> 💡 Ceci est un projet en bêta — les contributions sont volontaires et non rémunérées à ce stade. Vous serez crédité sur la liste des contributeurs du README quand la PR sera fusionnée.',
    'bounty.alreadyClaimed': '✅ Vous êtes déjà assigné à {ticket}. L\'accès push est toujours actif.',
    'bounty.alreadyClaimedByOther': 'Ce ticket est déjà réclamé par **{user}** jusqu\'à {expires}.',
    'bounty.noBountyLabel': 'Seuls les tickets labellisés `bounty` peuvent être réclamés. Demandez au mainteneur d\'ajouter le label.',
    'bounty.notOpen': 'Cette issue est déjà fermée.',
    'bounty.provisioningFailed': 'Le provisionnement GitHub a échoué : {error}. La réclamation n\'a PAS été enregistrée.',
    'bounty.recorded': 'Votre réclamation a été enregistrée dans notre tracker.',

    'status.title': '**Ticket {ticket}**',
    'status.line': '- {key} : `{value}`',

    'unclaim.released': '✅ @{user} a libéré la réclamation sur {ticket}. Accès push révoqué.',
    'unclaim.notYours': 'Seul {user} peut libérer cette réclamation.',
    'unclaim.noActive': 'Aucune réclamation active sur {ticket}.',

    'help.text':
      'Commandes disponibles :\n' +
      '- `@zimb-bot claim` — réclame cette bounty (nécessite le label `bounty`)\n' +
      '- `@zimb-bot status` — affiche le statut du ticket\n' +
      '- `@zimb-bot unclaim` — libère ta réclamation\n' +
      '- `@zimb-bot dispute <raison>` — ouvre un litige\n',

    'dispute.opened': 'Litige reçu avec la raison : {reason}.\nUn reviewer va être assigné sous peu.',

    'error.notFound': 'Aucun ticket Zimb ne correspond à cette issue.',
    'error.badRequest': 'JSON invalide',
    'error.invalidSignature': 'Signature X-Hub-Signature-256 invalide',
  },
  es: {
    'bounty.assigned': '✅ **Asignado a @{user}** en el ticket {ticket}',
    'bounty.repo': '**Repo:** {repo}',
    'bounty.branch': '**Rama:** `{branch}`',
    'bounty.afterInvite': 'Después de aceptar la invitación de colaborador:',
    'bounty.timer': '> 🕒 Temporizador: 45 min. Después de eso, la reclamación expira y otros seniors pueden tomarla.',
    'bounty.beta': '> 💡 Este es un proyecto beta — las contribuciones son voluntarias y no remuneradas en esta etapa.',
    'bounty.alreadyClaimed': '✅ Ya estás asignado a {ticket}. El acceso push sigue activo.',
    'bounty.alreadyClaimedByOther': 'Este ticket ya está reclamado por **{user}** hasta {expires}.',
    'bounty.noBountyLabel': 'Solo los issues con la etiqueta `bounty` pueden ser reclamados.',
    'bounty.notOpen': 'Este issue ya está cerrado.',
    'bounty.provisioningFailed': 'Falló el aprovisionamiento de GitHub: {error}. La reclamación NO fue registrada.',
    'bounty.recorded': 'Tu reclamación ha sido registrada.',

    'status.title': '**Ticket {ticket}**',
    'status.line': '- {key}: `{value}`',

    'unclaim.released': '✅ @{user} liberó la reclamación en {ticket}. Acceso push revocado.',
    'unclaim.notYours': 'Solo {user} puede liberar esta reclamación.',
    'unclaim.noActive': 'No hay reclamación activa en {ticket}.',

    'help.text':
      'Comandos disponibles:\n' +
      '- `@zimb-bot claim` — reclamar este bounty\n' +
      '- `@zimb-bot status` — ver el estado del ticket\n' +
      '- `@zimb-bot unclaim` — liberar tu reclamación\n',

    'dispute.opened': 'Disputa recibida con motivo: {reason}.',

    'error.notFound': 'Ningún ticket Zimb coincide con este issue.',
    'error.badRequest': 'JSON inválido',
    'error.invalidSignature': 'Firma X-Hub-Signature-256 inválida',
  },
  de: {
    'bounty.assigned': '✅ **Zugewiesen an @{user}** für Ticket {ticket}',
    'bounty.repo': '**Repo:** {repo}',
    'bounty.branch': '**Branch:** `{branch}`',
    'bounty.afterInvite': 'Nachdem du die Kollaborator-Einladung angenommen hast:',
    'bounty.timer': '> 🕒 Timer: 45 Min. Danach verfällt der Anspruch.',
    'bounty.beta': '> 💡 Dies ist ein Beta-Projekt — Beiträge sind freiwillig und unbezahlt.',
    'bounty.alreadyClaimed': '✅ Du bist {ticket} bereits zugewiesen.',
    'bounty.alreadyClaimedByOther': 'Dieses Ticket wurde bereits von **{user}** bis {expires} beansprucht.',
    'bounty.noBountyLabel': 'Nur Issues mit dem `bounty`-Label können beansprucht werden.',
    'bounty.notOpen': 'Dieses Issue ist bereits geschlossen.',
    'bounty.provisioningFailed': 'GitHub-Bereitstellung fehlgeschlagen: {error}.',
    'bounty.recorded': 'Dein Anspruch wurde registriert.',

    'status.title': '**Ticket {ticket}**',
    'status.line': '- {key}: `{value}`',

    'unclaim.released': '✅ @{user} hat den Anspruch auf {ticket} freigegeben.',
    'unclaim.notYours': 'Nur {user} kann diesen Anspruch freigeben.',
    'unclaim.noActive': 'Kein aktiver Anspruch auf {ticket}.',

    'help.text':
      'Verfügbare Befehle:\n' +
      '- `@zimb-bot claim` — diesen Bounty beanspruchen\n' +
      '- `@zimb-bot status` — Ticket-Status anzeigen\n',

    'dispute.opened': 'Streitfall mit Grund erhalten: {reason}.',

    'error.notFound': 'Kein passendes Zimb-Ticket für dieses Issue.',
    'error.badRequest': 'Ungültiges JSON',
    'error.invalidSignature': 'X-Hub-Signature-256 ungültig',
  },
} as const satisfies Record<Lang, Record<TranslationKey, string>>;

/**
 * Translate a key, with `{var}` interpolation, in the given language.
 * Falls back to English if the language or key is missing.
 */
export function t(lang: string | undefined, key: TranslationKey, vars: Record<string, string | number> = {}): string {
  const safeLang = ((lang ?? 'en').toLowerCase() as Lang) in TRANSLATIONS ? (lang ?? 'en').toLowerCase() : 'en';
  const dict = (TRANSLATIONS as Record<string, Record<string, string>>)[safeLang] ?? TRANSLATIONS.en;
  const template = dict[key] ?? TRANSLATIONS.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_match: string, name: string) => String(vars[name] ?? `{${name}}`));
}

/** Detect language from a small set of common French / Spanish keywords. */
export function detectLanguage(text: string): Lang {
  const lower = text.toLowerCase();
  if (/\b(le|la|les|un|une|des|avec|pour|dans|sur|suis|bug|crash|erreur|plantage)\b/.test(lower)) return 'fr';
  if (/\b(el|la|los|las|un|una|con|para|en|sobre|error|fallo)\b/.test(lower)) return 'es';
  if (/\b(der|die|das|mit|für|auf|fehler|absturz)\b/.test(lower)) return 'de';
  return 'en';
}
