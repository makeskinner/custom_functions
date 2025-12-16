// The inputData comes in as a string, so we need to parse it into an object first.
// const data = JSON.parse(input.inputData);

const data = JSON.parse(`{"actions":[{"task":"Define","status":"To do","assignee":"MS"}],"urgency":{"level":"Low","details":"The text is neutral and primarily factual. It notes a minor concern ('low pre-sales confidence' and a missing executive summary) but contains no urgent, severe, or strongly negative language, so it indicates a low-level issue rather than Medium, High, or Critical."},"nextStep":"Quote with EB for signature","sentiment":"neutral","accountName":"ON THE BEACH GROUP PLC","actionsDate":"2025-08-07T23:00:00.000Z","churnDetails":null,"churnRiskValue":null,"expansionScore":null,"churnTotalValue":0,"expectedRevenue":30998.14,"executiveSummary":"The customer is ON THE BEACH GROUP PLC with an expected revenue of $30,998.14. No executive summary, churn risk, or expansion score is provided, and churn value is $0. Pre‑sales confidence is low+. Next steps include obtaining a quote with EB for signature, defining the Technical Requirements document (completed on 2025‑08‑08), and validating the Central Hotels Database connection (still to be done).","preSalesConfidence":"Low +"}`
  );

// Helper function to format currency
function formatCurrency(num) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

// Build the HTML for the list of actions using the .map() array method
const actionsList = data.actions.map(action => {
  const checkbox = action.status === 'completed' ? '[x]' : '[ ]';
  return `<li>${checkbox} ${action.task} (${action.assignee}) — ${action.status}</li>`;
}).join(''); // .join('') concatenates all list items into a single string

// Use a template literal (backticks) to build the final HTML body
const html = `
<h1>Account Update — ${data.accountName}</h1>
<p>
  <strong>Expected revenue:</strong> ${formatCurrency(data.expectedRevenue)}<br>
  <strong>Sentiment:</strong> ${data.sentiment}<br>
  <strong>Urgency:</strong> ${data.urgency.level}<br>
  ${data.urgency.details}
</p>
<p>
  <strong>Executive summary:</strong> <em>${data.executiveSummary || 'None provided'}</em><br>
  <strong>Churn details:</strong> <em>${data.churnDetails || 'None provided'}</em><br>
  <strong>Churn risk / churn value:</strong> $${data.churnRiskValue} / $${data.churnTotalValue}<br>
  <strong>Expansion score:</strong> ${data.expansionScore}<br>
  <strong>Pre-sales confidence:</strong> ${data.preSalesConfidence}
</p>
<p>
  <strong>Next step:</strong> ${data.nextStep}
</p>
<p>
  <strong>Upcoming actions (${data.actionsDate}):</strong>
</p>
<ul>
  ${actionsList}
</ul>
`;

// Return the final HTML string in an object
// return {
//   htmlBody: html
// };

console.log(html);