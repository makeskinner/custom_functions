// Build Weekly Focus Email HTML — v3
// Input: module output mapped as `data`.

const data = input.data; // {{1}} -- map the whole module 1 bundle here

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function usd(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function table(rowsHtml) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rowsHtml}</table>`;
}
function emptyRow(text) {
  return `<tr><td colspan="5" style="padding:8px 4px; font-size:12px; color:#9E8AAD; font-style:italic;">${esc(text)}</td></tr>`;
}
function sectionHeader(emoji, title, subtitle) {
  return `<div style="padding:18px 0 6px 0; font-size:13px; font-weight:700; color:#8200FA; text-transform:uppercase; letter-spacing:0.4px; border-bottom:1px solid #EFE5FF; margin-bottom:2px;">${emoji} ${esc(title)}${subtitle ? `<span style="text-transform:none; font-weight:400; color:#9E8AAD; letter-spacing:0; margin-left:8px;">${esc(subtitle)}</span>` : ''}</div>`;
}

function priorityTag(p) {
  if (!p || p === 'None') return '';
  const color = p === 'Priority 1' ? '#FF009A' : p === 'Priority 2' ? '#FF9900' : '#8200FA';
  return `<span style="font-size:9px; font-weight:700; color:${color}; background:${color}18; padding:1px 5px; border-radius:4px; margin-left:6px; white-space:nowrap;">${esc(p.replace('Priority ', 'P'))}</span>`;
}

function dealRow(o, kind) {
  const isExpansion = kind === 'expansion';
  const isRenewal = kind === 'renewal';
  const amount = isExpansion ? Number(o.exp_revenue_usd || 0) : isRenewal ? Number(o.total_arr || 0) : Number(o.exp_revenue_usd || 0);
  const heat = o._heat;
  const heatEmoji = heat ? heat.emoji : '';
  const rightLine1 = usd(amount);
  const rightLine2 = isRenewal ? fmtDate(o.next_renewal_date)
                    : isExpansion ? fmtDate(o.timeline_to)
                    : (o._closeQuarterLabel || '');
  return `<tr>
    <td style="padding:8px 6px 8px 0; width:18px; font-size:14px; vertical-align:top;">${heatEmoji}</td>
    <td style="padding:8px 8px 8px 0; vertical-align:top;">
      <div style="font-size:13px; font-weight:700; color:#1A0033;">${esc(o.company_name)}${priorityTag(o.priority)}</div>
      <div style="font-size:11px; color:#9E8AAD; margin-top:2px; max-width:340px;">${esc(o._note)}</div>
    </td>
    <td style="padding:8px 0 8px 8px; text-align:right; vertical-align:top; white-space:nowrap;">
      <div style="font-size:13px; font-weight:700; color:#1A0033;">${rightLine1}</div>
      <div style="font-size:11px; color:#6B5580; margin-top:2px;">${esc(rightLine2)}</div>
    </td>
  </tr>`;
}

function workshopRow(o, dotColor, dateStr) {
  return `<tr>
    <td style="padding:7px 6px 7px 0; width:10px; vertical-align:top;"><span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${dotColor}; margin-top:5px;"></span></td>
    <td style="padding:7px 8px 7px 0; font-size:13px; color:#1A0033; font-weight:700; vertical-align:top;">${esc(o.company_name)}</td>
    <td style="padding:7px 8px 7px 0; font-size:12px; color:#6B5580; vertical-align:top;">${esc((o.subject||'').replace('Workshop: ',''))}</td>
    <td style="padding:7px 0 7px 8px; font-size:12px; color:#1A0033; font-weight:700; text-align:right; white-space:nowrap; vertical-align:top;">${dateStr}</td>
  </tr>`;
}

const renewals   = data.renewalsThisWeek || [];
const expansions  = data.expansionsThisWeek || [];
const land        = data.landInProgress || [];
const delivered   = data.workshopsDeliveredLastWeek || [];
const scheduled   = data.workshopsScheduledThisWeek || [];

// --- RESTRUCTURED HEADER CARDS ---

// Row 1: Weekly Activity & Engagement Counts
const totalDeals = expansions.length + renewals.length + land.length;
const activityRow = `
  <div style="font-size:10px; font-weight:700; color:#9E8AAD; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Weekly Activity & Engagement</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
    <tr>
      <td style="padding:4px;"><div style="background:#F4FBF7; border:1px solid #D1F4E2; border-radius:8px; padding:10px; text-align:center;">
        <div style="font-size:18px; font-weight:700; color:#00C875;">${delivered.length}</div>
        <div style="font-size:9px; font-weight:600; color:#6B5580; text-transform:uppercase; margin-top:2px;">Delivered Wksps</div>
      </div></td>
      <td style="padding:4px;"><div style="background:#F8F0FF; border:1px solid #E9D5FF; border-radius:8px; padding:10px; text-align:center;">
        <div style="font-size:18px; font-weight:700; color:#8200FA;">${scheduled.length}</div>
        <div style="font-size:9px; font-weight:600; color:#6B5580; text-transform:uppercase; margin-top:2px;">Scheduled Wksps</div>
      </div></td>
      <td style="padding:4px;"><div style="background:#F5F3FF; border:1px solid #DDD6FE; border-radius:8px; padding:10px; text-align:center;">
        <div style="font-size:18px; font-weight:700; color:#4C1D95;">${totalDeals}</div>
        <div style="font-size:9px; font-weight:600; color:#6B5580; text-transform:uppercase; margin-top:2px;">Focus Deals</div>
      </div></td>
    </tr>
  </table>`;

// Row 2: Financial Pipeline ($)
const expansionsArr = expansions.reduce((s, o) => s + Number(o.exp_revenue_usd || 0), 0);
const renewalsArr    = renewals.reduce((s, o) => s + Number(o.total_arr || 0), 0);
const landArr         = land.reduce((s, o) => s + Number(o.exp_revenue_usd || 0), 0);
const totalArr        = expansionsArr + renewalsArr + landArr;

function revenueCard(label, amount, color) {
  return `<td style="padding:3px;">
    <div style="background:${color}0D; border:1px solid ${color}33; border-radius:8px; padding:10px 6px; text-align:center;">
      <div style="font-size:15px; font-weight:700; color:${color};">${usd(amount)}</div>
      <div style="font-size:9px; font-weight:600; color:#6B5580; text-transform:uppercase; margin-top:2px;">${esc(label)}</div>
    </div>
  </td>`;
}

const revenueRow = `
  <div style="font-size:10px; font-weight:700; color:#9E8AAD; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Quarter Financial Pipeline</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      ${revenueCard('Expansions', expansionsArr, '#FF9900')}
      ${revenueCard('Renewals', renewalsArr, '#00D9EE')}
      ${revenueCard('Land', landArr, '#6B5580')}
      ${revenueCard('Total in Play', totalArr, '#8200FA')}
    </tr>
  </table>`;

// Dynamic Pulse URL deep link
const pulseVeUrl = `https://gtm-opps-app-xd3xy.ondigitalocean.app/?lead_ve=${encodeURIComponent(data.leadVe || '')}#focus`;

