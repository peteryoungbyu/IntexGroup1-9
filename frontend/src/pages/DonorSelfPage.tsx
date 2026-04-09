import React, { useEffect, useState } from 'react';
import type {
  SupporterDetail,
  InKindDonationItem,
  DonationAllocation,
} from '../types/SupporterDetail';
import { getMyDonorHistory } from '../lib/supporterAPI';

const SUPPORTER_TYPE_LABELS: Record<string, string> = {
  MonetaryDonor: 'Monetary Donor',
  InKindDonor: 'In-Kind Donor',
  Volunteer: 'Volunteer',
  SkillsContributor: 'Skills Contributor',
  SocialMediaAdvocate: 'Social Media Advocate',
  PartnerOrganization: 'Partner Organization',
};

const CHANNEL_LABELS: Record<string, string> = {
  Website: 'Website',
  SocialMedia: 'Social Media',
  Event: 'Event',
  WordOfMouth: 'Word of Mouth',
  PartnerReferral: 'Partner Referral',
  Church: 'Church',
};

const DONATION_TYPE_LABELS: Record<string, string> = {
  Monetary: 'Monetary',
  InKind: 'In-Kind',
  Time: 'Time',
  Skills: 'Skills',
  SocialMedia: 'Social Media',
};

const PROGRAM_AREA_COLORS: Record<string, string> = {
  Education: '#1a5276',
  Wellbeing: '#0f6e56',
  Operations: '#b45309',
  Transport: '#7c3aed',
  Maintenance: '#6b7280',
  Outreach: '#e8a838',
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPHP(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function DonorSelfPage() {
  const [detail, setDetail] = useState<SupporterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    getMyDonorHistory()
      .then(setDetail)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unable to load donor history right now.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" style={{ color: 'var(--brand-primary)' }} />
      </div>
    );

  // Derive data — gracefully falls back to empty when detail is null
  const supporter = detail?.supporter ?? null;
  const donations = detail?.donations ?? [];
  const inKindItems: InKindDonationItem[] = detail?.inKindItems ?? [];
  const allocations: DonationAllocation[] = detail?.allocations ?? [];

  const totalMonetary = donations
    .filter((d) => d.donationType === 'Monetary' && d.amount != null)
    .reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const recurringCount = donations.filter((d) => d.isRecurring).length;
  const sortedByDate = [...donations].sort(
    (a, b) => new Date(b.donationDate).getTime() - new Date(a.donationDate).getTime()
  );
  const mostRecentDate = sortedByDate[0]?.donationDate ?? null;

  const inKindByDonationId = inKindItems.reduce<Record<number, InKindDonationItem[]>>(
    (acc, item) => { (acc[item.donationId] ??= []).push(item); return acc; },
    {}
  );

  const allocationByArea = allocations.reduce<Record<string, { total: number; safehouses: Set<number> }>>(
    (acc, a) => {
      const key = a.programArea;
      const safehouseId = (a.safehouseId ?? a.safeHouseId) ?? null;
      if (!acc[key]) {
        acc[key] = { total: 0, safehouses: new Set<number>() };
      }

      acc[key].total += a.amountAllocated;
      if (safehouseId != null) acc[key].safehouses.add(safehouseId);
      return acc;
    },
    {}
  );
  const allocationEntries = Object.entries(allocationByArea)
    .map(([area, data]) => ({
      area,
      total: data.total,
      safehouseText:
        data.safehouses.size > 0
          ? Array.from(data.safehouses).sort((a, b) => a - b).join(', ')
          : '—',
    }))
    .sort((a, b) => b.total - a.total);
  const totalAllocated = allocationEntries.reduce((sum, entry) => sum + entry.total, 0);
  const allocationSegments = allocationEntries.map((entry) => ({
    ...entry,
    pct: totalAllocated > 0 ? (entry.total / totalAllocated) * 100 : 0,
    color: PROGRAM_AREA_COLORS[entry.area] ?? 'var(--brand-primary)',
  }));

  const safehousesServed = Array.from(
    allocations.reduce((acc, a) => {
      const safehouseId = (a.safehouseId ?? a.safeHouseId) ?? null;
      if (safehouseId != null) acc.add(safehouseId);
      return acc;
    }, new Set<number>())
  ).sort((a, b) => a - b);

  function toggleRow(donationId: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(donationId) ? next.delete(donationId) : next.add(donationId);
      return next;
    });
  }

  return (
    <div>
      {/* SECTION 1 — Page Header */}
      <div className="page-header">
        <div className="container">
          <h1>My Donations</h1>
          <p>Your contribution history and impact</p>
        </div>
      </div>

      <div style={{ background: 'var(--brand-light)' }}>
        <div className="container py-4">

          {/* Error banner (auth/server errors only — 404 is handled silently) */}
          {error && (
            <div className="alert alert-warning mb-4" style={{ fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {/* Pending-link notice — shown when account has no supporter record */}
          {!detail && !error && (
            <div className="alert alert-info mb-4" style={{ fontSize: '0.875rem' }}>
              <strong>No donation history yet.</strong> Submit a pledge from the donate page and
              your supporter profile will be created automatically.
            </div>
          )}

          {/* SECTION 2 — Donor Profile Summary (only when linked) */}
          {supporter && (
            <div className="card mb-4">
              <div className="card-body">
                <div className="row g-3 align-items-center">
                  {[
                    { label: 'Donor Since', value: formatDate(supporter.firstDonationDate) },
                    { label: 'Supporter Type', value: SUPPORTER_TYPE_LABELS[supporter.supporterType] ?? supporter.supporterType },
                    { label: 'How You Found Us', value: supporter.acquisitionChannel ? (CHANNEL_LABELS[supporter.acquisitionChannel] ?? supporter.acquisitionChannel) : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="col-md-3 col-6">
                      <p className="mb-1 text-uppercase fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '1.5px', color: 'var(--brand-accent)' }}>{label}</p>
                      <p className="mb-0 fw-semibold" style={{ color: 'var(--brand-dark)' }}>{value}</p>
                    </div>
                  ))}
                  <div className="col-md-3 col-6">
                    <p className="mb-1 text-uppercase fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '1.5px', color: 'var(--brand-accent)' }}>Status</p>
                    <span className={`badge ${supporter.status === 'Active' ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.8rem' }}>
                      {supporter.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3 — Impact Metric Cards */}
          <div className="row g-3 mb-4">
            {[
              { label: 'Total Monetary', value: formatPHP(totalMonetary), sub: 'PHP donated' },
              { label: 'Total Donations', value: String(donations.length), sub: 'all types' },
              { label: 'Recurring', value: String(recurringCount), sub: 'recurring donations' },
              { label: 'Most Recent', value: formatDate(mostRecentDate), sub: 'last donation', small: true },
            ].map(({ label, value, sub, small }) => (
              <div key={label} className="col-6 col-md-3">
                <div className="card text-center h-100">
                  <div className="card-body py-4">
                    <p className="mb-2 text-uppercase fw-bold" style={{ fontSize: '0.68rem', letterSpacing: '1.5px', color: 'var(--brand-accent)' }}>{label}</p>
                    <p className="mb-0 fw-bold" style={{ fontSize: small ? '1.15rem' : '1.6rem', color: 'var(--brand-dark)', lineHeight: 1.1 }}>{value}</p>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>{sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* SECTION 4 — Donation History Table */}
          <div className="card mb-4">
            <div className="card-body pb-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <h5 className="fw-bold mb-0" style={{ color: 'var(--brand-dark)' }}>Donation History</h5>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ whiteSpace: 'nowrap' }}>Date</th>
                    <th>Type</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Amount / Value</th>
                    <th>Impact Unit</th>
                    <th>Channel</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Recurring</th>
                    <th style={{ width: 36 }} />
                  </tr>
                </thead>
                <tbody>
                  {donations.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-5">
                        <p className="mb-1" style={{ fontSize: '1.5rem' }}>🎁</p>
                        <p className="mb-0">No donations on record yet.</p>
                      </td>
                    </tr>
                  )}
                  {sortedByDate.map((d) => {
                    const hasInKind = d.donationType === 'InKind' && (inKindByDonationId[d.donationId]?.length ?? 0) > 0;
                    const isExpanded = expandedRows.has(d.donationId);
                    const items = inKindByDonationId[d.donationId] ?? [];
                    const amountDisplay = d.amount != null ? formatPHP(d.amount) : d.estimatedValue != null ? formatPHP(d.estimatedValue) : '—';

                    return (
                      <React.Fragment key={d.donationId}>
                        <tr
                          style={{ cursor: hasInKind ? 'pointer' : undefined }}
                          onClick={hasInKind ? () => toggleRow(d.donationId) : undefined}
                        >
                          <td style={{ whiteSpace: 'nowrap' }}>{formatDate(d.donationDate)}</td>
                          <td><span className="badge bg-primary" style={{ fontSize: '0.75rem' }}>{DONATION_TYPE_LABELS[d.donationType] ?? d.donationType}</span></td>
                          <td style={{ whiteSpace: 'nowrap' }}>{amountDisplay}</td>
                          <td>{d.impactUnit ?? '—'}</td>
                          <td>{d.channelSource ?? '—'}</td>
                          <td>
                            {d.isRecurring
                              ? <span className="badge bg-success" style={{ fontSize: '0.72rem' }}>Yes</span>
                              : <span className="text-muted" style={{ fontSize: '0.85rem' }}>No</span>}
                          </td>
                          <td className="text-center">
                            {hasInKind && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--brand-primary)' }}>
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            )}
                          </td>
                        </tr>
                        {hasInKind && isExpanded && (
                          <tr>
                            <td colSpan={7} style={{ padding: 0, background: '#f8f7f4' }}>
                              <table className="table table-sm mb-0" style={{ fontSize: '0.85rem' }}>
                                <thead>
                                  <tr style={{ background: '#eef0f3' }}>
                                    <th className="ps-4">Item</th>
                                    <th>Category</th>
                                    <th>Qty</th>
                                    <th>Unit</th>
                                    <th>Est. Unit Value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((item) => (
                                    <tr key={item.itemId}>
                                      <td className="ps-4">{item.itemName}</td>
                                      <td>{item.itemCategory}</td>
                                      <td>{item.quantity}</td>
                                      <td>{item.unitOfMeasure ?? '—'}</td>
                                      <td>{item.estimatedUnitValue != null ? formatPHP(item.estimatedUnitValue) : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 5 — Donation Allocations */}
          <div className="card mb-4">
            <div className="card-body pb-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <h5 className="fw-bold mb-0" style={{ color: 'var(--brand-dark)' }}>How Your Donations Are Allocated</h5>
            </div>
            <div className="card-body">
              {allocationEntries.length === 0 ? (
                <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                  Allocation details are not yet available.{' '}
                  <span style={{ fontSize: '0.78rem' }}>
                    Pending backend: <code>/api/donor/me</code> must include <code>allocations[]</code>.
                  </span>
                </p>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-semibold" style={{ fontSize: '0.92rem', color: 'var(--brand-dark)' }}>
                        Program Area Allocation Split
                      </span>
                      <span className="fw-bold" style={{ fontSize: '0.9rem', color: 'var(--brand-dark)' }}>
                        {formatPHP(totalAllocated)}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 22,
                        borderRadius: 10,
                        background: '#e5e7eb',
                        overflow: 'hidden',
                        display: 'flex',
                      }}
                      aria-label="Donation allocation split"
                    >
                      {allocationSegments.map(({ area, pct, color }) => (
                        <div
                          key={area}
                          style={{
                            width: `${pct}%`,
                            background: color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            padding: pct >= 10 ? '0 6px' : 0,
                          }}
                          title={`${area}: ${pct.toFixed(1)}%`}
                        >
                          {pct >= 12 ? area : ''}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    {allocationSegments.map(({ area, total, pct, color }) => (
                      <div key={area} className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: color,
                              display: 'inline-block',
                            }}
                            aria-hidden="true"
                          />
                          <span className="fw-semibold" style={{ fontSize: '0.88rem', color: 'var(--brand-dark)' }}>
                            {area}
                          </span>
                          <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                            ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <span className="fw-bold" style={{ fontSize: '0.86rem', color }}>
                          {formatPHP(total)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 12 }}>
                    <p className="mb-2 fw-semibold" style={{ fontSize: '0.92rem', color: 'var(--brand-dark)' }}>
                      Safehouses Served
                    </p>
                    {safehousesServed.length === 0 ? (
                      <p className="text-muted mb-0" style={{ fontSize: '0.84rem' }}>
                        No safehouse allocations on record yet.
                      </p>
                    ) : (
                      <div className="d-flex flex-wrap gap-2">
                        {safehousesServed.map((id) => (
                          <span
                            key={id}
                            className="badge"
                            style={{
                              background: 'rgba(26,82,118,0.12)',
                              color: '#1a5276',
                              border: '1px solid rgba(26,82,118,0.25)',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              padding: '0.4rem 0.55rem',
                            }}
                          >
                            Safehouse {id}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 6 — Impact Footer */}
      <div style={{ background: 'var(--brand-dark)', padding: '3rem 0' }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8 text-center">
              <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 16 }}>
                Thank You
              </div>
              <h2 className="fw-bold text-white mb-3" style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)' }}>
                Thank you for supporting New Dawn Foundation
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, fontSize: '1rem' }}>
                Because of donors like you, girls across Luzon, Visayas, and Mindanao have access to safe shelter,
                compassionate counseling, and quality education. Your generosity doesn't just change one life —
                it restores hope for entire families and communities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
