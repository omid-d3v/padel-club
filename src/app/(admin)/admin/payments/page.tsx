import Operations from "../operations/page";

// Reuse the guarded receipt workflow; no parallel financial implementation.
export default function PaymentReviews() {
  return <Operations searchParams={Promise.resolve({ tab: "receipts" })} />;
}