const deliveredHtml  = delivered.length
  ? table(delivered.map(o => workshopRow(o, '#00C875', fmtDate(o.delivered_date))).join(''))
  : table(emptyRow('No workshops delivered last week.'));

const scheduledHtml  = scheduled.length
  ? table(scheduled.map(o => workshopRow(o, '#8200FA', fmtDate(o.start_date))).join(''))
  : table(emptyRow('No workshops scheduled this week.'));

const expansionsHtml = expansions.length
  ? table(expansions.map(o => dealRow(o, 'expansion')).join(''))
  : table(emptyRow(`No expansions due in ${esc(data.currentQuarterLabel)}.`));

const renewalsHtml   = renewals.length
  ? table(renewals.map(o => dealRow(o, 'renewal')).join(''))
  : table(emptyRow(`No renewals due in ${esc(data.currentQuarterLabel)}.`));

const landHtml        = land.length
  ? table(land.map(o => dealRow(o, 'land')).join(''))
  : table(emptyRow('No Land deals currently in progress.'));

const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Weekly Focus Summary</title></head>
<body style="margin:0; padding:0; background-color:#F5F0FF; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F0FF; padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="660" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(130,0,250,0.08);">

  <tr><td style="background:linear-gradient(135deg,#8200FA,#B14EFF); padding:24px 32px;">
    <div style="font-size:12px; font-weight:700; color:#E8D4FF; letter-spacing:0.5px; text-transform:uppercase;">Pulse · GTM Weekly Focus</div>
    <div style="font-size:20px; font-weight:700; color:#ffffff; margin-top:4px;">${esc(data.leadVe)}'s Weekly Meeting Brief</div>
    <div style="font-size:12px; color:#E8D4FF; margin-top:2px;">Week of ${esc(data.weekOf)} · ${esc(data.currentQuarterLabel)}</div>
  </td></tr>

  <tr><td style="padding:16px 20px 8px 20px;">
    ${activityRow}
    ${revenueRow}
  </td></tr>

  <tr><td style="padding:8px 32px 20px 32px;">

    ${sectionHeader('✅', 'Workshops Delivered Last Week')}
    ${deliveredHtml}

    ${sectionHeader('📌', 'Workshops This Week')}
    ${scheduledHtml}

    ${sectionHeader('💰', 'Expansions in Focus', data.currentQuarterLabel)}
    ${expansionsHtml}

    ${sectionHeader('🔁', 'Renewals in Focus', data.currentQuarterLabel)}
    ${renewalsHtml}

    ${sectionHeader('🌱', 'Land Deals', 'all open, labeled by close quarter')}
    ${landHtml}

  </td></tr>

  <tr><td style="background:#F9F5FF; padding:18px 32px; text-align:center;">
    <a href="${pulseVeUrl}" style="display:inline-block; background:#8200FA; color:#ffffff; text-decoration:none; font-size:13px; font-weight:700; padding:10px 24px; border-radius:8px;">Open ${esc(data.leadVe)}'s Pulse View</a>
    <div style="font-size:10px; color:#9E8AAD; margin-top:10px;">🔴 closing ≤14 days · 🟠 15-30 days · 🟢 31+ days (still this quarter)</div>
    <div style="font-size:10px; color:#9E8AAD; margin-top:6px;">Generated automatically every Monday · Pulse GTM Dashboard</div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

return { html };