import { createPortal } from "react-dom";

export interface PrintedStay {
  id: string;
  host: string;
  family: string;
  arrival: string;
  departure: string;
  nights: number;
  status: string;
  previousBalance: number;
  charges: number;
  payments: number;
  receipts: number;
  closingBalance: number;
  balanceLabel: string;
  settlementNote?: string;
  adjustmentNote?: string;
  transfers: string[];
  currentBalance?: number;
}

interface StayPrintSummaryProps {
  organization: string;
  period: string;
  scope: string;
  tab: string;
  stays: PrintedStay[];
  totals: { label: string; value: string }[];
  balances: { name: string; balance: number }[];
}

const money = (amount: number) => `$${Math.abs(amount).toFixed(2)}`;
const balance = (amount: number) => `${money(amount)}${amount < -0.004 ? " credit" : amount > 0.004 ? " owed" : ""}`;

export function StayPrintSummary({ organization, period, scope, tab, stays, totals, balances }: StayPrintSummaryProps) {
  return createPortal(
    <article className="stay-print-summary" aria-label="Printable stay summary">
      <header>
        <h1>{organization}</h1>
        <h2>{tab === "overview" ? "Season Overview" : "Current & Past Stays"}</h2>
        <p>{period} · {scope}</p>
        <p>Printed {new Date().toLocaleDateString()}</p>
      </header>
      {tab === "overview" ? (
        <>
          <dl className="stay-print-totals">
            {totals.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
          </dl>
          <h2>Current Member Balances (all years)</h2>
          <table>
            <thead><tr><th>Member</th><th>Current Balance</th></tr></thead>
            <tbody>{balances.map(item => <tr key={item.name}><td>{item.name}</td><td>{balance(item.balance)}</td></tr>)}</tbody>
          </table>
        </>
      ) : (
        <>
          <p>{stays.length} stay{stays.length === 1 ? "" : "s"} · Newest first</p>
          {stays.map(stay => (
            <section key={stay.id} className="stay-print-entry">
              <h3>{stay.arrival} — {stay.departure}</h3>
              <p>{stay.host} · {stay.family} · {stay.nights} night{stay.nights === 1 ? "" : "s"} · {stay.status}</p>
              <dl>
                <div><dt>Previous Balance</dt><dd>{balance(stay.previousBalance)}</dd></div>
                <div><dt>Charges (including adjustments)</dt><dd>{money(stay.charges)}{stay.charges < 0 ? " credit" : ""}</dd></div>
                <div><dt>Payments submitted</dt><dd>{money(stay.payments)}</dd></div>
                <div><dt>Receipt credits submitted</dt><dd>{money(stay.receipts)}</dd></div>
                <div><dt>{stay.balanceLabel}</dt><dd>{balance(stay.closingBalance)}</dd></div>
                {stay.currentBalance !== undefined && <div><dt>Current Balance</dt><dd>{balance(stay.currentBalance)}</dd></div>}
              </dl>
              {stay.adjustmentNote && <p>{stay.adjustmentNote}</p>}
              {stay.transfers.map((transfer, index) => <p key={index}>{transfer}</p>)}
              {stay.settlementNote && <p>{stay.settlementNote}</p>}
            </section>
          ))}
        </>
      )}
    </article>,
    document.body
  );
}