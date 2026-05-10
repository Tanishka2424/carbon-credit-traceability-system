import React, { useState } from 'react'
import styles from './MarketplacePage.module.css'

const MOCK_LISTINGS = [
  { id: 'L001', seller: 'GreenSteel Corp',    material: 'steel',    credits: 4200,  price: 18.50, status: 'live' },
  { id: 'L002', seller: 'Alpine Cement Ltd',  material: 'cement',   credits: 1800,  price: 14.20, status: 'live' },
  { id: 'L003', seller: 'Nordic Aluminium',   material: 'aluminum', credits: 950,   price: 22.00, status: 'live' },
  { id: 'L004', seller: 'EcoSteel India',     material: 'steel',    credits: 7500,  price: 17.80, status: 'live' },
  { id: 'L005', seller: 'Pacific Cement Co',  material: 'cement',   credits: 3100,  price: 13.90, status: 'sold' },
  { id: 'L006', seller: 'AluGreen GmbH',      material: 'aluminum', credits: 2200,  price: 21.50, status: 'live' },
]

const PRICE_HISTORY = [18.2, 17.5, 18.8, 19.1, 18.5, 17.9, 18.5, 19.3, 20.1, 19.8, 20.4, 18.5]
const MONTHS = ['May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr']

const fmt   = (n) => new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(n)
const fmtUSD = (n) => `$${n.toFixed(2)}`

const MAT_COLOR = { steel: '#4a9fd4', cement: '#f0a500', aluminum: '#4ac864' }

