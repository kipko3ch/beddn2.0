"use client";

import { useEffect, useState } from "react";
import { ListingClaimModal } from "./claim-modal";

interface ClaimListingLinkProps {
  listingId: string;
  listingTitle: string;
  ownershipState?: string | null;
  onOpenLogin?: () => void;
  className?: string;
}

/**
 * Small, low-emphasis text link shown on 'unclaimed' listings only.
 * About 12-13px, muted color, underline on hover, placed near host card.
 * Never renders when ownershipState != 'unclaimed'.
 * If the current user already has a pending claim, displays muted text "Claim pending".
 */
export function ClaimListingLink({
  listingId,
  listingTitle,
  ownershipState,
  onOpenLogin,
  className = "",
}: ClaimListingLinkProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [hasPendingClaim, setHasPendingClaim] = useState(false);
  const [pendingClaimId, setPendingClaimId] = useState<string | undefined>(undefined);

  // Strictly guard: MUST NOT render if ownership_state is not 'unclaimed'
  if (ownershipState !== "unclaimed") {
    return null;
  }

  // Check if current user has an active claim
  useEffect(() => {
    let cancelled = false;
    async function checkPending() {
      try {
        const res = await fetch(`/api/claims?listingId=${encodeURIComponent(listingId)}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setHasPendingClaim(Boolean(data.hasPendingClaim));
            setPendingClaimId(data.claimId);
          }
        }
      } catch {
        // Safe silent fallback for unauthenticated guests
      }
    }
    checkPending();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  return (
    <>
      <div className={`text-xs text-stone-500 ${className}`}>
        {hasPendingClaim ? (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-[12px] sm:text-[13px] text-stone-500 hover:text-stone-700 underline font-medium cursor-pointer transition-colors"
          >
            Claim pending
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-[12px] sm:text-[13px] text-stone-500 hover:text-stone-800 underline font-medium cursor-pointer transition-colors"
          >
            Own this place? Claim listing
          </button>
        )}
      </div>

      <ListingClaimModal
        listingId={listingId}
        listingTitle={listingTitle}
        open={modalOpen}
        onOpenChange={setModalOpen}
        hasPendingClaim={hasPendingClaim}
        pendingClaimId={pendingClaimId}
        onClaimSuccess={() => {
          setHasPendingClaim(true);
        }}
        onClaimWithdrawn={() => {
          setHasPendingClaim(false);
          setPendingClaimId(undefined);
        }}
        onOpenLogin={onOpenLogin}
      />
    </>
  );
}
