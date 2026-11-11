/* rivaOS · Riva Computech's content, in one place. Apps, the file system (C:\Riva) and the
   terminal all read from here, so copy changes happen once.
   Honesty rules for copy: 10+ years, no Microsoft certifications claimed, no testimonials until real ones exist. */

import { EMAIL, PHONE } from "./core.js";

/** The slogan, as its two sentences (the second is the highlighted one). */
export const SLOGAN = ["You mind your business.", "We'll mind your computers."];
export const TAGLINE = SLOGAN.join(" ");
export const LEDE = "Senior Microsoft 365, Azure and infrastructure support — direct from the engineer who does the work. No ticket queues, no hand-offs, and cover across evenings, weekends and holidays.";
export const STATUS = "Open to select projects";
export const HOURS = "Weekdays, evenings, weekends & holidays";

export const SERVICES = [
  { id: "m365", name: "Microsoft 365", glyph: "cloud", g: ["#41a0ff", "#0a5cbf"], cmdlet: "Set-M365Tenant",
    blurb: "Set up properly, then kept tidy, secure and under control.",
    ticks: ["Tenant setup & licensing", "Exchange Online", "SharePoint & OneDrive", "Ongoing admin & clean-up"],
    keys: "m365 office 365 o365 exchange outlook email sharepoint onedrive tenant licence license licensing teams" },
  { id: "azure", name: "Azure & identity", glyph: "id", g: ["#33cbd5", "#08868f"], cmdlet: "Sync-Identity",
    blurb: "One identity per person, in the cloud and on-prem — with the right access.",
    ticks: ["Azure tenant & cloud management", "Entra ID & Active Directory", "Hybrid identity", "Group Policy"],
    keys: "azure entra active directory ad identity group policy gpo hybrid sso cloud" },
  { id: "migrate", name: "Migrations", glyph: "move", g: ["#a184ff", "#5b3cd4"], cmdlet: "Move-Tenant",
    blurb: "Planned so carefully they're boring — the good kind of boring.",
    ticks: ["Email & mailbox migration", "Tenant-to-tenant migration", "File & data migration", "Minimal-disruption cutovers"],
    keys: "migration migrate move tenant mailbox email data cutover merger acquisition" },
  { id: "backup", name: "Backup & continuity", glyph: "backup", g: ["#43d283", "#118c50"], cmdlet: "Backup-Business",
    blurb: "Backups you can actually restore from — and a plan for the bad day.",
    ticks: ["Backup & recovery", "Business continuity & disaster recovery", "Restore testing", "Proactive monitoring & maintenance"],
    keys: "backup restore recovery disaster dr bcdr continuity ransomware" },
  { id: "security", name: "Devices & security", glyph: "laptop", g: ["#ff9a6b", "#d4471f"], cmdlet: "Protect-Endpoint",
    blurb: "Laptops managed, threats watched, inboxes defended.",
    ticks: ["Intune device management", "Endpoint & email security", "EDR / SIEM monitoring"],
    keys: "intune device devices mdm laptop security endpoint edr siem antivirus mfa bitlocker phishing" },
  { id: "infra", name: "Infrastructure & network", glyph: "server", g: ["#7d8ca3", "#3c495c"], cmdlet: "Optimize-Infrastructure",
    blurb: "Servers, networks and storage that just work — and keep working.",
    ticks: ["On-prem servers & storage", "VMware, Hyper-V & Citrix", "Firewalls, networks & VPNs", "Domains, DNS & NAS"],
    keys: "server servers network firewall vpn vmware hyper-v hyperv citrix dns nas storage wifi domain" }
];

export const ENGAGE = [
  { glyph: "sparkle", title: "One-off projects", text: "A migration, a new tenant, a clean-up or a rebuild — scoped up front and done properly." },
  { glyph: "loop", title: "Ongoing support", text: "Proactive monitoring and maintenance, plus a direct line when something breaks." }
];

export const COMPARE = [
  ["Open a ticket, then wait in a queue", "<b>Message the engineer directly</b> — the one who'll actually fix it"],
  ["Whoever's on shift picks it up", "<b>The same senior engineer every time</b>, who already knows your setup"],
  ["Business hours, then voicemail", "<b>Evenings, weekends and holidays</b> — handy when your team spans time zones"],
  ["Juniors learning on your systems", "<b>10+ years of hands-on</b> Microsoft and infrastructure work"],
  ["Problems patched, then back next month", "<b>Fixed properly and documented</b> — and automated where it makes sense"],
  ["Account managers and upsells", "<b>Straight answers</b> — including \"you don't need that\""]
];

export const STEPS = [
  ["Send a message", "A couple of lines is plenty."],
  ["Free 30-minute chat", "We talk through your setup and what's bugging you."],
  ["A clear plan", "What needs doing, in what order, and what it'll cost."],
  ["The work gets done", "By the same engineer you spoke to, start to finish."]
];