export default function MarketplacePage() {
  const [selected, setSelected] = useState(null)
  const [showBuy, setShowBuy]   = useState(false)

  const live = MOCK_LISTINGS.filter(l => l.status === 'live')
  const avgPrice = live.length > 0
    ? (live.reduce((a, b) => a + b.price, 0) / live.length).toFixed(2)
    : '0.00'
  const totalCCT = live.reduce((a, b) => a + b.credits, 0)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>CCT Marketplace</h1>
          <p className={styles.sub}>Carbon Credit Token exchange — buy &amp; sell verified emission savings</p>
        </div>
        <div className={styles.conceptBadge}>Conceptual</div>
      </div>

      {/* Market stats */}
      <div className={styles.marketStats}>
        <div className={styles.mStat}>
          <div className={styles.mLabel}>CCT price (avg)</div>
          <div className={styles.mValue}>${avgPrice} <span className={styles.mUnit}>/ token</span></div>
        </div>
        <div className={styles.mStat}>
          <div className={styles.mLabel}>Available CCT</div>
          <div className={styles.mValue}>{fmt(totalCCT)} <span className={styles.mUnit}>tokens</span></div>
        </div>
        <div className={styles.mStat}>
          <div className={styles.mLabel}>Active listings</div>
          <div className={styles.mValue}>{live.length}</div>
        </div>
        <div className={styles.mStat}>
          <div className={styles.mLabel}>1 CCT =</div>
          <div className={styles.mValue}>1t <span className={styles.mUnit}>CO₂ saved</span></div>
        </div>
      </div>

      <div className={styles.body}>
        {/* Listings */}
        <div className={styles.listings}>
          <div className={styles.sectionTitle}>Live listings</div>
          <div className={styles.listGrid}>
            {MOCK_LISTINGS.map(l => (
              <div
                key={l.id}
                className={`${styles.listCard} ${l.status === 'sold' ? styles.sold : ''} ${selected?.id === l.id ? styles.selectedCard : ''}`}
                onClick={() => l.status === 'live' && setSelected(l)}
              >
                <div className={styles.listTop}>
                  <div className={styles.listSeller}>{l.seller}</div>
                  {l.status === 'sold'
                    ? <span className={styles.soldBadge}>SOLD</span>
                    : <span className={styles.liveBadge}>LIVE</span>
                  }
                </div>
                <div className={styles.listMat} style={{ color: MAT_COLOR[l.material] }}>{l.material}</div>
                <div className={styles.listCredits}>{fmt(l.credits)} <span className={styles.listUnit}>CCT</span></div>
                <div className={styles.listPrice}>{fmtUSD(l.price)} <span className={styles.listUnit}>per token</span></div>
                <div className={styles.listTotal}>Total: {fmtUSD(l.credits * l.price)}</div>
                {l.status === 'live' && (
                  <button
                    className={styles.buyBtn}
                    onClick={(e) => { e.stopPropagation(); setSelected(l); setShowBuy(true) }}
                  >
                    Buy tokens
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel: chart + info */}
        <div className={styles.right}>
          <div className={styles.chartCard}>
            <div className={styles.sectionTitle}>CCT price (12 months)</div>
            <div className={styles.chartWrap}>
              <svg width="100%" viewBox="0 0 280 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ac864" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#4ac864" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Area fill */}
                <polygon
                  fill="url(#lineGrad)"
                  points={[
                    ...PRICE_HISTORY.map((v, i) => `${i * (280/11)},${100 - ((v - 15) / 10) * 90}`),
                    `${280},100`, `0,100`
                  ].join(' ')}
                />
                {/* Line */}
                <polyline
                  fill="none"
                  stroke="#4ac864"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  points={PRICE_HISTORY.map((v, i) => `${i * (280/11)},${100 - ((v - 15) / 10) * 90}`).join(' ')}
                />
                {/* Dots */}
                {PRICE_HISTORY.map((v, i) => (
                  <circle key={i} cx={i * (280/11)} cy={100 - ((v - 15) / 10) * 90} r="2" fill="#4ac864" />
                ))}
              </svg>
              <div className={styles.chartLabels}>
                {MONTHS.map(m => <span key={m}>{m}</span>)}
              </div>
            </div>
          </div>

          <div className={styles.howCard}>
            <div className={styles.sectionTitle}>How the marketplace works</div>
            <div className={styles.howSteps}>
              <div className={styles.howStep}>
                <div className={styles.howNum}>1</div>
                <div>
                  <div className={styles.howTitle}>Earn CCT tokens</div>
                  <div className={styles.howSub}>Submit verified reports showing emissions below baseline</div>
                </div>
              </div>
              <div className={styles.howStep}>
                <div className={styles.howNum}>2</div>
                <div>
                  <div className={styles.howTitle}>List on marketplace</div>
                  <div className={styles.howSub}>Set your price per token — market determines demand</div>
                </div>
              </div>
              <div className={styles.howStep}>
                <div className={styles.howNum}>3</div>
                <div>
                  <div className={styles.howTitle}>Buyers offset emissions</div>
                  <div className={styles.howSub}>Over-emitting companies buy CCT to neutralise their excess</div>
                </div>
              </div>
              <div className={styles.howStep}>
                <div className={styles.howNum}>4</div>
                <div>
                  <div className={styles.howTitle}>Settled on Polygon</div>
                  <div className={styles.howSub}>ERC-1155 transfer — immutable, instant, trustless</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buy modal */}
      {showBuy && selected && (
        <div className={styles.modalBack} onClick={() => setShowBuy(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Buy CCT tokens</div>
            <div className={styles.modalSeller}>{selected.seller}</div>
            <div className={styles.modalInfo}>
              <div className={styles.mRow}><span>Available</span><span className="mono">{fmt(selected.credits)} CCT</span></div>
              <div className={styles.mRow}><span>Price / token</span><span className="mono">{fmtUSD(selected.price)}</span></div>
            </div>
            <div className={styles.modalNote}>
              This is a conceptual marketplace. In the live system, this action would trigger an ERC-1155 transfer on Polygon, settled via smart contract.
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowBuy(false)}>Cancel</button>
              <button className={styles.confirmBtn} onClick={() => setShowBuy(false)}>Simulate purchase</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