export const HEALTH = [
  { glyph: "lock", t: "MFA is on for every account", s: "Including admins — and that shared reception login.", short: "MFA isn't enforced everywhere", fix: "Enforce MFA for everyone with Security Defaults or Conditional Access — it stops the vast majority of account takeovers." },
  { glyph: "backup", t: "Microsoft 365 is backed up separately", s: "Mail, OneDrive and SharePoint — not just the recycle bin.", short: "No separate Microsoft 365 backup", fix: "Add a dedicated Microsoft 365 backup. Microsoft keeps your data available; getting it back after a deletion or ransomware is on you." },
  { glyph: "refresh", t: "You've tested a restore recently", s: "In the last six months — and it actually worked.", short: "Restores haven't been tested", fix: "Schedule a test restore. An untested backup is a hope, not a plan." },
  { glyph: "admin", t: "Admin accounts are separate — and few", s: "Day-to-day logins don't have admin rights.", short: "Too many / shared admin accounts", fix: "Split admin rights into separate accounts and keep Global Admins to a bare minimum." },
  { glyph: "laptop", t: "Company devices are managed & encrypted", s: "Enrolled in Intune (or similar), with BitLocker on.", short: "Devices aren't managed or encrypted", fix: "Enroll devices in Intune and enforce encryption, so a lost laptop is just a lost laptop." },
  { glyph: "mail", t: "Email has SPF, DKIM and DMARC", s: "So nobody can send mail pretending to be you.", short: "Domain can be spoofed (SPF/DKIM/DMARC)", fix: "Publish SPF, DKIM and DMARC records so nobody can spoof your domain." },
  { glyph: "door", t: "Leavers lose access the same day", s: "Accounts, devices and shared passwords.", short: "Offboarding isn't same-day", fix: "Automate offboarding so nothing gets missed — like Offboard-User.ps1 in C:\\Riva\\Scripts." },
  { glyph: "book", t: "It's all written down", s: "If your IT person vanished tomorrow, someone could pick it up.", short: "Setup isn't documented", fix: "Document the essentials: admin accounts, licences, DNS, vendors and renewal dates." }
];

export const PROFILE = [
  ["Name", "Devik Patel"],
  ["Title", "Owner & senior engineer"],
  ["Experience", "10+ years hands-on IT"],
  ["Education", "BSc Information Technology"],
  ["Focus", "Microsoft 365, Azure, infrastructure"],
  ["Languages", "English, Gujarati"]
];

export const BIO = [
  "I'm the engineer behind Riva Computech — and the person you'll actually work with.",
  "I've spent more than ten years in hands-on IT: help desk, Windows Server, virtualization and, these days, a lot of Microsoft 365 and Azure. I keep a deliberately small client list, so I know your setup, you get a direct line to me, and the person who scopes the job is the person who does it.",
  "My hours are flexible, too — evenings, weekends and holidays — which helps when your team spans time zones.",
  "And if a job needs doing twice, I'll probably write a PowerShell script for it."
];

export const OFFBOARD_PS1 = `# Offboard-User.ps1 — every step, in order, every time.
param(
    [Parameter(Mandatory)] [string] $User,
    [string] $Manager
)

Connect-MgGraph -Scopes 'User.ReadWrite.All' -NoWelcome
Connect-ExchangeOnline -ShowBanner:$false

# 1. Lock the door
Update-MgUser -UserId $User -AccountEnabled:$false
Revoke-MgUserSignInSession -UserId $User | Out-Null

# 2. Keep the mail, hand it to their manager
Set-Mailbox -Identity $User -Type Shared
if ($Manager) {
    Add-MailboxPermission $User -User $Manager -AccessRights FullAccess
}

# 3. Free up the licences
$skus = (Get-MgUserLicenseDetail -UserId $User).SkuId
Set-MgUserLicense -UserId $User -AddLicenses @() -RemoveLicenses $skus

Write-Host "✔ $User offboarded." -ForegroundColor Green
`;

const line = "─".repeat(52);
/** Read-only files under C:\Riva (rebuilt on every boot, so they always match the site). */
export function rivaFiles() {
  const svc = SERVICES.map(s => `■ ${s.name}  (${s.cmdlet})\n  ${s.blurb}\n${s.ticks.map(t => "    • " + t).join("\n")}`).join("\n\n");
  return {
    "README.txt": `RIVA COMPUTECH\n${line}\n${TAGLINE}\n\n${LEDE}\n\n• 10+ years hands-on\n• One engineer, start to finish\n• Evenings & weekends too\n\nIn this folder\n  Services.txt       what we look after\n  About Devik.txt    who you'll work with\n  Contact.txt        how to reach us\n  Scripts\\           an example of our PowerShell automation\n\nTip: open Terminal and type  help\n`,
    "Services.txt": `SERVICES  ·  PS> Get-Service\n${line}\nYour Microsoft stack, looked after end to end — as a one-off\nproject or ongoing, proactive support.\n\n${svc}\n\n${ENGAGE.map(e => `${e.title}: ${e.text}`).join("\n")}\n`,
    "About Devik.txt": `ABOUT  ·  PS> Get-ADUser devik\n${line}\n${PROFILE.map(([k, v]) => (k + "            ").slice(0, 12) + ": " + v).join("\n")}\n\n${BIO.join("\n\n")}\n\n— Devik Patel, Owner, Riva Computech\n`,
    "Contact.txt": `CONTACT  ·  PS> Send-MailMessage\n${line}\nEmail : ${EMAIL}\nPhone : ${PHONE}\nHours : ${HOURS}\n\nHow it works\n${STEPS.map((s, i) => `  ${i + 1}. ${s[0]} — ${s[1]}`).join("\n")}\n\nYou'll get a straight answer from Devik — usually within one business day.\nOr open the Contact app to send a message right now.\n`,
    "Scripts\\Offboard-User.ps1": OFFBOARD_PS1,
    "Services.lnk": { app: "services" },
    "Health Check.lnk": { app: "health" },
    "Book a free chat.lnk": { app: "mail" }
  };
}
